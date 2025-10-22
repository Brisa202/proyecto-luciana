# accounts/models.py
from django.db import models
from django.contrib.auth.models import User, Group
from django.db.models.signals import post_save
from django.dispatch import receiver

class Perfil(models.Model):
    ROLES_CHOICES = (
        ('administrador', 'Administrador'),
        ('empleado', 'Empleado'),
        ('chofer', 'Chofer'),
        ('operario_carga', 'Operario de Carga y Descarga'),
        ('encargado', 'Encargado'),
        ('limpieza', 'Personal de Limpieza'),
        ('lavanderia', 'Operaria de Lavandería'),
        ('cajero', 'Cajero'),
    )

    usuario = models.OneToOneField(User, on_delete=models.CASCADE, related_name='perfil')
    # Default de rol: 'empleado' (ajústalo si prefieres otro)
    rol = models.CharField(max_length=20, choices=ROLES_CHOICES, default='empleado')

    def __str__(self):
        return f'{self.usuario.username} - {self.get_rol_display()}'

def _sync_groups_for(user: User) -> None:
    """
    Mantiene los grupos básicos alineados con el rol del perfil y con is_superuser.
    - Superusuario o rol 'administrador' => grupo 'Admin' + is_staff=True
    - Otros => grupo 'Empleado'
    """
    if not hasattr(user, 'perfil'):
        return

    admin_g, _ = Group.objects.get_or_create(name='Admin')
    emp_g, _   = Group.objects.get_or_create(name='Empleado')

    # Limpia pertenencia básica (ajusta si usas más grupos)
    user.groups.remove(admin_g, emp_g)

    if user.is_superuser or user.perfil.rol == 'administrador':
        user.groups.add(admin_g)
        if not user.is_staff:
            user.is_staff = True
            user.save(update_fields=['is_staff'])
    else:
        user.groups.add(emp_g)
        # no forzamos is_staff para no-admin

@receiver(post_save, sender=User)
def crear_o_sync_perfil(sender, instance: User, created: bool, **kwargs):
    """
    - Si el User es nuevo: crea Perfil con rol default ('empleado'),
      pero si es superusuario, que nazca como 'administrador'.
    - Siempre sincroniza grupos tras guardar User.
    """
    if created:
        rol_inicial = 'administrador' if instance.is_superuser else 'empleado'
        Perfil.objects.create(usuario=instance, rol=rol_inicial)
    _sync_groups_for(instance)

@receiver(post_save, sender=Perfil)
def sync_groups_post_save(sender, instance: Perfil, **kwargs):
    """
    Si cambia el rol en Perfil, vuelve a sincronizar grupos y staff.
    """
    _sync_groups_for(instance.usuario)
