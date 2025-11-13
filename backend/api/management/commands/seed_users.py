from django.core.management.base import BaseCommand
from django.contrib.auth.hashers import make_password

# Importa el modelo Usuario tal como está en tu app 'api'
from api.models import Usuario


class Command(BaseCommand):
    help = "Crear o actualizar usuarios base: administrador y vendedor"

    def handle(self, *args, **options):
        users = [
            {"username": "masacotta", "password": "admin", "rol": "ADMIN"},
            {"username": "vendedor", "password": "caja1", "rol": "VENDEDOR"},
        ]

        for u in users:
            obj, created = Usuario.objects.update_or_create(
                username=u["username"],
                defaults={
                    "password_hash": make_password(u["password"]),
                    "rol": u["rol"],
                },
            )
            action = "Creado" if created else "Actualizado"
            self.stdout.write(f"{action}: {u['username']} (id={obj.pk})")

        self.stdout.write(self.style.SUCCESS("Usuarios base sembrados correctamente."))