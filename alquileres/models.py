# alquileres/models.py
from django.db import models
from productos.models import Producto

class Alquiler(models.Model):
    creado_en = models.DateTimeField(auto_now_add=True)
    cliente = models.CharField(max_length=120, blank=True)  # opcional
    # ...otros campos de cabecera si los necesitás

    def __str__(self):
        return f"Alquiler #{self.pk}"

class DetAlquiler(models.Model):
    alquiler = models.ForeignKey(Alquiler, on_delete=models.CASCADE, related_name='items')
    producto = models.ForeignKey(Producto, on_delete=models.PROTECT, related_name='detalles_alquiler')
    cantidad = models.PositiveIntegerField(default=1)
    precio_unit = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.producto} x{self.cantidad}"
