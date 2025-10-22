# productos/models.py
from django.db import models
from django.core.exceptions import ValidationError

class Producto(models.Model):
    CATEGORIAS = (
        ('vajilla', 'Vajilla'),
        ('cristaleria', 'Cristalería'),
        ('manteleria', 'Mantelería'),
        ('decoracion', 'Decoración'),
        ('salon', 'Salón'),
        ('mobiliario', 'Mobiliario'),
    )

    nombre = models.CharField(max_length=120)
    descripcion = models.TextField(blank=True)
    categoria = models.CharField(max_length=20, choices=CATEGORIAS)
    precio = models.DecimalField(max_digits=10, decimal_places=2)
    stock = models.PositiveIntegerField(default=0)
    imagen_url = models.URLField(blank=True)
    activo = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def clean(self):
        # Evitar borrar si hay incidentes abiertos (se evalúa en delete())
        pass

    def delete(self, *args, **kwargs):
        # Chequeo condicional: si hay incidentes abiertos -> bloquear borrado
        from incidentes.models import Incidente  # import diferido para evitar ciclos
        abiertos = Incidente.objects.filter(
            det_alquiler__producto=self,
            estado_incidente='abierto'
        ).exists()
        if abiertos:
            raise ValidationError(
                "No se puede borrar el producto: existen incidentes abiertos asociados."
            )
        return super().delete(*args, **kwargs)

    def __str__(self):
        return self.nombre
