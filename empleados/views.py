from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from .models import Empleado
from .permissions import EsUsuarioAdministrador
from .serializers import (
    EmpleadoSerializer,
    EmpleadoCreacionSerializer,
    EmpleadoUpdateSerializer,
)


class EmpleadoViewSet(viewsets.ModelViewSet):
    """
    CRUD de empleados.
    - Lista/Detalle devuelven EmpleadoSerializer (incluye 'id' para el frontend)
    - POST usa EmpleadoCreacionSerializer (crea User + Perfil + Empleado)
    - PATCH/PUT usa EmpleadoUpdateSerializer (edita Empleado y puede cambiar rol del Perfil)
    - DELETE elimina el Empleado (y por cascada NO borra el User; si querés, se puede personalizar)
    """
    queryset = Empleado.objects.select_related('usuario', 'usuario__perfil').all()
    http_method_names = ['get', 'post', 'patch', 'put', 'delete']

    def get_permissions(self):
        # Política: SOLO admin puede acceder a este módulo completo
        # (si querés permitir GET a empleados, acá se puede flexibilizar)
        permission_classes = [IsAuthenticated, EsUsuarioAdministrador]
        return [p() for p in permission_classes]

    def get_serializer_class(self):
        if self.action == 'create':
            return EmpleadoCreacionSerializer
        elif self.action in ('update', 'partial_update'):
            return EmpleadoUpdateSerializer
        return EmpleadoSerializer
