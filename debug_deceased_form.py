import os
import django
from django.conf import settings

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from condolence.forms import DeceasedForm
from chema.models import Group

# Get active group
active_group = Group.objects.filter(is_active=True).first()
print(f"Active Group: {active_group}")

if active_group:
    print(f"Members count: {active_group.members.count()}")
    form = DeceasedForm(active_group=active_group)
    print(f"Form Field 'deceased' queryset count: {form.fields['deceased'].queryset.count()}")
    print(f"Form Field 'deceased' widget: {form.fields['deceased'].widget}")
    print("Rendered field:")
    print(form['deceased'].as_widget())
else:
    print("No active group found.")
