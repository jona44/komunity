from django.shortcuts import render, redirect, get_object_or_404
from django.http import HttpResponse, JsonResponse,HttpResponseRedirect, Http404
from django.contrib.auth.decorators import login_required
from .models import *
from django.urls import reverse 
from django.db.models import Sum
from django.forms import inlineformset_factory 
from django.contrib import messages
from condolence.models import Contribution,Deceased
from user.models import Profile
from .forms import *
from condolence.forms import DeceasedForm
from django.core.exceptions import PermissionDenied


@login_required
def home(request):
    user = request.user.profile
    search_form = SearchForm()
    
    # Get the active group based on session or membership
    active_group_id = request.session.get('active_group_id')
    active_membership = None
    
    if active_group_id:
        active_membership = GroupMembership.objects.filter(member=user, group_id=active_group_id, is_active=True).first()
    
    if not active_membership:
        active_membership = GroupMembership.objects.filter(member=user, is_active=True).first()
    
    if not active_membership:
        active_membership = GroupMembership.objects.filter(member=user).first()
        if active_membership:
            active_membership.is_active = True
            active_membership.save()
            request.session['active_group_id'] = active_membership.group.id

    if not active_membership:
        return redirect('group_discovery')

    active_group = active_membership.group
    # Ensure session is in sync
    if not request.session.get('active_group_id'):
        request.session['active_group_id'] = active_group.id

    deceased      = Deceased.objects.filter(group=active_group)
    contributions = Contribution.objects.filter(deceased_member_id__contributions_open=True, group=active_group)



    # Fetch only the posts of the active group
    active_group_posts = Post.objects.filter(group=active_group).order_by('-created_at')

    # Fetch comments for the posts in the active group
    active_group_comments = Comment.objects.filter(post__in=active_group_posts).order_by('-created_at')
    
    group_data = {
        
        'group': active_group,
        'minimized': not (active_group_posts.exists() or active_group_comments.exists()),
        'posts': active_group_posts[:5],  # Limit the number of posts to display initially
        'comments': active_group_comments,  # Comments for active group's posts
        'admins_as_members': active_group.get_admins(),  # Use the new method to get admins
    }

    for comment in group_data['comments']:
        comment.replies.set(Reply.objects.filter(comment=comment).order_by('-created_at')[:3])

    deceased_form = DeceasedForm(active_group=active_group)

    context = {
        'grouped_data': [group_data],
        'search_form': search_form,
        'active_group': active_group,
        'active_group_posts': active_group_posts,
        'active_group_comments': active_group_comments,
        'contributions': contributions,
        'admins_as_members': active_group.get_admins(),
        'deceased': deceased,
        'deceased_form': deceased_form,
    }

    # Handle HTMX partial refresh for posts
    if request.headers.get('HX-Request') and request.headers.get('HX-Target') == 'posts-list':
        return render(request, 'chema/partials/posts_list.html', context)

    return render(request, 'chema/home.html', context)



@login_required
def choice(request):
    pass
    return render(request, 'chema/choice.html')


@login_required
def join_existing_group(request):
    profile = request.user.profile

    if request.method == 'POST':
        form = GroupJoinForm(request.POST)

        if form.is_valid():
            group_id = form.cleaned_data['group'].id
            group = get_object_or_404(Group, id=group_id)

            # Check if already a member
            if group.members.filter(id=profile.id).exists():
                messages.info(request, 'You are already a member of this group.')
            else:
                # Determine status based on group settings
                status = 'pending' if group.requires_approval else 'active'
                
                # Create membership
                GroupMembership.objects.create(
                    member=profile,
                    group=group,
                    is_admin=False,
                    status=status,
                    role='member',
                    is_active=(status == 'active')
                )
                
                if status == 'pending':
                    messages.success(request, 'Your request to join has been sent for approval.')
                else:
                    messages.success(request, f'You have successfully joined {group.name}!')
                    
                return redirect('group_detail_view', group_id=group.id)

    else:
        form = GroupJoinForm()

    return render(request, 'chema/join_existing_group.html', {'form': form})

@login_required
def join_active_group(request):
    # Assuming there is only one active group, retrieve it
    active_group = Group.objects.filter(is_active=True).first()

    if active_group:
        # Check if the user is already a member of the group
        is_member = GroupMembership.objects.filter(member=request.user.profile, group=active_group).exists()

        if not is_member:
            # If the user is not already a member, create a new GroupMembership
            membership = GroupMembership(member=request.user.profile, group=active_group)
            membership.save()
            messages.success(request, f"You have joined the '{active_group.name}' group.")
        else:
            messages.warning(request, f"You are already a member of the '{active_group.name}' group.")
    else:
        messages.error(request, "No active group found to join.")

    return redirect('group_detail_view', group_id=active_group.id)
 # Redirect to the group detail page or an appropriate URL


@login_required
def create_group(request):
    if request.method == 'POST':
        form = GroupCreationForm(request.POST, request.FILES)
        if form.is_valid():
            # Create the group detail using the form data
            group = form.save(commit=False)

            # Set the creator and admin
            group.creator = request.user
            group.admin = request.user.profile
            group.is_active = True
            group.save()
            
            # Add creator to admins
            group.admins.add(request.user)

            # Create a GroupMembership instance for the current user with active status
            member_instance = GroupMembership(
                member=request.user.profile, 
                group=group, 
                is_admin=True,
                status='active',  # Creator is automatically active
                role='admin',
                is_active=True
            )
            member_instance.save()
            
            # If HTMX request, return empty response (client will handle reload)
            if request.headers.get('HX-Request'):
                return HttpResponse(status=200)

            # Redirect to the group detail view or any other page
            return redirect('group_detail_view', group_id=group.id)
        else:
            # If HTMX request with errors, return the modal with errors
            if request.headers.get('HX-Request'):
                context = {'form': form}
                return render(request, 'chema/partials/create_group_modal.html', context)
    else:
        form = GroupCreationForm()

    context = {
        'form': form,
    }

    if request.headers.get('HX-Request'):
        return render(request, 'chema/partials/create_group_modal.html', context)

    return render(request, 'chema/create_group.html', context)


@login_required
def edit_group(request, group_id):
    """Edit group details - only accessible to group admins"""
    group = get_object_or_404(Group, id=group_id)
    
    # Check if user is admin of this group
    membership = GroupMembership.objects.filter(group=group, member=request.user.profile).first()
    is_admin = membership and (membership.is_admin or membership.role in ['admin', 'moderator'] or group.creator == request.user or group.admin == request.user.profile)
    
    if not is_admin:
        messages.error(request, 'You do not have permission to edit this group.')
        return redirect('group_detail_view', group_id=group.id)
    
    if request.method == 'POST':
        form = GroupCreationForm(request.POST, request.FILES, instance=group)
        if form.is_valid():
            form.save()
            messages.success(request, 'Group updated successfully!')
            return redirect('group_detail_view', group_id=group.id)
    else:
        form = GroupCreationForm(instance=group)
    
    context = {
        'form': form,
        'group': group,
        'edit_mode': True
    }
    
    return render(request, 'chema/edit_group.html', context)



@login_required
def create_post(request, group_id):
    group = get_object_or_404(Group, id=group_id)

    # Check if the user is a member of the group
    if not group.members.filter(id=request.user.profile.id).exists():
        messages.error(request, "You are not a member of this group.")
        return redirect('home')

    if request.method == 'POST':
        form = PostCreationForm(request.POST, request.FILES)
        if form.is_valid():
            # Create a new post
            post = form.save(commit=False)
            post.author = request.user.profile
            post.group = group
            
            # Handle media upload - check if multiple files
            media_files = request.FILES.getlist('media')
            
            if media_files:
                # Check if it's images or video
                first_file_type = media_files[0].content_type
                
                if first_file_type.startswith('video/'):
                    # Single video
                    post.video = media_files[0]
                elif first_file_type.startswith('image/'):
                    # Multiple images - save first as main image
                    post.image = media_files[0]
            
            post.save()
            
            # Save additional images to PostImage model
            if media_files and media_files[0].content_type.startswith('image/'):
                from .models import PostImage
                for media_file in media_files:
                    PostImage.objects.create(post=post, image=media_file)
            
            messages.success(request, "Post created successfully!")
            
            # If HTMX request, return empty response and trigger refresh
            if request.headers.get('HX-Request'):
                response = HttpResponse(status=200)
                response['HX-Trigger'] = 'postCreated'
                return response
            
            return redirect('home')
        else:
            messages.error(request, "Error creating the post. Please check your input.")
            # If HTMX request with errors, return the modal with errors
            if request.headers.get('HX-Request'):
                context = {'group': group, 'form': form}
                return render(request, 'chema/partials/create_post_modal.html', context)
    else:
        form = PostCreationForm()

    context = {
        'group': group,
        'form': form,
    }
    
    # If HTMX request, return just the modal partial
    if request.headers.get('HX-Request'):
        return render(request, 'chema/partials/create_post_modal.html', context)

    return render(request, 'chema/create_post.html', context)


@login_required
def edit_post(request, post_id):
    post = get_object_or_404(Post, id=post_id)

    if request.method == 'POST':
        form = EditPostForm(request.POST, instance=post)
        if form.is_valid():
            form.save()
            
            # If HTMX request, return empty response (client will handle reload)
            if request.headers.get('HX-Request'):
                return HttpResponse(status=200)
            
            return redirect('home')  # Redirect to the home page after editing the post
        else:
            # If HTMX request with errors, return the modal with errors
            if request.headers.get('HX-Request'):
                context = {'form': form, 'post': post}
                return render(request, 'chema/partials/edit_post_modal.html', context)
    else:
        form = EditPostForm(instance=post)
    
    context = {'form': form, 'post': post}
    
    # If HTMX request, return just the modal partial
    if request.headers.get('HX-Request'):
        return render(request, 'chema/partials/edit_post_modal.html', context)

    return render(request, 'chema/edit_post.html', context)


@login_required
def delete_post(request, post_id):
    post = get_object_or_404(Post, id=post_id)
    
    if request.method == 'POST':
        post.delete()
        
        # If HTMX request, return empty response (client will handle redirect)
        if request.headers.get('HX-Request'):
            return HttpResponse(status=200)
        
        return redirect('home')
    
    context = {'post': post}
    
    # If HTMX request, return just the modal partial
    if request.headers.get('HX-Request'):
        return render(request, 'chema/partials/delete_post_modal.html', context)
    
    return render(request, 'chema/delete_post.html', context)


@login_required
def create_comment(request, post_id):
    print( post_id)
    # Retrieve the post based on the post_id
    post = get_object_or_404(Post, id=post_id, approved=True)

    if request.method == 'POST':
        # Process the form submission
        form = CommentForm(request.POST)
        if form.is_valid():
            # Create a new comment
            comment = form.save(commit=False)
            comment.author = request.user.profile
            comment.post = post
            comment.save()
            messages.success(request, "Comment created successfully!")
            
            # If HTMX request, return empty response (client will handle reload)
            if request.headers.get('HX-Request'):
                return HttpResponse(status=200)
            
            return redirect('home')
        else:
            messages.error(request, "Error creating the comment. Please check your input.")
            # If HTMX request with errors, return the modal with errors
            if request.headers.get('HX-Request'):
                context = {'form': form, 'post': post}
                return render(request, 'chema/partials/create_comment_modal.html', context)
    else:
        # Display a blank form for creating a comment
        form = CommentForm()
    
    context = {'form': form, 'post': post}
    
    # If HTMX request, return just the modal partial
    if request.headers.get('HX-Request'):
        return render(request, 'chema/partials/create_comment_modal.html', context)

    return render(request, 'chema/create_comment.html', context)


@login_required
def edit_comment(request, comment_id):
    comment = get_object_or_404(Comment, id=comment_id)

    if comment.author != request.user.profile:
        # If the current user is not the author of the comment, they are not allowed to edit it
        return redirect('home')

    if request.method == 'POST':
        form = CommentEditForm(request.POST, instance=comment)
        if form.is_valid():
            form.save()
            return redirect('home')
    else:
        form = CommentEditForm(instance=comment)

    return render(request, 'chema/edit_comment.html', {'form': form, 'comment': comment})


@login_required
def delete_comment(request, comment_id):
    comment = get_object_or_404(Comment, id=comment_id)

    if comment.author != request.user.profile:
        # If the current user is not the author of the comment, they are not allowed to delete it
        return redirect('post_detail', post_id=comment.post.id)

    if request.method == 'POST':
        comment.delete()
        return redirect('post_detail', post_id=comment.post.id)

    return render(request, 'chema/delete_comment.html', {'comment': comment})




@login_required
def approve_post(request, post_id):
    post = get_object_or_404(Post, id=post_id)
    
    # Check if the user is the group admin
    if request.user == post.group.admin:
        post.approved = True
        post.save()
    
    return redirect('home')


@login_required
def add_dependents(request):
    DependentFormSet = inlineformset_factory(Profile, Dependent, form=DependentForm, extra=2,can_delete = False) # Set the number of empty forms

    user = request.user.profile
    formset = DependentFormSet(instance=user)

    if request.method == 'POST':
        formset = DependentFormSet(request.POST, instance=user)
        if formset.is_valid():
            # Iterate over the forms and set can_delete to False
            formset.save()
             # Getting the names of the added dependents
            added_dependents_names = ', '.join([form.cleaned_data.get('name') for form in formset.forms if form.cleaned_data.get('name')])

            # Adding a success message with the names of the added dependents
            success_message = f"Successfully added dependents: {added_dependents_names}"
            messages.success(request, success_message)
            return redirect('home')  # Redirect to the user's home page

    return render(request, 'chema/add_dependents.html', {'formset': formset})


@login_required
def add_reply(request, comment_id):
    comment= get_object_or_404(Comment, id=comment_id)

    if request.method == 'POST':
        form = ReplyForm(request.POST)
        if form.is_valid():
            new_reply = form.save(commit=False)
            new_reply.author = request.user.profile
            new_reply.comment = comment
            new_reply.save()
            
            # If HTMX request, return empty response (client will handle reload)
            if request.headers.get('HX-Request'):
                return HttpResponse(status=200)
            
            return redirect('home')
        else:
            # If HTMX request with errors, return the modal with errors
            if request.headers.get('HX-Request'):
                context = {'form': form, 'comment': comment}
                return render(request, 'chema/partials/add_reply_modal.html', context)
    else:
        form = ReplyForm()
    
    context = {'form': form, 'comment': comment}
    
    # If HTMX request, return just the modal partial
    if request.headers.get('HX-Request'):
        return render(request, 'chema/partials/add_reply_modal.html', context)

    return render(request, 'chema/add_reply.html', context)


@login_required
def remove_reply(request, reply_id):
    reply = get_object_or_404(Reply, id=reply_id)
    comment = reply.comment
    if request.user.profile == reply.author:
        reply.delete()
    return redirect('groupDetail', group_id=comment.post.group.id)


@login_required
def edit_reply(request, reply_id):
    reply = get_object_or_404(Reply, id=reply_id)

    if request.method == 'POST':
        form = EditReplyForm(request.POST, instance=reply)
        if form.is_valid():
            form.save()
            return redirect('groupDetail', group_id=reply.comment.post.group.id)
    else:
        form = EditReplyForm(instance=reply)

    return render(request, 'chema/edit_reply.html', {'form': form, 'reply': reply})



def group_detail_view(request, group_id):
    group = get_object_or_404(Group, pk=group_id)
    
    # Check if the user is a member of the group
    membership = GroupMembership.objects.filter(group=group, member=request.user.profile).first()
    if not membership:
         messages.error(request, "You must be a member to view this group.")
         return redirect('home')

    deceased = Deceased.objects.filter(group=group).annotate(
        total_raised=Sum('member_deceased__amount')
    ).order_by('-date')
    
    # Get all managers (admins and moderators)
    group_managers = group.members.filter(
        Q(groupmembership__is_admin=True) | 
        Q(groupmembership__role__in=['admin', 'moderator'])
    ).distinct()

    is_manager = membership.is_admin or membership.role in ['admin', 'moderator'] or group.creator == request.user or group.admin == request.user.profile

    context = {
        'group': group,
        'group_managers': group_managers,
        'is_manager': is_manager,
        'members': group.members.all(),
        'count_members': group.members.count(),
        'count_managers': group_managers.count(),
        'deceased': deceased,
    }

    return render(request, 'chema/group_detail_view.html', context)


from django.db.models import Q, Count

def search_view(request):
    query = request.GET.get('q', '')
    
    if request.headers.get('HX-Request'):
        groups = Group.objects.filter(Q(name__icontains=query) | Q(members__user__email__icontains=query) | Q(members__first_name__icontains=query) | Q(members__surname__icontains=query)).distinct()
        profiles = Profile.objects.filter(Q(user__email__icontains=query) | Q(first_name__icontains=query) | Q(surname__icontains=query))
        
        context = {
            'groups': groups,
            'profiles': profiles,
            'query': query
        }
        return render(request, 'chema/partials/search_results.html', context)

    # Fallback for non-HTMX (or keep existing JSON logic if needed, but HTMX is preferred)
    # Keeping JSON for now just in case, but using the new query logic
    results = (
        list(Group.objects.filter(Q(name__icontains=query) | Q(members__user__email__icontains=query) | Q(members__first_name__icontains=query) | Q(members__surname__icontains=query)).distinct().values()) +
        list(Profile.objects.filter(Q(user__email__icontains=query) | Q(first_name__icontains=query) | Q(surname__icontains=query)).values())
    )
    return JsonResponse({'results': results})


def member_detail(request, group_id, member_id):
    group = get_object_or_404(Group, id=group_id)
    member = get_object_or_404(Profile, id=member_id)
    
    # Get the specific membership for this group
    membership = get_object_or_404(GroupMembership, group=group, member=member)
    
    # Check permissions for editing
    current_membership = GroupMembership.objects.filter(group=group, member=request.user.profile).first()
    is_admin = False
    if current_membership:
        is_admin = current_membership.is_admin or current_membership.role in ['admin', 'moderator'] or group.creator == request.user

    deceased = Deceased.objects.filter(deceased_id=member_id, group_id=group_id)
    contribution = Contribution.objects.filter(contributing_member=member_id, group__is_active=True)
    groups = member.groups.all()
    bio = member.bio
    phone = member.phone
    dependents = member.dependent_set.all()
      
    context = {
        'object': member,
        'groups': groups,
        'bio': bio,
        'phone': phone,
        'dependents': dependents,
        'group': group,
        'member': member,
        'membership': membership,  # Pass membership for date_joined, role, status
        'is_admin': is_admin,      # Pass permission flag
        'deceased': deceased,   
        'contribution': contribution,
        'role_choices': GroupMembership.ROLE_CHOICES,
        'status_choices': GroupMembership.STATUS_CHOICES,
    }
    
    if request.headers.get('HX-Request'):
        return render(request, 'chema/partials/member_detail_modal.html', context)

    return render(request, 'chema/member_detail.html', context)


@login_required
def update_member_attribute(request, group_id, member_id):
    if request.method != 'POST':
        return HttpResponse(status=405)
        
    group = get_object_or_404(Group, id=group_id)
    member = get_object_or_404(Profile, id=member_id)
    membership = get_object_or_404(GroupMembership, group=group, member=member)
    
    # Verify permission
    current_membership = GroupMembership.objects.filter(group=group, member=request.user.profile).first()
    is_admin = current_membership and (current_membership.is_admin or current_membership.role in ['admin', 'moderator'] or group.creator == request.user or group.admin == request.user.profile)
    
    if not is_admin:
        return HttpResponse(status=403)
    
    field = request.POST.get('field')
    value = request.POST.get('value')
    
    if field == 'role':
        membership.role = value
        # Sync is_admin flag if role involves admin privileges
        if value in ['admin', 'moderator']:
            membership.is_admin = True
        else:
            membership.is_admin = False
    elif field == 'status':
        membership.status = value
    elif field == 'is_deceased':
        # value will be 'on' if checked, or custom 'true'/'false' depending on how we send it
        membership.is_deceased = (value == 'true' or value == 'on')
    
    membership.save()
    
    # Return a success indicator or toast
    # For simplicity, we just return a 200 OK. HTMX can just keep the current state or show a success message via HX-Trigger
    response = HttpResponse(status=200)
    response['HX-Trigger'] = 'memberUpdated' # Optional: trigger client-side event
    return response




@login_required
def group_discovery(request):
    """Page for users to discover, join, or create groups."""
    return render(request, 'chema/group_discovery.html')


@login_required
def my_groups(request):
    """Page showing the user's groups with HTMX tab support."""
    user = request.user.profile
    switch_id = request.GET.get('switch_id')
    
    # Handle group switching via tabs
    if switch_id:
        request.session['active_group_id'] = int(switch_id)
        # Ensure membership is marked as active if it wasn't
        GroupMembership.objects.filter(member=user, group_id=switch_id).update(is_active=True)

    groups = user.groups.all()
    # Find active group from session or fallback to first active membership
    active_group_id = request.session.get('active_group_id')
    active_membership = None
    
    if active_group_id:
        active_membership = GroupMembership.objects.filter(member=user, group_id=active_group_id, is_active=True).first()
    
    if not active_membership:
        active_membership = GroupMembership.objects.filter(member=user, is_active=True).first()
    
    if not active_membership and groups.exists():
        active_membership = GroupMembership.objects.filter(member=user).first()
        if active_membership:
            active_membership.is_active = True
            active_membership.save()
            request.session['active_group_id'] = active_membership.group.id
            
    active_group = active_membership.group if active_membership else None
    admins_as_members = active_group.get_admins() if active_group else []
    
    context = {
        'groups': groups,
        'active_group': active_group,
        'admins_as_members': admins_as_members,
    }

    if request.headers.get('HX-Request'):
        return render(request, 'chema/partials/my_groups_content.html', context)
        
    return render(request, 'chema/my_groups.html', context)


@login_required
def group_list(request):
    """List all groups for users to browse and join."""
    groups = Group.objects.all().annotate(member_count=Count('members'))
    groups = Group.objects.select_related(
        'admin', 
        'admin__user'
    ).annotate(member_count=Count('members'))
    return render(request, 'chema/group_list.html', {'groups': groups})

@login_required
def toggle_group(request, group_id):
    user = request.user.profile
    # Get the membership being toggled
    membership = get_object_or_404(GroupMembership, member=user, group_id=group_id)
    
    # Store in session
    request.session['active_group_id'] = int(group_id)
    
    # Ensure this membership is active
    membership.is_active = True
    membership.save()

    # If HTMX request, return the updated content instead of redirecting
    if request.headers.get('HX-Request'):
        # Fetch the updated data for the new active group
        active_group = membership.group
        active_group_posts = Post.objects.filter(group=active_group).order_by('-created_at')
        active_group_comments = Comment.objects.filter(post__in=active_group_posts).order_by('-created_at')
        
        group_data = {
            'group': active_group,
            'minimized': not (active_group_posts.exists() or active_group_comments.exists()),
            'posts': active_group_posts[:5],
            'comments': active_group_comments,
            'admins_as_members': active_group.get_admins(),
        }
        
        for comment in group_data['comments']:
            comment.replies.set(Reply.objects.filter(comment=comment).order_by('-created_at')[:3])
        
        context = {
            'group_data': group_data,
            'active_group': active_group,
            'active_group_posts': active_group_posts,
            'active_group_comments': active_group_comments,
            'contributions': Contribution.objects.filter(deceased_member_id__contributions_open=True, group=active_group),
            'admins_as_members': active_group.get_admins(),
            'deceased': Deceased.objects.filter(group=active_group),
        }
        
        return render(request, 'chema/home.html', context)

    # If not HTMX, redirect back to where we came from, or home as fallback
    referer = request.META.get('HTTP_REFERER')
    return redirect(referer if referer else 'home')


import csv

def upload_csv(request):
    if request.method == 'POST':
        form = UploadFileForm(request.POST, request.FILES)
        if form.is_valid():
            csv_file = request.FILES['file']
            file_data = csv_file.read().decode("utf-8")
            lines = file_data.split("\n")

            for line in lines: 
                fields = line.split(',')
                if len(fields) > 1:
                    username = fields[0]
                    email = fields[1]
                    password1 = fields[2]
                    password2 = fields[3]

                    if password1 == password2:
                        # CustomUser expects email as the first argument in create_user
                        CustomUser.objects.create_user(email=email, password=password1)
                    else:
                        return HttpResponse('Passwords do not match for user {}'.format(email), status=400)

            return HttpResponse('Data uploaded successfully')
        else:
            return HttpResponse('Invalid form', status=400)
    else:
        form = UploadFileForm()
        return render(request, 'chema/upload_csv.html', {'form': form})


@login_required
def group_members_table(request, group_id):
    group = get_object_or_404(Group, pk=group_id)
    
    # Check if user is member
    if request.user.profile not in group.members.all():
         messages.error(request, "You must be a member to view the members list.")
         return redirect('home')

    # Get memberships to access role and status
    memberships = GroupMembership.objects.filter(group=group).select_related('member', 'member__user').order_by('member__first_name')
    
    # Check permissions for editing
    current_membership = GroupMembership.objects.filter(group=group, member=request.user.profile).first()
    is_admin = False
    if current_membership:
        is_admin = current_membership.is_admin or current_membership.role in ['admin', 'moderator'] or group.creator == request.user or group.admin == request.user.profile
    
    # Implement Pagination
    from django.core.paginator import Paginator
    paginator = Paginator(memberships, 10) # Show 10 members per page
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    
    context = {
        'group': group,
        'page_obj': page_obj, # Pass page_obj instead of full memberships
        'memberships': page_obj, # Keep memberships key for compatibility if needed, but page_obj is iterable
        'is_admin': is_admin,
        'role_choices': GroupMembership.ROLE_CHOICES,
        'status_choices': GroupMembership.STATUS_CHOICES,
    }
    
    if request.headers.get('HX-Request'):
        return render(request, 'chema/partials/group_members_table_content.html', context)
    
    return render(request, 'chema/group_members_table.html', context)





    


       
   
    
    
    