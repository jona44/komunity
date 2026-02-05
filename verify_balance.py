import os
import django
from decimal import Decimal

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')  # Verify settings path if needed
django.setup()

from django.contrib.auth import get_user_model
from wallet.models import Wallet, Transaction
from condolence.models import Deceased

User = get_user_model()

print("--- Verifying Beneficiary Wallets ---")

for wallet in Wallet.objects.all():
    print(f"\nWallet Owner: {wallet.user.email}")
    print(f"Computed Balance: {wallet.get_balance()}")
    
    print("Transactions:")
    for t in wallet.transactions.all():
        print(f" - ID: {t.id} | Type: {repr(t.transaction_type)} | Amount: {t.amount} | Status: {repr(t.status)}")
        if t.status != 'COMPLETED':
             print(f"   WARNING: Status '{t.status}' does not match expected 'COMPLETED'!")
        if t.transaction_type == 'PAYOUT_RECEIVED':
             print("   ^^^ FOUND PAYOUT TRANSACTION")

print("\n--- Verifying Deceased disbursements ---")
# Check filtering logic
print(f"Checking Deceased ID 15...")
try:
    d = Deceased.objects.get(id=15)
    print(f"Deceased: {d.deceased}, Disbursed: {d.funds_disbursed}, Beneficiary: {d.beneficiary}")
    if d.beneficiary:
        ben_wallet = Wallet.objects.filter(user=d.beneficiary.user).first()
        if ben_wallet:
            print(f"Beneficiary Wallet Balance: {ben_wallet.get_balance()}")
            in_tx = ben_wallet.transactions.filter(transaction_type='PAYOUT_RECEIVED')
            print(f"Beneficiary Payout Transactions: {list(in_tx)}")
        else:
            print("Beneficiary has no wallet!")
except Deceased.DoesNotExist:
    print("Deceased ID 15 not found")
