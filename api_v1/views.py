from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.pagination import PageNumberPagination


class StandardPagination(PageNumberPagination):
    page_size = 15
    page_size_query_param = 'page_size'
    max_page_size = 50
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

from user.notifications import send_push_notification

class IsAuthorOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow owners of an object to edit it.
    """
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.author == request.user.profile

class IsPostImageAuthorOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow owners of the post to delete its images.
    """
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.post.author == request.user.profile

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

    def perform_create(self, serializer):
        group = serializer.save(creator=self.request.user)
        # Automatically add the creator as an active admin member
        GroupMembership.objects.create(
            group=group,
            member=self.request.user.profile,
            is_admin=True,
            role='admin',
            status='active'
        )

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

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        group = self.get_object()
        profile = request.user.profile
        GroupMembership.objects.filter(group=group, member=profile).update(last_viewed_at=timezone.now())
        return Response({'status': 'marked_read'})

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
        # Transparency: Any active member or admin can view history
        is_member = group.is_member(request.user)
        is_admin = group.is_admin(request.user)
        
        if not (is_member or is_admin):
            return Response(
                {'error': f'Access denied. You must be an active member of {group.name} to view its wallet.'}, 
                status=status.HTTP_403_FORBIDDEN
            )

            
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
        
        # Notify the user
        send_push_notification(
            user=membership.member.user,
            title=f"Welcome to {membership.group.name}!",
            message="Your membership request has been approved.",
            notification_type="membership_approved",
            data={'group_id': membership.group.id}
        )
        
        return Response({'status': 'active'})

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        membership = self.get_object()
        if not membership.group.is_admin(request.user):
            return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
        
        membership.status = 'rejected'
        membership.is_active = False
        membership.save()
        
        # Notify the user
        send_push_notification(
            user=membership.member.user,
            title=f"Membership Update for {membership.group.name}",
            message="Your membership request was declined.",
            notification_type="membership_rejected",
            data={'group_id': membership.group.id}
        )
        
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
            
        # Notify admins
        admins = membership.group.members.filter(groupmembership__is_admin=True, groupmembership__is_active=True)
        for admin_profile in admins:
            if admin_profile == request.user.profile: continue # Skip sender
            send_push_notification(
                user=admin_profile.user,
                title=f"Deceased Member Report",
                message=f"{membership.member.full_name} has been declared deceased in {membership.group.name}.",
                notification_type="deceased_declared",
                data={'group_id': membership.group.id, 'deceased_id': membership.member.id}
            )
        
        return Response({'status': 'deceased_declared'}, status=status.HTTP_200_OK)

class PostViewSet(viewsets.ModelViewSet):
    queryset = Post.objects.filter(approved=True).order_by('-created_at')
    serializer_class = PostSerializer
    permission_classes = [permissions.IsAuthenticated, IsAuthorOrReadOnly]
    pagination_class = StandardPagination

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
            post = serializer.save(author=profile)
            
            # Notify group members (limited to 20 for performance)
            if post.group:
                members = post.group.members.filter(groupmembership__is_active=True).exclude(id=profile.id)[:20]
                for member in members:
                    send_push_notification(
                        user=member.user, # Profile -> User
                        title=f"New Post in {post.group.name}",
                        message=f"{profile.full_name} posted: {post.content[:40]}{'...' if len(post.content) > 40 else ''}",
                        notification_type="new_post",
                        data={'post_id': post.id, 'group_id': post.group.id}
                    )

        except Exception as e:
            # Handle potential missing profile or notification errors
            print(f"Error in post creation/notification: {e}")
            if not serializer.instance: # If save failed before
                 serializer.save()

class PostImageViewSet(viewsets.ModelViewSet):
    queryset = PostImage.objects.all()
    serializer_class = PostImageSerializer
    permission_classes = [permissions.IsAuthenticated, IsPostImageAuthorOrReadOnly]

class CommentViewSet(viewsets.ModelViewSet):
    queryset = Comment.objects.all().order_by('-created_at')
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticated, IsAuthorOrReadOnly]

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
    permission_classes = [permissions.IsAuthenticated, IsAuthorOrReadOnly]

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
            
            # Notify beneficiary
            send_push_notification(
                user=deceased.beneficiary.user,
                title="Funds Received",
                message=f"You received {balance} for {deceased.deceased.full_name}.",
                notification_type="funds_disbursed",
                data={'amount': str(balance)}
            )
            
        return Response({
            'status': 'success',
            'amount': balance,
            'beneficiary': deceased.beneficiary.full_name,
            'transaction': TransactionSerializer(transaction).data
        })

class ContributionViewSet(viewsets.ModelViewSet):
    queryset = Contribution.objects.all()
    serializer_class = ContributionSerializer
    pagination_class = StandardPagination

    def get_queryset(self):
        return Contribution.objects.filter(contributing_member=self.request.user.profile).order_by('-contribution_date')

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

        # Send Notifications
        try:
            # Notify Contributor
            send_push_notification(
                user=request.user,
                title="Contribution Successful",
                message=f"You successfully contributed {amount} to {deceased.deceased.full_name}'s fund.",
                notification_type="contribution_sent",
                data={'contribution_id': contribution.id, 'deceased_id': deceased.id}
            )
            
            # Notify Group Admin
            if deceased.group_admin and deceased.group_admin.user:
                send_push_notification(
                    user=deceased.group_admin.user,
                    title="New Contribution Received",
                    message=f"{request.user.profile.full_name} contributed {amount} to {deceased.deceased.full_name}.",
                    notification_type="contribution_received",
                    data={'contribution_id': contribution.id, 'deceased_id': deceased.id}
                )
        except Exception as e:
            print(f"Error sending contribution notifications: {e}")

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


@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_request(request):
    """API endpoint for mobile password reset. Sends a reset email."""
    from django.contrib.auth.forms import PasswordResetForm
    from django.conf import settings

    email = request.data.get('email', '').strip()
    if not email:
        return Response({'error': 'Email is required.'}, status=status.HTTP_400_BAD_REQUEST)

    form = PasswordResetForm(data={'email': email})
    if form.is_valid():
        form.save(
            request=request,
            use_https=request.is_secure(),
            from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@chema101.com'),
            email_template_name='registration/password_reset_email.html',
        )
    # Always return success to avoid revealing which emails exist
    return Response({'detail': 'If an account with that email exists, a password reset link has been sent.'})

from user.models import DeviceToken
from user.serializers import DeviceTokenSerializer

class DeviceTokenViewSet(viewsets.ModelViewSet):
    queryset = DeviceToken.objects.all()
    serializer_class = DeviceTokenSerializer
    # Only authenticated users can register tokens
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return DeviceToken.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        # If token exists for this user, just update updated_at (handled by auto_now)
        # But since token is unique, we might need to handle integrity error or use update_or_create logic manually
        # OR we can let the frontend handle it by checking if it exists?
        # Better: use create to get_or_create.
        pass

    @action(detail=False, methods=['post'])
    def register(self, request):
        token = request.data.get('token')
        platform = request.data.get('platform')
        
        if not token:
            return Response({'error': 'Token is required'}, status=status.HTTP_400_BAD_REQUEST)
            
        # Update or create
        # Ensure token is unique globally and assigned to current user
        device_token, created = DeviceToken.objects.update_or_create(
            token=token,
            defaults={'user': request.user, 'platform': platform, 'is_active': True}
        )
        
        return Response({'status': 'registered', 'created': created})

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def search_api_view(request):
    """
    Search groups and members.
    Query param: q
    """
    from django.db.models import Q
    query = request.GET.get('q', '').strip()
    
    if not query:
        return Response({'groups': [], 'members': []})

    groups = Group.objects.filter(
        Q(name__icontains=query) | 
        Q(description__icontains=query)
    ).distinct()

    members = Profile.objects.filter(
        Q(user__email__icontains=query) | 
        Q(first_name__icontains=query) | 
        Q(surname__icontains=query)
    ).distinct()

    return Response({
        'groups': GroupSerializer(groups, many=True, context={'request': request}).data,
        'members': ProfileSerializer(members, many=True, context={'request': request}).data
    })
