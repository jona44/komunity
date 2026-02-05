# models.py in the condolences app
from django.db import models
from django.contrib.auth.models import User
from django.apps import apps
from chema.models import *
from user.models import Profile


class Contribution(models.Model):
    group           = models.ForeignKey(Group, on_delete=models.CASCADE, related_name='group_contributions')
    deceased_member = models.ForeignKey('Deceased', on_delete=models.CASCADE, related_name='member_deceased', null=True, blank=True)
    contributing_member = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name='deceased_contributions', null=True, blank=True)
    group_admin = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name='admin_contributions', null=True, blank=True)
    amount      = models.DecimalField(default=100.00, max_digits=10, decimal_places=2)
    payment_method = models.CharField(max_length=50, default='cash', choices=[
        ('cash', 'Cash'),
        ('bank_transfer', 'Bank Transfer'),
        ('mobile_money', 'Mobile Money'),
        ('wallet', 'Wallet Balance'),
        ('other', 'Other'),
    ])
    transaction = models.ForeignKey('wallet.Transaction', on_delete=models.SET_NULL, null=True, blank=True, related_name='contribution')
    contribution_date = models.DateField(auto_now_add=True)
    
    def __str__(self):
        return f"Contribution by {self.contributing_member} on {self.contribution_date} in {self.group.name} for{self.deceased_member}"
    
    class Meta:
        unique_together = ('deceased_member', 'contributing_member')
    
class Deceased(models.Model):
    deceased  = models.OneToOneField(Profile, on_delete=models.CASCADE,related_name='profile_deceased',default=True, unique=True)
    group     = models.ForeignKey(Group, on_delete=models.CASCADE)
    date      = models.DateField(auto_now_add=True)
    group_admin = models.ForeignKey(Profile, on_delete=models.SET_NULL, null=True, blank=True, related_name='admin')
    contributions_open = models.BooleanField(default=True)
    cont_is_active = models.BooleanField(default=True)
    
    # Beneficiary & Payout
    beneficiary = models.ForeignKey(Profile, on_delete=models.SET_NULL, null=True, blank=True, related_name='beneficiary_for')
    funds_disbursed = models.BooleanField(default=False)

    def __str__ (self):
       return f"{self.deceased}"
   
    def stop_contributions(self):
        self.cont_is_active = False
        self.contributions_open = False
        self.save()

    def get_total_raised(self):
        from django.db.models import Sum
        return self.member_deceased.aggregate(total=Sum('amount'))['total'] or 0

    def get_total_disbursed(self):
        from django.db.models import Sum
        # Sum of all payout transactions linked to this deceased member
        return self.wallet_contributions.filter(
            transaction_type='PAYOUT_RECEIVED', 
            status='COMPLETED'
        ).aggregate(total=Sum('amount'))['total'] or 0

    def get_balance(self):
        # Balance held by group for this deceased member (Raised - Disbursed)
        from decimal import Decimal
        raised = self.get_total_raised()
        disbursed = self.get_total_disbursed()
        return raised - disbursed