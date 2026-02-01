from django.shortcuts import render, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.http import HttpResponse
from django.views.decorators.http import require_POST
from django.db import models
from decimal import Decimal

from .models import Wallet, Transaction
from chema.models import Group
from condolence.models import Deceased, Contribution

# --- Helper Stub Functions (Simulating External API) ---

def waas_api_redeem_voucher(voucher_pin, user_wallet_id):
    # In a real app, this would call 1Voucher or Flutterwave
    print(f"STUB: Redeeming {voucher_pin} for wallet {user_wallet_id}")
    if voucher_pin == "12345":
        return {'success': True, 'amount': Decimal('100.00'), 'waas_ref': 'waas_stub_ref_123'}
    elif voucher_pin == "50":
         return {'success': True, 'amount': Decimal('50.00'), 'waas_ref': 'waas_stub_ref_50'}
    else:
        return {'success': False, 'error': 'Invalid PIN'}

def waas_api_transfer_funds(from_wallet_id, to_wallet_id, amount):
    # In a real app, this would call the WaaS transfer endpoint
    print(f"STUB: Transferring {amount} from {from_wallet_id} to {to_wallet_id}")
    return {'success': True, 'waas_ref': 'waas_stub_transfer_999'}

def waas_api_get_balance(wallet_id):
    # In a real app, this would query the WaaS provider for the live balance
    # For simulation, we'll calculate it from our internal ledger, assuming it's in sync
    # OR just return a random/mock value. Let's start with a mock value for the UI.
    return {'success': True, 'balance': Decimal('150.00')}


# --- Views ---

@login_required
@require_POST
def top_up_with_voucher(request):
    """
    HTMX view: Redeems a voucher and updates the user's wallet.
    """
    voucher_pin = request.POST.get('voucher_pin')
    user_wallet, created = Wallet.objects.get_or_create(user=request.user, defaults={'external_wallet_id': f"auto_{request.user.email}"})

    # 1. Log PENDING
    log_entry = Transaction.objects.create(
        wallet=user_wallet,
        transaction_type=Transaction.TransactionType.TOP_UP,
        amount=0.00,
        status=Transaction.TransactionStatus.PENDING,
        voucher_reference=voucher_pin
    )

    # 2. Call API
    api_response = waas_api_redeem_voucher(voucher_pin, user_wallet.external_wallet_id)

    if api_response['success']:
        # 3. Update Log
        log_entry.status = Transaction.TransactionStatus.COMPLETED
        log_entry.amount = api_response['amount']
        log_entry.waas_reference_id = api_response['waas_ref']
        log_entry.save()
        
        # 4. Return success signal to HTMX
        # The 'HX-Trigger' header tells the frontend to update the balance component
        import json
        triggers = {'update-balance': True, 'close-top-up-modal': True}
        return HttpResponse("", status=200, headers={'HX-Trigger': json.dumps(triggers)})
    else:
        # 3. Mark Failed
        log_entry.status = Transaction.TransactionStatus.FAILED
        log_entry.save()
        return HttpResponse(f"<span class='text-red-500 text-sm'>{api_response['error']}</span>")


@login_required
@require_POST
def transfer_to_group(request, group_id):
    """
    HTMX view: Transfers money from user to group for a specific deceased campaign.
    """
    try:
        amount = Decimal(request.POST.get('amount'))
        deceased_id = request.POST.get('deceased_id')
    except (ValueError, TypeError):
         return HttpResponse(f"<span class='text-red-500 text-sm'>Invalid amount</span>")
    
    # Validate deceased_id
    if not deceased_id:
        return HttpResponse(f"<span class='text-red-500 text-sm'>Please select a campaign</span>")
    
    # Derive group from the deceased campaign to allow cross-group transfers
    # (e.g. from Home page sidebar)
    deceased = get_object_or_404(Deceased, pk=deceased_id, cont_is_active=True)
    group = deceased.group
    
    # Check if user already contributed to this campaign
    if Contribution.objects.filter(deceased_member=deceased, contributing_member=request.user.profile).exists():
        return HttpResponse(f"<span class='text-red-500 text-sm'>You have already contributed to this campaign.</span>")

    user_wallet = request.user.wallet
    
    # 1. Log PENDING
    log_entry = Transaction.objects.create(
        wallet=user_wallet,
        transaction_type=Transaction.TransactionType.TRANSFER,
        amount=amount,
        status=Transaction.TransactionStatus.PENDING,
        destination_group=group,
        deceased_contribution=deceased  # Link to deceased campaign
    )
    
    # 2. Call API
    api_response = waas_api_transfer_funds(
        from_wallet_id=user_wallet.external_wallet_id,
        to_wallet_id=group.external_wallet_id,
        amount=amount
    )
    
    if api_response['success']:
        # 3. Update Log
        log_entry.status = Transaction.TransactionStatus.COMPLETED
        log_entry.waas_reference_id = api_response['waas_ref']
        log_entry.save()
        
        # 4. Create Contribution record so it reflects in home totals and activity
        Contribution.objects.create(
            group=group,
            deceased_member=deceased,
            contributing_member=request.user.profile,
            amount=amount,
            payment_method='WALLET',
            transaction=log_entry
        )
        
        # 5. Return success
        import json
        triggers = {
            'update-balance': True, 
            'close-transfer-modal': True,
            'update-contributions': True
        }
        return HttpResponse("", status=200, headers={'HX-Trigger': json.dumps(triggers)})
    else:
        log_entry.status = Transaction.TransactionStatus.FAILED
        log_entry.save()
        return HttpResponse(f"<span class='text-red-500 text-sm'>Transfer failed.</span>")


@login_required
def get_wallet_balance_snippet(request):
    """
    HTMX view: Returns just the HTML for the wallet balance.
    """
    # Ensure wallet exists
    user_wallet, created = Wallet.objects.get_or_create(user=request.user, defaults={'external_wallet_id': f"auto_{request.user.email}"})
    
    # In a real app, query the API.
    # For now, let's sum up COMPLETED top-ups minus COMPLETED transfers from our local DB
    # to make the "mock" feel real.
    
    top_ups = Transaction.objects.filter(
        wallet=user_wallet, 
        transaction_type=Transaction.TransactionType.TOP_UP, 
        status=Transaction.TransactionStatus.COMPLETED
    ).aggregate(total=models.Sum('amount'))['total'] or Decimal('0.00')
    
    transfers = Transaction.objects.filter(
        wallet=user_wallet, 
        transaction_type=Transaction.TransactionType.TRANSFER, 
        status=Transaction.TransactionStatus.COMPLETED
    ).aggregate(total=models.Sum('amount'))['total'] or Decimal('0.00')
    
    balance = top_ups - transfers
    
    return HttpResponse(f"R {balance}")
