from django.contrib import admin
from .models import Wallet, Transaction

@admin.register(Wallet)
class WalletAdmin(admin.ModelAdmin):
    list_display = ('user', 'external_wallet_id', 'balance', 'created_at')
    search_fields = ('user__email', 'external_wallet_id')
    readonly_fields = ('created_at', 'balance')
    
    def balance(self, obj):
        return f"R {obj.get_balance()}"

@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ('wallet', 'transaction_type', 'amount', 'status', 'timestamp')
    list_filter = ('transaction_type', 'status', 'timestamp')
    search_fields = ('wallet__user__email', 'waas_reference_id', 'voucher_reference')
    date_hierarchy = 'timestamp'
    readonly_fields = ('timestamp',)
