from django.core.management.base import BaseCommand

from time_tracker.demo import preparar_demo


class Command(BaseCommand):
    help = "Crea la cuenta de demostración (si no existe) y regenera sus datos ficticios."

    def handle(self, *args, **opciones):
        user = preparar_demo()
        self.stdout.write(self.style.SUCCESS(f"Cuenta demo lista: {user.email} ({user.registros.count()} registros)"))
