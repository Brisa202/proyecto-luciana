# productos/views.py
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Producto
from .serializers import ProductoSerializer
from .permissions import SoloAdminEdita

class ProductoViewSet(viewsets.ModelViewSet):
    queryset = Producto.objects.all().order_by('nombre')
    serializer_class = ProductoSerializer
    permission_classes = [IsAuthenticated, SoloAdminEdita]
