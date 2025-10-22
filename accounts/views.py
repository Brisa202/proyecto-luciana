# accounts/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

class PerfilUsuarioAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        u = request.user
        groups = list(u.groups.values_list('name', flat=True))
        perfil = getattr(u, 'perfil', None)
        rol = getattr(perfil, 'rol', 'empleado')
        rol_display = getattr(perfil, 'get_rol_display', lambda: 'Empleado')()

        es_admin = bool(u.is_superuser or rol == 'administrador' or ('Admin' in groups))

        return Response({
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "is_superuser": u.is_superuser,
            "groups": groups,
            "perfil": {"rol": rol, "rol_display": rol_display},
            "rol_efectivo": "administrador" if es_admin else rol,
        })
