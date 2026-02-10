from rest_framework import serializers
from .models import Wallet, Transaction
from chema.serializers import GroupSerializer

class TransactionSerializer(serializers.ModelSerializer):
    destination_group_detail = GroupSerializer(source='destination_group', read_only=True)
    recipient_wallet_detail = serializers.SerializerMethodField()
    wallet_detail = serializers.SerializerMethodField()

    class Meta:
        model = Transaction
        fields = [
            'id', 'wallet', 'transaction_type', 'amount', 'status', 
            'destination_group', 'destination_group_detail', 
            'recipient_wallet', 'recipient_wallet_detail',
            'wallet_detail',
            'deceased_contribution', 'voucher_reference', 
            'waas_reference_id', 'timestamp'
        ]
    
    def get_wallet_detail(self, obj):
        user = obj.wallet.user
        return {
            'user_id': user.id,
            'user_email': user.email,
            'full_name': user.profile.full_name if hasattr(user, 'profile') else user.email
        }
    
    def get_recipient_wallet_detail(self, obj):
        if obj.recipient_wallet:
            return {
                'user_id': obj.recipient_wallet.user.id,
                'full_name': obj.recipient_wallet.user.profile.full_name if hasattr(obj.recipient_wallet.user, 'profile') else obj.recipient_wallet.user.email
            }
        return None

class WalletSerializer(serializers.ModelSerializer):
    balance = serializers.DecimalField(source='get_balance', max_digits=10, decimal_places=2, read_only=True)
    recent_transactions = serializers.SerializerMethodField()

    class Meta:
        model = Wallet
        fields = ['id', 'user', 'external_wallet_id', 'balance', 'recent_transactions', 'created_at']

    def get_recent_transactions(self, obj):
        transactions = obj.transactions.all().order_by('-timestamp')[:5]
        return TransactionSerializer(transactions, many=True).data
