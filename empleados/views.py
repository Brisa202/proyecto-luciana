from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .permissions import EsUsuarioAdministrador
from .serializers import (
    EmpleadoCreacionSerializer, EmpleadoSerializer, EmpleadoUpdateSerializer
)
from .models import Empleado

class EmpleadoViewSet(viewsets.ModelViewSet):
    queryset = Empleado.objects.select_related('usuario__perfil').all()
    http_method_names = ['get', 'post', 'patch', 'put', 'delete']  # 👈 CRUD completo admin

    def get_serializer_class(self):
        if self.action in ['list', 'retrieve']:
            return EmpleadoSerializer             # lectura
        if self.action in ['update', 'partial_update']:
            return EmpleadoUpdateSerializer       # editar
        return EmpleadoCreacionSerializer         # crear

    def get_permissions(self):
        # Toda la gestión es solo para admin
        return [IsAuthenticated(), EsUsuarioAdministrador()]
