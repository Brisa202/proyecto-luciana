# alquileres/views.py
from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Count
from .models import Alquiler, DetAlquiler
from .serializers import AlquilerSerializer, DetAlquilerSerializer

class AlquilerViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = AlquilerSerializer

    def get_queryset(self):
        # Si NO tienes related_name='items', usa Count('detalquiler') como plan B.
        return (Alquiler.objects
                .annotate(items_count=Count('items'))
                .prefetch_related('items__producto')
                .order_by('-creado_en'))

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        # PROHIBIR borrar si hay incidentes abiertos en cualquiera de sus detalles
        from incidentes.models import Incidente
        hay_abiertos = Incidente.objects.filter(
            det_alquiler__alquiler=instance,
            estado_incidente='abierto'
        ).exists()
        if hay_abiertos:
            return Response(
                {"detail": "No puede borrarse: existen incidentes abiertos."},
                status=status.HTTP_409_CONFLICT
            )
        return super().destroy(request, *args, **kwargs)

class DetAlquilerViewSet(viewsets.ModelViewSet):
    queryset = DetAlquiler.objects.select_related('alquiler', 'producto')
    serializer_class = DetAlquilerSerializer
    permission_classes = [IsAuthenticated]
