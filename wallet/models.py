from django.db import models
from django.conf import settings
from chema.models import Group

class Wallet(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    external_wallet_id = models.CharField(max_length=100, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Wallet for {self.user.email}"

    def get_balance(self):
        from decimal import Decimal
        from django.db.models import Sum
        
        # Calculate Incoming (Top-Ups + Payouts + Received Transfers)
        incoming = self.transactions.filter(
            transaction_type__in=['TOP_UP', 'PAYOUT_RECEIVED', 'P2P_RECEIVED'],
            status='COMPLETED'
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

        # Calculate Outgoing (Transfers + Withdrawals + Sent Transfers)
        outgoing = self.transactions.filter(
            transaction_type__in=['TRANSFER', 'WITHDRAWAL', 'P2P_SENT'],
            status='COMPLETED'
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

        return incoming - outgoing

class Transaction(models.Model):
    class TransactionType(models.TextChoices):
        TOP_UP = 'TOP_UP', 'Top-Up'
        TRANSFER = 'TRANSFER', 'Transfer to Group'
        WITHDRAWAL = 'WITHDRAWAL', 'Withdrawal'
        PAYOUT_RECEIVED = 'PAYOUT_RECEIVED', 'Payout Received'
        P2P_SENT = 'P2P_SENT', 'Peer-to-Peer Sent'
        P2P_RECEIVED = 'P2P_RECEIVED', 'Peer-to-Peer Received'

    class TransactionStatus(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        COMPLETED = 'COMPLETED', 'Completed'
        FAILED = 'FAILED', 'Failed'

    wallet = models.ForeignKey(Wallet, on_delete=models.PROTECT, related_name="transactions")
    transaction_type = models.CharField(max_length=20, choices=TransactionType.choices)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=TransactionStatus.choices, default=TransactionStatus.PENDING)
    
    # Where the money went (if applicable)
    destination_group = models.ForeignKey(Group, on_delete=models.SET_NULL, null=True, blank=True)
    recipient_wallet = models.ForeignKey(Wallet, on_delete=models.SET_NULL, null=True, blank=True, related_name="incoming_transfers")
    deceased_contribution = models.ForeignKey('condolence.Deceased', on_delete=models.SET_NULL, null=True, blank=True, related_name='wallet_contributions')

    
    # IDs from the external systems for reconciliation
    voucher_reference = models.CharField(max_length=100, blank=True, null=True)
    waas_reference_id = models.CharField(max_length=100, blank=True, null=True) # The ID from your WaaS provider
    
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.transaction_type} of {self.amount} for {self.wallet.user.email} - {self.status}"
