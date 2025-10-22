from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Incidente
from .serializers import IncidenteSerializer
from .permissions import IncidentePermiso

class IncidenteViewSet(viewsets.ModelViewSet):
    queryset = Incidente.objects.select_related(
        'det_alquiler', 'det_alquiler__producto'
    ).all()
    serializer_class = IncidenteSerializer
    permission_classes = [IsAuthenticated, IncidentePermiso]
