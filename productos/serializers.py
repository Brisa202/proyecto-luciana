# productos/serializers.py
from rest_framework import serializers
from .models import Producto

class ProductoSerializer(serializers.ModelSerializer):
    categoria_display = serializers.CharField(source='get_categoria_display', read_only=True)

    class Meta:
        model = Producto
        fields = ('id', 'nombre', 'descripcion', 'categoria', 'categoria_display',
                  'precio', 'stock', 'imagen_url', 'activo')
