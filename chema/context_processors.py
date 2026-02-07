from .models import *
from django.shortcuts import  get_object_or_404
from condolence.forms import DeceasedForm

def user_groups(request):
    # Ensure the user is authenticated
    if request.user.is_authenticated:
        # Get the user's profile
        user_profile = Profile.objects.get(user=request.user)
        # Get the groups the user is a member of
        groups = Group.objects.filter(members=user_profile)
    else:
        groups = Group.objects.none()

    return {'groups': groups}


def active_group_context(request):
    """
    Context processor to make the active group and user's membership available globally.
    """
    context = {}
    
    # Try to get group from URL first
    active_group = None
    if request.resolver_match and 'group_id' in request.resolver_match.kwargs:
        try:
            active_group = Group.objects.get(id=request.resolver_match.kwargs['group_id'])
        except Group.DoesNotExist:
            pass
            
    # Fallback to default active group logic if not in a specific group view
    if not active_group and request.user.is_authenticated:
        try:
            # Check session first for the selected group
            active_group_id = request.session.get('active_group_id')
            active_membership = None
            
            if active_group_id:
                active_membership = GroupMembership.objects.filter(
                    member=request.user.profile, 
                    group_id=active_group_id,
                    is_active=True
                ).first()
            
            # If nothing in session or session group is invalid, fall back to DB marked active
            if not active_membership:
                active_membership = GroupMembership.objects.filter(
                    member=request.user.profile, 
                    is_active=True
                ).first()
            
            # If no membership is marked active at all, pick the first one
            if not active_membership:
                active_membership = GroupMembership.objects.filter(
                    member=request.user.profile
                ).first()
                if active_membership:
                    active_membership.is_active = True
                    active_membership.save()
            
            if active_membership:
                active_group = active_membership.group
                # Sync session if it was empty
                if not active_group_id:
                    request.session['active_group_id'] = active_group.id
        except (Profile.DoesNotExist, AttributeError):
            pass
            
    # Global fallback for unauthenticated users or if no memberships exist
    if not active_group:
        active_group = Group.objects.filter(is_active=True).first()
    
    if active_group:
        context['active_group'] = active_group
        
        if request.user.is_authenticated:
            try:
                membership = GroupMembership.objects.get(
                    group=active_group, 
                    member=request.user.profile,
                    is_active=True
                )
                context['active_group_membership'] = membership
                context['user_role'] = membership.role
            except (GroupMembership.DoesNotExist, Profile.DoesNotExist, AttributeError):
                context['active_group_membership'] = None
                context['user_role'] = None
        
        # Add DeceasedForm to context
        context['deceased_form'] = DeceasedForm(active_group=active_group)
                
    return context

