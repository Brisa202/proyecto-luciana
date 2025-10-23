# alquileres/models.py
from django.db import models
from productos.models import Producto  # ajusta import
# ...

class Alquiler(models.Model):
    cliente   = models.CharField(max_length=200, blank=True)
    creado_en = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'Alquiler #{self.pk}'

class DetAlquiler(models.Model):
    alquiler    = models.ForeignKey(Alquiler, on_delete=models.CASCADE, related_name='items')  # <- importante
    producto    = models.ForeignKey(Producto, on_delete=models.PROTECT)
    cantidad    = models.PositiveIntegerField()
    precio_unit = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f'#{self.pk} · {self.producto} x{self.cantidad}'
