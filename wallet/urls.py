from django.urls import path
from . import views

urlpatterns = [
    path('top-up/', views.top_up_with_voucher, name='wallet_top_up'),
    path('transfer/<int:group_id>/', views.transfer_to_group, name='wallet_transfer_group'),
    path('balance/', views.get_wallet_balance_snippet, name='wallet_balance'),
]
