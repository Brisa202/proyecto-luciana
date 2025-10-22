# incidentes/admin.py
from django.contrib import admin
from .models import Incidente

@admin.register(Incidente)
class IncidenteAdmin(admin.ModelAdmin):
    list_display = ('id', 'det_alquiler', 'estado_incidente', 'fecha_incidente')
    list_filter = ('estado_incidente',)
    search_fields = ('descripcion', 'det_alquiler__producto__nombre')
