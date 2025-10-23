# incidentes/serializers.py
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from .models import Incidente
from alquileres.models import DetAlquiler  # ajustá si tu app se llama distinto

class IncidenteSerializer(serializers.ModelSerializer):
    # Info de producto/detalle para la UI
    producto_id     = serializers.IntegerField(source='det_alquiler.producto.id', read_only=True)
    producto_nombre = serializers.CharField(source='det_alquiler.producto.nombre', read_only=True)

    class Meta:
        model = Incidente
        fields = (
            'id',
            'det_alquiler', 'producto_id', 'producto_nombre',
            'fecha_incidente', 'descripcion',
            'estado_incidente',          # 'abierto' | 'resuelto'
            'tipo_incidente',            # 'reparable' | 'irreparable'
            'cantidad_afectada',         # int > 0
            'fecha_resolucion',
            'resultado_final',           # 'sin_accion' | 'repuesto' | 'reintegrado'
            'cantidad_repuesta',         # int >= 0
        )
        read_only_fields = ('id', 'fecha_incidente', 'fecha_resolucion')

    # ---------- utilidades internas ----------
    def _sum_incidentes_abiertos_otros(self, det, exclude_pk=None):
        qs = Incidente.objects.filter(det_alquiler=det).exclude(estado_incidente='resuelto')
        if exclude_pk:
            qs = qs.exclude(pk=exclude_pk)
        return sum(int(x.cantidad_afectada or 0) for x in qs)

    def _max_disponible_para_incidente(self, det, exclude_pk=None):
        """
        disponible = cantidad del detalle - sum(cantidad_afectada de incidentes abiertos distintos a este)
        """
        cant_alq = int(det.cantidad or 0)
        usados_otros = self._sum_incidentes_abiertos_otros(det, exclude_pk=exclude_pk)
        return max(0, cant_alq - usados_otros)

    # ---------- validación global (create/update) ----------
    def validate(self, attrs):
        instance = self.instance  # None si es create
        det = attrs.get('det_alquiler', getattr(instance, 'det_alquiler', None))
        if not isinstance(det, DetAlquiler):
            raise serializers.ValidationError({'det_alquiler': 'Detalle de alquiler inválido.'})

        # valores "propuestos" (nuevos) con fallback a los del instance
        tipo    = attrs.get('tipo_incidente',   getattr(instance, 'tipo_incidente',   'reparable'))
        estado  = attrs.get('estado_incidente', getattr(instance, 'estado_incidente', 'abierto'))
        res     = attrs.get('resultado_final',  getattr(instance, 'resultado_final',  'sin_accion'))

        # cantidades propuestas
        cant_afect = attrs.get('cantidad_afectada', getattr(instance, 'cantidad_afectada', None))
        cant_rep   = attrs.get('cantidad_repuesta', getattr(instance, 'cantidad_repuesta', 0))

        # reglas básicas
        if cant_afect is None or int(cant_afect) <= 0:
            raise serializers.ValidationError({'cantidad_afectada': 'Debe ser un entero mayor a 0.'})
        cant_afect = int(cant_afect)
        cant_rep   = int(cant_rep or 0)
        if cant_rep < 0:
            raise serializers.ValidationError({'cantidad_repuesta': 'No puede ser negativa.'})
        if cant_rep > cant_afect:
            raise serializers.ValidationError({'cantidad_repuesta': 'No puede superar la cantidad afectada.'})

        # capacidad disponible (considerando otros incidentes abiertos del mismo detalle)
        exclude_pk = instance.pk if instance else None
        max_disp = self._max_disponible_para_incidente(det, exclude_pk=exclude_pk)

        # Si estás editando, y bajás/subís cantidad_afectada, igualmente no podés superar "max_disp"
        # (max_disp ya excluye a este incidente, por eso no sumamos lo previo).
        if cant_afect > max_disp:
            raise serializers.ValidationError({
                'cantidad_afectada': f'No puede superar {max_disp}. (Alquilado: {det.cantidad}, '
                                     f'incidentes abiertos de otros: {int(det.cantidad) - max_disp})'
            })

        # reglas al cerrar
        if estado == 'resuelto':
            # irreparable no puede marcarselo como reintegrado
            if tipo == 'irreparable' and res == 'reintegrado':
                raise serializers.ValidationError("Un incidente irreparable no puede marcarse como 'reintegrado'.")
            # si dices 'repuesto', debe haber reposición > 0 y <= afectada
            if res == 'repuesto':
                if cant_rep <= 0:
                    raise serializers.ValidationError(
                        {'cantidad_repuesta': "Indique 'cantidad_repuesta' (> 0) para marcar como 'repuesto'."}
                    )
                if cant_rep > cant_afect:
                    raise serializers.ValidationError(
                        {'cantidad_repuesta': 'No puede reponerse más de lo afectado.'}
                    )
        return attrs

    # ---------- create/update ----------
    @transaction.atomic
    def create(self, validated_data):
        # defaults de creación
        validated_data.setdefault('estado_incidente', 'abierto')
        validated_data.setdefault('cantidad_repuesta', 0)
        # fecha_incidente suele setearse en el modelo (auto_now_add). Si no, podés:
        # validated_data.setdefault('fecha_incidente', timezone.now())

        # Guardar
        incidente = super().create(validated_data)
        return incidente

    @transaction.atomic
    def update(self, instance: Incidente, validated_data):
        prev_estado = instance.estado_incidente
        new_estado  = validated_data.get('estado_incidente', instance.estado_incidente)
        resultado   = validated_data.get('resultado_final', instance.resultado_final)

        # aplicar campos simples
        for k, v in validated_data.items():
            setattr(instance, k, v)

        # transición a resuelto → efectos de stock (usa tus helpers del modelo)
        if prev_estado != 'resuelto' and new_estado == 'resuelto':
            if resultado == 'reintegrado':
                instance._devolver_reintegrado()
            elif resultado == 'repuesto':
                instance._devolver_repuesto()
            instance.fecha_resolucion = timezone.now()

        instance.save()
        return instance
