from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ProfileViewSet, GroupViewSet, PostViewSet, CommentViewSet, 
    DeceasedViewSet, ContributionViewSet, WalletViewSet, PostImageViewSet,
    TransactionViewSet, UserViewSet, ReplyViewSet, GroupMembershipViewSet
)
from rest_framework.authtoken.views import obtain_auth_token

router = DefaultRouter()
router.register(r'profiles', ProfileViewSet)
router.register(r'groups', GroupViewSet)
router.register(r'memberships', GroupMembershipViewSet)
router.register(r'posts', PostViewSet)
router.register(r'post-images', PostImageViewSet)
router.register(r'comments', CommentViewSet)
router.register(r'replies', ReplyViewSet)
router.register(r'deceased', DeceasedViewSet)
router.register(r'contributions', ContributionViewSet)
router.register(r'wallets', WalletViewSet, basename='wallet')
router.register(r'transactions', TransactionViewSet, basename='transactions')
router.register(r'users', UserViewSet, basename='users')

urlpatterns = [
    path('', include(router.urls)),
    path('auth-token/', obtain_auth_token, name='auth_token'),
]
