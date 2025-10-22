from django.shortcuts import render

# Create your views here.
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

class MetricsSummaryView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        # TODO: reemplace con consultas reales
        return Response({
            "ingresos_mes": "$12,450.00",
            "alquileres_activos": 15,
            "pedidos_pendientes": 8,
            "incidentes_abiertos": 2,
        })

class RecentActivityView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        # TODO: reemplace con datos reales
        items = [
            {"tone":"ok",   "title":"Nuevo pedido", "ref":"#PO1245", "time":"Hace 5 minutos", "amount":"$1,250.00"},
            {"tone":"warn", "title":"Incidente reportado", "ref":"#A0897", "time":"Hace 30 minutos", "badge":"Alta prioridad"},
        ]
        return Response({"items": items})
