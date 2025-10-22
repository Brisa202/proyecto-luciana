from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework.routers import DefaultRouter

# ViewSets / APIs
from empleados.views import EmpleadoViewSet
from accounts.views import PerfilUsuarioAPIView
from dashboard.views import MetricsSummaryView, RecentActivityView 
from productos.views import ProductoViewSet
from incidentes.views import IncidenteViewSet
from alquileres.models import Alquiler, DetAlquiler 

# 👇 IMPORTA la vista CUSTOM que valida email/username y aplica bloqueo
from accounts.auth import EmailOrUsernameTokenObtainPairView

router = DefaultRouter()
router.register(r'gestion-empleados', EmpleadoViewSet, basename='empleado')
router.register(r'productos', ProductoViewSet, basename='producto')
router.register(r'incidentes', IncidenteViewSet, basename='incidente')

urlpatterns = [
    path('admin/', admin.site.urls),

    # Auth (JWT) – usa la vista personalizada
    path('api/token/', EmailOrUsernameTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # Perfil del usuario logueado
    path('api/perfil/', PerfilUsuarioAPIView.as_view(), name='perfil_usuario'),

    path('api/metrics/summary/', MetricsSummaryView.as_view(), name='metrics_summary'),
    path('api/activity/recent/', RecentActivityView.as_view(), name='recent_activity'),

    # Rutas de DRF (empleados)
    path('api/', include(router.urls)),
]
