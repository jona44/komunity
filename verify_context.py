import os
import django
from django.conf import settings
from unittest.mock import MagicMock

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from chema.context_processors import active_group_context
from chema.models import GroupMembership, Profile, Group
from django.contrib.auth import get_user_model

# Mock request
request = MagicMock()
request.resolver_match = None
request.user = get_user_model().objects.first()

print(f"Testing with user: {request.user}")

# Call context processor
context = active_group_context(request)

if 'deceased_form' in context:
    print("SUCCESS: 'deceased_form' found in context.")
    form = context['deceased_form']
    print(f"Form: {form}")
    print(f"Deceased field queryset count: {form.fields['deceased'].queryset.count()}")
else:
    print("FAILURE: 'deceased_form' NOT found in context.")
