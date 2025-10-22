# empleados/serializers.py  (solo los cambios marcados)
from django.db import transaction
from rest_framework import serializers
from django.contrib.auth.models import User, Group
from .models import Empleado
from accounts.models import Perfil

class UsuarioLiteSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name')

class EmpleadoSerializer(serializers.ModelSerializer):
    usuario = UsuarioLiteSerializer(read_only=True)
    user_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), source='usuario', write_only=True, required=False
    )
    rol = serializers.SerializerMethodField()
    rol_display = serializers.SerializerMethodField()          # 👈 agregado

    class Meta:
        model = Empleado
        fields = (
            'id_empleados',
            'usuario', 'user_id',
            'nombre', 'apellido', 'dni', 'telefono',
            'fecha_ingreso', 'fecha_egreso',
            'direccion', 'activo',
            'rol', 'rol_display',                               # 👈 agregado
        )
        read_only_fields = ('id_empleados', 'rol', 'rol_display')

    def get_rol(self, obj):
        perfil = getattr(obj.usuario, 'perfil', None)
        return getattr(perfil, 'rol', None)

    def get_rol_display(self, obj):                            # 👈 agregado
        perfil = getattr(obj.usuario, 'perfil', None)
        return getattr(perfil, 'get_rol_display', lambda: '')()

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
    # Credenciales del usuario
    datos_usuario = UsuarioCreacionSerializer()

    # Atributos del empleado
    nombre        = serializers.CharField(max_length=100)
    apellido      = serializers.CharField(max_length=100)
    dni           = serializers.CharField(max_length=20, required=False, allow_blank=True)       # 👈 opcional
    telefono      = serializers.CharField(max_length=20, required=False, allow_blank=True)       # 👈 opcional
    fecha_ingreso = serializers.DateField(format="%Y-%m-%d", input_formats=["%Y-%m-%d"])
    fecha_egreso  = serializers.DateField(format="%Y-%m-%d", input_formats=["%Y-%m-%d"], required=False, allow_null=True)
    direccion     = serializers.CharField(max_length=255, required=False, allow_blank=True)      # 👈 opcional

    # rol en Perfil
    rol_asignado  = serializers.ChoiceField(choices=Perfil.ROLES_CHOICES)

    def to_representation(self, instance: Empleado):
        return EmpleadoSerializer(instance).data

    @transaction.atomic
    def create(self, validated_data):
        datos_usuario = validated_data.pop('datos_usuario')
        rol_asignado  = validated_data.pop('rol_asignado')

        usuario = User.objects.create_user(
            username=datos_usuario['username'],
            email=datos_usuario.get('email', ''),
            password=datos_usuario['password']
        )

        # Perfil y grupos (las señales crean Perfil; aquí seteo el rol)
        perfil: Perfil = usuario.perfil
        perfil.rol = rol_asignado
        perfil.save()

        try:
            if str(rol_asignado).lower() == 'administrador':
                admin_group, _ = Group.objects.get_or_create(name='Admin')
                usuario.groups.add(admin_group)
                usuario.is_staff = True
                usuario.save(update_fields=['is_staff'])
            else:
                empleado_group, _ = Group.objects.get_or_create(name='Empleado')
                usuario.groups.add(empleado_group)
        except Exception:
            pass

        empleado = Empleado.objects.create(usuario=usuario, **validated_data)
        return empleado

class EmpleadoUpdateSerializer(serializers.ModelSerializer):
    """
    Edita campos del empleado; opcionalmente permite cambiar el rol del Usuario relacionado.
    """
    rol_cambio = serializers.ChoiceField(choices=Perfil.ROLES_CHOICES, required=False, allow_null=True)

    class Meta:
        model = Empleado
        fields = (
            'nombre', 'apellido', 'dni', 'telefono',
            'fecha_ingreso', 'fecha_egreso', 'direccion', 'activo',
            'rol_cambio',
        )

    def update(self, instance, validated_data):
        # rol del perfil (si se envía)
        rol_cambio = validated_data.pop('rol_cambio', None)
        if rol_cambio is not None:
            perfil = getattr(instance.usuario, 'perfil', None)
            if perfil:
                perfil.rol = rol_cambio
                perfil.save()

        # resto de campos de Empleado
        for k, v in validated_data.items():
            setattr(instance, k, v)
        instance.save()
        return instance