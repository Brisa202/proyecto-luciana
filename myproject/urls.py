# myproject/urls.py
from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

# Vistas / APIs existentes
from accounts.auth import EmailOrUsernameTokenObtainPairView  # login personalizado
from accounts.views import PerfilUsuarioAPIView
from empleados.views import EmpleadoViewSet
from productos.views import ProductoViewSet
from incidentes.views import IncidenteViewSet
from dashboard.views import MetricsSummaryView, RecentActivityView

# 👇 IMPORTAR LOS VIEWS DE ALQUILERES (NO los modelos)
from alquileres.views import AlquilerViewSet, DetAlquilerViewSet
from clientes.views import ClienteViewSet

router = DefaultRouter()
router.register(r'gestion-empleados', EmpleadoViewSet, basename='empleado')
router.register(r'productos', ProductoViewSet, basename='producto')
router.register(r'incidentes', IncidenteViewSet, basename='incidente')

# 👇 REGISTRAR TAMBIÉN ESTAS DOS RUTAS
router.register(r'alquileres', AlquilerViewSet, basename='alquiler')
router.register(r'det-alquileres', DetAlquilerViewSet, basename='detalquiler')

router.register(r'clientes', ClienteViewSet, basename='cliente')

urlpatterns = [
    path('admin/', admin.site.urls),

    # Auth (JWT)
    path('api/token/', EmailOrUsernameTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # Perfil del usuario logueado
    path('api/perfil/', PerfilUsuarioAPIView.as_view(), name='perfil_usuario'),

    # Dashboard (si ya lo usas)
    path('api/metrics/summary/', MetricsSummaryView.as_view(), name='metrics_summary'),
    path('api/activity/recent/', RecentActivityView.as_view(), name='recent_activity'),

    # Todas las colecciones DRF
    path('api/', include(router.urls)),
]

