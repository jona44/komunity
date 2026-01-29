import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

try:
    from chema.context_processors import active_group_context
    from condolence.forms import DeceasedForm
    print("Imports successful!")
except ImportError as e:
    print(f"ImportError: {e}")
except Exception as e:
    print(f"Error: {e}")
