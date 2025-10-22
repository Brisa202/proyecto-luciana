# incidentes/serializers.py
from rest_framework import serializers
from django.db import transaction
from django.utils import timezone
from .models import Incidente

class IncidenteSerializer(serializers.ModelSerializer):
    # Info de producto/detalle para la UI
    producto_id     = serializers.IntegerField(source='det_alquiler.producto.id', read_only=True)
    producto_nombre = serializers.CharField(source='det_alquiler.producto.nombre', read_only=True)

    class Meta:
        model = Incidente
        fields = (
            'id', 'det_alquiler', 'producto_id', 'producto_nombre',
            'fecha_incidente', 'descripcion',
            'estado_incidente', 'tipo_incidente', 'cantidad_afectada',
            'fecha_resolucion', 'resultado_final', 'cantidad_repuesta',
        )
        read_only_fields = ('id', 'fecha_incidente', 'fecha_resolucion')

    def validate(self, attrs):
        instance = self.instance
        tipo   = attrs.get('tipo_incidente',   getattr(instance, 'tipo_incidente',   'reparable'))
        estado = attrs.get('estado_incidente', getattr(instance, 'estado_incidente', 'abierto'))
        res    = attrs.get('resultado_final',  getattr(instance, 'resultado_final',  'sin_accion'))
        cant_afect = attrs.get('cantidad_afectada', getattr(instance, 'cantidad_afectada', 1))
        cant_rep   = attrs.get('cantidad_repuesta', getattr(instance, 'cantidad_repuesta', 0))

        if estado == 'resuelto':
            # reglas de cierre
            if res == 'reintegrado' and tipo == 'irreparable':
                raise serializers.ValidationError("Un incidente irreparable no puede marcarse como 'reintegrado'.")
            if res == 'repuesto' and cant_rep <= 0:
                raise serializers.ValidationError("Indique 'cantidad_repuesta' para marcar como 'repuesto'.")
            if res == 'reintegrado' and cant_afect <= 0:
                raise serializers.ValidationError("Cantidad afectada inválida para reintegrar.")
        return attrs

    @transaction.atomic
    def update(self, instance: Incidente, validated_data):
        prev_estado = instance.estado_incidente
        new_estado  = validated_data.get('estado_incidente', instance.estado_incidente)
        resultado   = validated_data.get('resultado_final', instance.resultado_final)

        # aplicar campos
        for k, v in validated_data.items():
            setattr(instance, k, v)

        # transición a resuelto → efectos de stock
        if prev_estado != 'resuelto' and new_estado == 'resuelto':
            if resultado == 'reintegrado':
                instance._devolver_reintegrado()
            elif resultado == 'repuesto':
                instance._devolver_repuesto()
            instance.fecha_resolucion = timezone.now()

        instance.save()
        return instance
