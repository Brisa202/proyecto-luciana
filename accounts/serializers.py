# accounts/serializers.py
from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Perfil

# 1. Serializer para el Perfil
class PerfilSerializer(serializers.ModelSerializer):
    # Usamos source='get_rol_display' para obtener el nombre legible del rol 
    # (ej: "Administrador" en lugar de "administrador")
    rol_display = serializers.CharField(source='get_rol_display', read_only=True)
    
    class Meta:
        model = Perfil
        fields = ('rol', 'rol_display')

# 2. Serializer para el Usuario (Incluye el Perfil anidado)
class UsuarioSerializer(serializers.ModelSerializer):
    # Relación anidada: Incluye los datos del Perfil
    perfil = PerfilSerializer(read_only=True)

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'perfil')
        # Campos que no deben ser enviados en la respuesta de la API
        read_only_fields = ('username', 'email')