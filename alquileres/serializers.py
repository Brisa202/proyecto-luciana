# alquileres/serializers.py
from rest_framework import serializers
from django.db.models import Count
from .models import Alquiler, DetAlquiler

class DetAlquilerSerializer(serializers.ModelSerializer):
    producto_nombre = serializers.CharField(source='producto.nombre', read_only=True)

    class Meta:
        model = DetAlquiler
        fields = ('id', 'alquiler', 'producto', 'producto_nombre', 'cantidad', 'precio_unit')

class AlquilerSerializer(serializers.ModelSerializer):
    items_count = serializers.IntegerField(read_only=True)
    items       = DetAlquilerSerializer(many=True, read_only=True)  # lista de ítems para “ver detalles”

    class Meta:
        model = Alquiler
        fields = ('id', 'cliente', 'creado_en', 'items_count', 'items')
