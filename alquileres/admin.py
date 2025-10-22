# alquileres/admin.py
from django.contrib import admin
from .models import Alquiler, DetAlquiler

admin.site.register(Alquiler)
admin.site.register(DetAlquiler)
