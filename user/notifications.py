try:
    from exponent_server_sdk import PushClient, PushMessage
except ImportError:
    PushClient = None
    PushMessage = None
    print("Warning: exponent_server_sdk not found or failed to import. Push notifications will be disabled.")
from django.conf import settings
from .models import DeviceToken, Notification

def send_push_notification(user, title, message, data=None, notification_type=None):
    """
    Send push notification to a user's devices and store it in DB.
    """
    if data is None:
        data = {}

    # Store notification in DB
    Notification.objects.create(
        recipient=user,
        title=title,
        message=message,
        data=data,
        notification_type=notification_type
    )

    # Get active tokens
    tokens = DeviceToken.objects.filter(user=user, is_active=True).values_list('token', flat=True)
    
    if not tokens:
        return

    if not PushClient:
        print("PushClient not available. Skipping notification.")
        return

    try:
        response = PushClient().publish_multiple([
            PushMessage(to=token,
                        title=title,
                        body=message,
                        data=data)
            for token in tokens
        ])
    except Exception as exc:
        # Check if "exc" has message
        print(f"Error sending push notification: {exc}")
        
        # Here we could handle invalid tokens (DeviceNotRegistered)
        # But for now basic try/except is okay.
