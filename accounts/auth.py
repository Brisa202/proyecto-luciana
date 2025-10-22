from django.contrib.auth import authenticate, get_user_model
from django.core.cache import cache
from django.utils import timezone
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework import exceptions
from datetime import timedelta

User = get_user_model()

MAX_ATTEMPTS = 3           # intentos permitidos
LOCK_MINUTES = 15          # tiempo de bloqueo
CACHE_PREFIX = "auth"

def _keys(identifier: str):
    # keys por identificador (email/username/IP combinado)
    return (
        f"{CACHE_PREFIX}:attempts:{identifier}",
        f"{CACHE_PREFIX}:blocked_until:{identifier}",
    )

def _now():
    return timezone.now()

class EmailOrUsernameTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Valida credenciales por username o email.
    Aplica política de rate-limit con bloqueo temporal.
    """

    def validate(self, attrs):
        # Identificador que usa el usuario (puede ser email o username)
        login_field = attrs.get(self.username_field)  # por defecto "username"
        password = attrs.get("password")

        if not login_field or not password:
            raise exceptions.ValidationError("Faltan credenciales.")

        # Normalizamos: si parece email, buscamos el username asociado
        identifier = login_field.strip().lower()

        # Identificador de rate-limit: combina user/email + IP
        request = self.context.get("request")
        ip = getattr(request, "META", {}).get("REMOTE_ADDR", "0.0.0.0")
        rate_id = f"{identifier}|{ip}"

        attempts_key, blocked_key = _keys(rate_id)
        blocked_until = cache.get(blocked_key)
        if blocked_until and _now() < blocked_until:
            mins = int((blocked_until - _now()).total_seconds() // 60) + 1
            raise exceptions.PermissionDenied(
                detail={"detail": "Usuario bloqueado por intentos fallidos.", "locked_for_minutes": mins}
            )

        # Si es email, obtener username real
        username = identifier
        if "@" in identifier:
            try:
                user = User.objects.get(email__iexact=identifier)
                username = user.username
            except User.DoesNotExist:
                # para evitar enumeración de usuarios, tratamos como credencial inválida
                pass

        user = authenticate(self.context.get("request"), username=username, password=password)
        if not user:
            # fallo → incrementar intentos
            attempts = cache.get(attempts_key, 0) + 1
            cache.set(attempts_key, attempts, timeout=LOCK_MINUTES * 60)  # TTL rueda
            remaining = max(0, MAX_ATTEMPTS - attempts)
            if attempts >= MAX_ATTEMPTS:
                cache.set(blocked_key, _now() + timedelta(minutes=LOCK_MINUTES), timeout=LOCK_MINUTES * 60)
                raise exceptions.PermissionDenied(
                    detail={"detail": "Demasiados intentos. Bloqueado temporalmente.", "locked_for_minutes": LOCK_MINUTES}
                )
            raise exceptions.AuthenticationFailed(
                detail={"detail": "Credenciales inválidas.", "remaining_attempts": remaining}
            )

            # (no continúa)

        # Éxito → resetear contadores
        cache.delete_many([attempts_key, blocked_key])

        # Permitir solo usuarios creados en Django (esto ya lo es) y opcionalmente solo activos
        if not user.is_active:
            raise exceptions.PermissionDenied("Usuario inactivo.")

        # Generar tokens estándar
        data = super().validate({"username": user.username, "password": password})

        # Extra: incluir grupos/rol en la respuesta si querés
        data["user"] = {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "is_superuser": user.is_superuser,
            "groups": list(user.groups.values_list("name", flat=True)),
        }
        return data


class EmailOrUsernameTokenObtainPairView(TokenObtainPairView):
    serializer_class = EmailOrUsernameTokenObtainPairSerializer

    # Para que el serializer reciba request y pueda leer IP
    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx
