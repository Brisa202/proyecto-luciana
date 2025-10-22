from django.contrib.auth import get_user_model
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

User = get_user_model()

class PerfilUsuarioAPIView(APIView):
    """
    Devuelve perfil básico + grupos (p.ej. ["Admin"] o ["Empleado"])
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        u = request.user
        grupos = list(u.groups.values_list('name', flat=True))
        return Response({
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "is_staff": u.is_staff,
            "is_superuser": u.is_superuser,
            "groups": grupos,
        })
