from django.db import transaction
from rest_framework import serializers
from django.contrib.auth.models import User, Group

from .models import Empleado
from accounts.models import Perfil


# ========== Users (lite) ==========
class UsuarioLiteSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name')


# ========== Empleado (list/retrieve) ==========
class EmpleadoSerializer(serializers.ModelSerializer):
    """
    Serializer para listar y obtener detalle de empleados.
    Expone 'id' (pk) para que el frontend pueda editar/borrar por ID.
    """
    id = serializers.IntegerField(source='pk', read_only=True)  # <- clave para frontend
    usuario = UsuarioLiteSerializer(read_only=True)
    user_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), source='usuario', write_only=True, required=False
    )
    rol = serializers.SerializerMethodField()
    rol_display = serializers.SerializerMethodField()

    class Meta:
        model = Empleado
        fields = (
            'id',                    # pk estándar para rutas /empleados/:id
            'id_empleados',          # opcional (compatibilidad con tu modelo)
            'usuario', 'user_id',
            'nombre', 'apellido', 'dni', 'telefono',
            'fecha_ingreso', 'fecha_egreso',
            'direccion', 'activo',
            'rol', 'rol_display',
        )
        read_only_fields = ('id', 'id_empleados', 'rol', 'rol_display')

    def get_rol(self, obj):
        perfil = getattr(obj.usuario, 'perfil', None)
        return getattr(perfil, 'rol', None)

    def get_rol_display(self, obj):
        perfil = getattr(obj.usuario, 'perfil', None)
        return perfil.get_rol_display() if perfil else None


# ========== Creación (User + Perfil + Empleado) ==========
class UsuarioCreacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('username', 'email', 'password')
        extra_kwargs = {'password': {'write_only': True}}

    def validate_username(self, v):
        if User.objects.filter(username=v).exists():
            raise serializers.ValidationError("El username ya está en uso.")
        return v

    def validate_email(self, v):
        if v and User.objects.filter(email=v).exists():
            raise serializers.ValidationError("El email ya está en uso.")
        return v


class EmpleadoCreacionSerializer(serializers.Serializer):
    """
    Crea:
    - User (credenciales)
    - Perfil (rol)
    - Empleado (datos)
    """
    # Credenciales del usuario
    datos_usuario = UsuarioCreacionSerializer()

    # Atributos del empleado
    nombre        = serializers.CharField(max_length=100)
    apellido      = serializers.CharField(max_length=100)
    dni           = serializers.CharField(max_length=20, required=False, allow_blank=True)
    telefono      = serializers.CharField(max_length=20, required=False, allow_blank=True)
    fecha_ingreso = serializers.DateField(format="%Y-%m-%d", input_formats=["%Y-%m-%d"])
    fecha_egreso  = serializers.DateField(format="%Y-%m-%d", input_formats=["%Y-%m-%d"], required=False, allow_null=True)
    direccion     = serializers.CharField(max_length=255, required=False, allow_blank=True)

    # rol en Perfil
    rol_asignado  = serializers.ChoiceField(choices=Perfil.ROLES_CHOICES)

    def to_representation(self, instance: Empleado):
        # Devolvemos el formato unificado del detalle/lista
        return EmpleadoSerializer(instance).data

    @transaction.atomic
    def create(self, validated_data):
        datos_usuario = validated_data.pop('datos_usuario')
        rol_asignado  = validated_data.pop('rol_asignado')

        # 1) User
        usuario = User.objects.create_user(
            username=datos_usuario['username'],
            email=datos_usuario.get('email', ''),
            password=datos_usuario['password']
        )

        # 2) Perfil + grupos
        perfil: Perfil = usuario.perfil  # creado por signal
        perfil.rol = rol_asignado
        perfil.save()

        try:
            if str(rol_asignado).lower() == 'administrador':
                admin_group, _ = Group.objects.get_or_create(name='Admin')
                usuario.groups.add(admin_group)
                if not usuario.is_staff:
                    usuario.is_staff = True
                    usuario.save(update_fields=['is_staff'])
            else:
                empleado_group, _ = Group.objects.get_or_create(name='Empleado')
                usuario.groups.add(empleado_group)
        except Exception:
            # no cortamos la transacción si falla el grupo
            pass

        # 3) Empleado
        empleado = Empleado.objects.create(usuario=usuario, **validated_data)
        return empleado


# ========== Update (Empleado + cambio de rol Perfil) ==========
class EmpleadoUpdateSerializer(serializers.ModelSerializer):
    """
    Edita campos del Empleado y permite cambiar opcionalmente el rol del Perfil
    del usuario relacionado. También sincroniza grupos y is_staff.
    """
    rol_cambio = serializers.ChoiceField(choices=Perfil.ROLES_CHOICES, required=False, allow_null=True)

    class Meta:
        model = Empleado
        fields = (
            'nombre', 'apellido', 'dni', 'telefono',
            'fecha_ingreso', 'fecha_egreso', 'direccion', 'activo',
            'rol_cambio',
        )

    def to_representation(self, instance):
        # Unificamos la respuesta con el formato estándar
        return EmpleadoSerializer(instance).data

    @transaction.atomic
    def update(self, instance, validated_data):
        rol_cambio = validated_data.pop('rol_cambio', None)

        # Actualiza rol del Perfil si se envía
        if rol_cambio is not None:
            perfil = getattr(instance.usuario, 'perfil', None)
            if perfil:
                perfil.rol = rol_cambio
                perfil.save()

                # Sincronizar grupos/is_staff básicos
                try:
                    admin_g, _ = Group.objects.get_or_create(name='Admin')
                    emp_g, _   = Group.objects.get_or_create(name='Empleado')
                    u = instance.usuario
                    u.groups.remove(admin_g, emp_g)
                    if rol_cambio == 'administrador' or u.is_superuser:
                        u.groups.add(admin_g)
                        if not u.is_staff:
                            u.is_staff = True
                            u.save(update_fields=['is_staff'])
                    else:
                        u.groups.add(emp_g)
                        # no bajamos is_staff acá por si tiene otros permisos
                except Exception:
                    pass

        # Campos del Empleado
        for k, v in validated_data.items():
            setattr(instance, k, v)
        instance.save()
        return instance
