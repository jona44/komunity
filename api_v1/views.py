from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.shortcuts import get_object_or_404
from django.utils import timezone

from chema.models import Group, Post, Comment, GroupMembership, PostImage, Reply
from user.models import Profile
from condolence.models import Contribution, Deceased
from wallet.models import Wallet, Transaction

from chema.serializers import (
    GroupSerializer, PostSerializer, CommentSerializer, 
    GroupMembershipSerializer, PostImageSerializer, ReplySerializer
)
from user.serializers import ProfileSerializer, UserSerializer, SignupSerializer
from condolence.serializers import ContributionSerializer, DeceasedSerializer
from wallet.serializers import WalletSerializer, TransactionSerializer

from django.contrib.auth import get_user_model
CustomUser = get_user_model()

class ProfileViewSet(viewsets.ModelViewSet):
    queryset = Profile.objects.all()
    serializer_class = ProfileSerializer

    def get_queryset(self):
        # Allow users to only see their own profile or public profiles
        if self.request.user.is_authenticated:
            return Profile.objects.filter(is_active=True)
        return Profile.objects.none()

    @action(detail=False, methods=['get'])
    def me(self, request):
        serializer = self.get_serializer(request.user.profile)
        return Response(serializer.data)

    def perform_update(self, serializer):
        profile = serializer.save()
        profile.check_completion()
        profile.save()

class UserViewSet(viewsets.GenericViewSet):
    queryset = CustomUser.objects.all()
    serializer_class = UserSerializer

    @action(detail=False, methods=['get'])
    def me(self, request):
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny])
    def signup(self, request):
        serializer = SignupSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return Response(UserSerializer(user, context={'request': request}).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class GroupViewSet(viewsets.ModelViewSet):
    queryset = Group.objects.all()
    serializer_class = GroupSerializer

    def get_queryset(self):
        queryset = Group.objects.filter(is_active=True)
        # For Discovery, we might want to exclude groups user is already in
        # But for now, let's just provide a simple way to get 'mine'
        return queryset

    @action(detail=False, methods=['get'])
    def mine(self, request):
        profile = request.user.profile
        groups = Group.objects.filter(groupmembership__member=profile, groupmembership__status='active')
        serializer = self.get_serializer(groups, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def join(self, request, pk=None):
        group = self.get_object()
        profile = request.user.profile
        membership, created = GroupMembership.objects.get_or_create(
            group=group,
            member=profile,
            defaults={'status': 'pending' if group.requires_approval else 'active'}
        )
        return Response({'status': membership.status}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def leave(self, request, pk=None):
        group = self.get_object()
        profile = request.user.profile
        GroupMembership.objects.filter(group=group, member=profile).update(is_active=False, status='inactive')
        return Response({'status': 'left'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def select(self, request, pk=None):
        group = self.get_object()
        profile = request.user.profile
        # Set this one as active in DB (will be used as fallback on web and primary on mobile)
        GroupMembership.objects.filter(member=profile, group=group).update(is_active=True)
        # Deactivate others for this user
        GroupMembership.objects.filter(member=profile).exclude(group=group).update(is_active=False)
        return Response({'status': 'selected'})

    @action(detail=True, methods=['get'])
    def members(self, request, pk=None):
        group = self.get_object()
        memberships = GroupMembership.objects.filter(group=group, is_active=True)
        serializer = GroupMembershipSerializer(memberships, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def pending_members(self, request, pk=None):
        group = self.get_object()
        if not group.is_admin(request.user):
            return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
        memberships = GroupMembership.objects.filter(group=group, status='pending')
        serializer = GroupMembershipSerializer(memberships, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def transactions(self, request, pk=None):
        group = self.get_object()
        # Anyone in the group can see the wallet history? 
        # For now, yes, transparency.
        if not group.is_member(request.user):
            return Response({'error': 'Not fully authorized'}, status=status.HTTP_403_FORBIDDEN)
            
        transactions = Transaction.objects.filter(
            destination_group=group,
            status='COMPLETED'
        ).order_by('-timestamp')
        
        serializer = TransactionSerializer(transactions, many=True)
        return Response(serializer.data)

class GroupMembershipViewSet(viewsets.ModelViewSet):
    queryset = GroupMembership.objects.all()
    serializer_class = GroupMembershipSerializer

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        membership = self.get_object()
        if not membership.group.is_admin(request.user):
            return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
        
        membership.approve(request.user)
        return Response({'status': 'active'})

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        membership = self.get_object()
        if not membership.group.is_admin(request.user):
            return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
        
        membership.status = 'rejected'
        membership.is_active = False
        membership.save()
        return Response({'status': 'rejected'})

    @action(detail=True, methods=['post'])
    def declare_deceased(self, request, pk=None):
        membership = self.get_object()
        if not membership.group.is_admin(request.user):
            return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
        
        # Update membership status
        membership.is_deceased = True
        membership.is_active = False # No longer an active contributor
        membership.save()
        
        # Create Deceased record in condolence app if it doesn't exist
        # A profile can only be deceased once globally
        deceased_record = Deceased.objects.filter(deceased=membership.member).first()
        if not deceased_record:
            Deceased.objects.create(
                deceased=membership.member,
                group=membership.group,
                group_admin=request.user.profile
            )
        
        return Response({'status': 'deceased_declared'}, status=status.HTTP_200_OK)

class PostViewSet(viewsets.ModelViewSet):
    queryset = Post.objects.filter(approved=True).order_by('-created_at')
    serializer_class = PostSerializer

    def get_queryset(self):
        queryset = Post.objects.filter(approved=True).order_by('-created_at')
        group_id = self.request.query_params.get('group_id')
        if group_id:
            queryset = queryset.filter(group_id=group_id)
        return queryset

    @action(detail=True, methods=['post'])
    def like(self, request, pk=None):
        post = self.get_object()
        try:
            profile = request.user.profile
        except Exception:
            return Response({'error': 'Profile not found'}, status=status.HTTP_400_BAD_REQUEST)
            
        if post.likes.filter(id=profile.id).exists():
            post.likes.remove(profile)
            liked = False
        else:
            post.likes.add(profile)
            liked = True
        return Response({
            'liked': liked,
            'likes_count': post.get_likes_count()
        })

    def perform_create(self, serializer):
        try:
            profile = self.request.user.profile
            serializer.save(author=profile)
        except Exception:
            # Handle potential missing profile
            serializer.save()

class PostImageViewSet(viewsets.ModelViewSet):
    queryset = PostImage.objects.all()
    serializer_class = PostImageSerializer

class CommentViewSet(viewsets.ModelViewSet):
    queryset = Comment.objects.all().order_by('-created_at')
    serializer_class = CommentSerializer

    def get_queryset(self):
        queryset = Comment.objects.all().order_by('-created_at')
        post_id = self.request.query_params.get('post_id')
        if post_id:
            queryset = queryset.filter(post_id=post_id)
        return queryset

    def perform_create(self, serializer):
        try:
            profile = self.request.user.profile
            serializer.save(author=profile)
        except Exception:
            serializer.save()

class ReplyViewSet(viewsets.ModelViewSet):
    queryset = Reply.objects.all().order_by('created_at')
    serializer_class = ReplySerializer

    def perform_create(self, serializer):
        try:
            profile = self.request.user.profile
            serializer.save(author=profile)
        except Exception:
            serializer.save()

class DeceasedViewSet(viewsets.ModelViewSet):
    queryset = Deceased.objects.filter(cont_is_active=True)
    serializer_class = DeceasedSerializer

    @action(detail=True, methods=['post'])
    def disburse_funds(self, request, pk=None):
        deceased = self.get_object()
        if not deceased.group.is_admin(request.user):
            return Response({'error': 'Only group admins can disburse funds'}, status=status.HTTP_403_FORBIDDEN)
        
        if not deceased.beneficiary:
            return Response({'error': 'No beneficiary assigned'}, status=status.HTTP_400_BAD_REQUEST)
        
        balance = deceased.get_balance()
        if balance <= 0:
            return Response({'error': 'No funds available for disbursement'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Perform payout
        from wallet.models import Wallet, Transaction
        from django.db import transaction as db_transaction
        
        # Get or create beneficiary wallet
        beneficiary_wallet, _ = Wallet.objects.get_or_create(
            user=deceased.beneficiary.user, 
            defaults={'external_wallet_id': f"WAAS_{deceased.beneficiary.user.id}"}
        )
        
        with db_transaction.atomic():
            # Create payout transaction for beneficiary
            transaction = Transaction.objects.create(
                wallet=beneficiary_wallet,
                transaction_type='PAYOUT_RECEIVED',
                amount=balance,
                status='COMPLETED',
                destination_group=deceased.group,
                deceased_contribution=deceased,
                waas_reference_id=f"PAY_{timezone.now().timestamp()}"
            )
            
            # We no longer close the fund automatically here
            # deceased.funds_disbursed = True
            # deceased.contributions_open = False
            deceased.save()
            
        return Response({
            'status': 'success',
            'amount': balance,
            'beneficiary': deceased.beneficiary.full_name,
            'transaction': TransactionSerializer(transaction).data
        })

class ContributionViewSet(viewsets.ModelViewSet):
    queryset = Contribution.objects.all()
    serializer_class = ContributionSerializer

    def get_queryset(self):
        return Contribution.objects.filter(contributing_member=self.request.user.profile)

class WalletViewSet(viewsets.ModelViewSet):
    serializer_class = WalletSerializer

    def get_queryset(self):
        return Wallet.objects.filter(user=self.request.user)

    @action(detail=False, methods=['get'])
    def balance(self, request):
        wallet, _ = Wallet.objects.get_or_create(user=request.user, defaults={'external_wallet_id': f"WAAS_{request.user.id}"})
        return Response({'balance': wallet.get_balance()})

    @action(detail=False, methods=['post'])
    def top_up(self, request):
        wallet, _ = Wallet.objects.get_or_create(user=request.user, defaults={'external_wallet_id': f"WAAS_{request.user.id}"})
        amount = request.data.get('amount')
        voucher_ref = request.data.get('voucher_reference')

        if not amount:
            return Response({'error': 'Amount is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            amount_val = float(amount)
            if amount_val <= 0:
                return Response({'error': 'Amount must be positive'}, status=status.HTTP_400_BAD_REQUEST)
        except ValueError:
            return Response({'error': 'Invalid amount format'}, status=status.HTTP_400_BAD_REQUEST)

        # Create the transaction
        transaction = Transaction.objects.create(
            wallet=wallet,
            transaction_type='TOP_UP',
            amount=amount,
            status='COMPLETED',
            voucher_reference=voucher_ref,
            waas_reference_id=f"TOP_{timezone.now().timestamp()}"
        )

        return Response({
            'status': 'success',
            'balance': wallet.get_balance(),
            'transaction': TransactionSerializer(transaction).data
        })

    @action(detail=False, methods=['post'])
    def send_money(self, request):
        from django.db import transaction as db_transaction
        
        sender_wallet, _ = Wallet.objects.get_or_create(user=request.user, defaults={'external_wallet_id': f"WAAS_{request.user.id}"})
        recipient_user_id = request.data.get('recipient_user_id')
        amount = request.data.get('amount')
        note = request.data.get('note', '')

        if not recipient_user_id or not amount:
            return Response({'error': 'Recipient and amount are required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            amount_val = float(amount)
            if amount_val <= 0:
                return Response({'error': 'Amount must be positive'}, status=status.HTTP_400_BAD_REQUEST)
        except ValueError:
            return Response({'error': 'Invalid amount format'}, status=status.HTTP_400_BAD_REQUEST)

        # Check if sending to self
        if str(request.user.id) == str(recipient_user_id):
            return Response({'error': 'Cannot send money to yourself'}, status=status.HTTP_400_BAD_REQUEST)

        # Get recipient wallet
        try:
            recipient_user = CustomUser.objects.get(id=recipient_user_id)
            recipient_wallet, _ = Wallet.objects.get_or_create(user=recipient_user, defaults={'external_wallet_id': f"WAAS_{recipient_user.id}"})
        except CustomUser.DoesNotExist:
            return Response({'error': 'Recipient not found'}, status=status.HTTP_404_NOT_FOUND)

        # Check balance
        if sender_wallet.get_balance() < amount_val:
            return Response({'error': 'Insufficient balance'}, status=status.HTTP_400_BAD_REQUEST)

        # Create both transactions atomically
        with db_transaction.atomic():
            # Debit from sender
            sender_txn = Transaction.objects.create(
                wallet=sender_wallet,
                transaction_type='P2P_SENT',
                amount=amount,
                status='COMPLETED',
                recipient_wallet=recipient_wallet,
                waas_reference_id=f"P2P_{timezone.now().timestamp()}"
            )

            # Credit to recipient
            recipient_txn = Transaction.objects.create(
                wallet=recipient_wallet,
                transaction_type='P2P_RECEIVED',
                amount=amount,
                status='COMPLETED',
                waas_reference_id=f"P2P_{timezone.now().timestamp()}"
            )

        return Response({
            'status': 'success',
            'balance': sender_wallet.get_balance(),
            'transaction': TransactionSerializer(sender_txn).data,
            'recipient': recipient_user.email
        })

    @action(detail=False, methods=['post'])
    def contribute_to_deceased(self, request):
        from condolence.models import Deceased, Contribution
        from django.db import transaction as db_transaction
        
        wallet, _ = Wallet.objects.get_or_create(user=request.user, defaults={'external_wallet_id': f"WAAS_{request.user.id}"})
        deceased_id = request.data.get('deceased_id')
        amount = request.data.get('amount')

        if not deceased_id or not amount:
            return Response({'error': 'Deceased member and amount are required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            amount_val = float(amount)
            if amount_val <= 0:
                return Response({'error': 'Amount must be positive'}, status=status.HTTP_400_BAD_REQUEST)
        except ValueError:
            return Response({'error': 'Invalid amount format'}, status=status.HTTP_400_BAD_REQUEST)

        # Get deceased member
        try:
            deceased = Deceased.objects.get(id=deceased_id)
        except Deceased.DoesNotExist:
            return Response({'error': 'Deceased member not found'}, status=status.HTTP_404_NOT_FOUND)

        # Check if contributions are still open
        if not deceased.cont_is_active or not deceased.contributions_open:
            return Response({'error': 'Contributions are closed for this member'}, status=status.HTTP_400_BAD_REQUEST)

        # Check balance
        if wallet.get_balance() < amount_val:
            return Response({'error': 'Insufficient balance'}, status=status.HTTP_400_BAD_REQUEST)

        # Create transaction and contribution atomically
        with db_transaction.atomic():
            # Create wallet transaction
            transaction = Transaction.objects.create(
                wallet=wallet,
                transaction_type='TRANSFER',
                amount=amount,
                status='COMPLETED',
                deceased_contribution=deceased,
                waas_reference_id=f"DEC_{timezone.now().timestamp()}"
            )

            # Create contribution record
            contribution = Contribution.objects.create(
                group=deceased.group,
                deceased_member=deceased,
                contributing_member=request.user.profile,
                amount=amount,
                payment_method='wallet',
                transaction=transaction
            )

        return Response({
            'status': 'success',
            'balance': wallet.get_balance(),
            'transaction': TransactionSerializer(transaction).data,
            'contribution': {
                'id': contribution.id,
                'deceased': deceased.deceased.full_name,
                'amount': str(contribution.amount),
                'total_raised': str(deceased.get_total_raised())
            }
        })

class TransactionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = TransactionSerializer

    def get_queryset(self):
        return Transaction.objects.filter(wallet__user=self.request.user).order_by('-timestamp')
