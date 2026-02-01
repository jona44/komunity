from django.http import HttpResponse
from django.db.models import Sum, Q
from django.shortcuts import render, get_object_or_404, redirect
from condolence.forms import *
from .models import *
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from chema.models import *




def create_contribution(request):
    if request.method == 'POST':
        form = ContributionForm(request.POST)
        if form.is_valid():
            current_group = Group.objects.get(is_active=True)
            # group_admin = current_group.admin  # Unused variable
            
            # Check if user is part of AdminGroup or is admin of the current group
            # Simplifying permission check based on previous pattern
            is_admin = False
            try:
                profile = request.user.profile
                membership = GroupMembership.objects.get(group=current_group, member=profile)
                is_admin = membership.is_admin or membership.role in ['admin', 'moderator']
            except GroupMembership.DoesNotExist:
                pass

            if not is_admin and not request.user.groups.filter(name="Admin").exists():
               msg = "You are not an admin of this group."
               messages.error(request, msg)
               if request.headers.get('HX-Request'):
                   form.add_error(None, msg)
                   return render(request, 'condolence/partials/contribution_form_content.html', {'form': form})
               return redirect('home')
            
            amount = form.cleaned_data['amount']
            deceased_member = form.cleaned_data['deceased_member']
            contributing_member = form.cleaned_data['contributing_member']
            
            contribution = Contribution(
                group=current_group,
                amount=amount,
                contributing_member=contributing_member,
                group_admin=request.user.profile,
                deceased_member=deceased_member
            )
            contribution.save()
            
            messages.success(request, "Contribution recorded successfully.")
            
            if request.headers.get('HX-Request'):
                # Return the detail partial to be swapped into the modal
                response = render(request, 'condolence/partials/contribution_detail_partial.html', {'contribution': contribution})
                response['HX-Trigger'] = 'contributionRecorded'
                return response

            return redirect('contribution_detail', contribution.id)
        else:
             if request.headers.get('HX-Request'):
                context = {'form': form}
                # Try to recover deceased name if it was submitted/hidden
                if 'deceased_member' in form.data:
                    try:
                        context['deceased_name'] = str(Deceased.objects.get(id=form.data['deceased_member']))
                    except (Deceased.DoesNotExist, ValueError):
                        pass
                return render(request, 'condolence/partials/contribution_form_content.html', context)

    else:
        deceased_id = request.GET.get('deceased_id')
        initial_data = {}
        deceased_name = None
        if deceased_id:
            initial_data['deceased_member'] = deceased_id
            try:
                # Assuming Deceased model has appropriate __str__ returning the name
                deceased_name = str(Deceased.objects.get(id=deceased_id))
            except (Deceased.DoesNotExist, ValueError):
                pass
            
        form = ContributionForm(initial=initial_data)
        
    if request.headers.get('HX-Request'):
        context = {'form': form}
        if 'deceased_name' in locals() and deceased_name:
            context['deceased_name'] = deceased_name
        return render(request, 'condolence/partials/contribution_form_content.html', context)

    return render(request, 'condolence/create_contribution.html', {'form': form})



def test_form(request):
    """Test view to debug form rendering"""
    form = ContributionForm()
    return render(request, 'condolence/test_form.html', {'form': form})


def contribution_detail(request, contribution_id):
    contribution = get_object_or_404(Contribution, id=contribution_id)
    # Get the deceased members related to this contribution
    context = {
        'contribution': contribution,
        }

    if request.headers.get('HX-Request'):
        return render(request, 'condolence/partials/contribution_detail_modal.html', context)

    return render(request, 'condolence/contribution_detail.html', context)




def deceased(request):
    active_group = Group.objects.filter(is_active=True).first()
    group_admin = Profile.objects.filter(groupmembership__is_admin=True, groups=active_group)

    if request.method == "POST":
        form = DeceasedForm(request.POST, active_group=active_group)
        if form.is_valid():
            
            deceased_obj = form.save(commit=False)
            deceased_obj.group = active_group
            deceased_obj.group_admin = request.user.profile
            deceased_obj.save()
            
            # Correct field name is 'deceased' which links to Profile
            member_profile = deceased_obj.deceased

            # LAYER 1: Global truth (only if not already set)
            if not member_profile.is_deceased:
                member_profile.is_deceased = True
                member_profile.save()

            # LAYER 2 + 3: Group-specific workflow
            # Use GroupMembership, ensuring singular get provided active_group and member_profile
            membership = GroupMembership.objects.get(
                group=active_group,
                member=member_profile
            )
            
            # Update local group status
            membership.is_deceased = True
            # membership.contribution_opened = True  # Field does not exist on GroupMembership
            membership.save()

            messages.success(request, "Group member has been marked as deceased and contributions opened.")

            # HTMX handling
            if request.headers.get('HX-Request'):
                return HttpResponse(status=200)

            return redirect('group_detail_view', active_group.id)

        else:
            if request.headers.get('HX-Request'):
                context = {'deceased_form': form, 'active_group': active_group}
                return render(request, 'condolence/partials/deceased_modal.html', context)

    else:
        form = DeceasedForm(active_group=active_group)

    context = {'deceased_form': form, 'active_group': active_group}

    if request.headers.get('HX-Request'):
        return render(request, 'condolence/partials/deceased_modal.html', context)

    return render(request, 'condolence/deceased.html', context)



def toggle_deceased(request, deceased_id):
    # Get the deceased being toggled
    deceased_to_toggle = get_object_or_404(Deceased, id=deceased_id)
    
    # Toggle the deceased by setting it to True
    deceased_to_toggle.contributions_open = True
    deceased_to_toggle.save()

    # Deactivate all other deceased
    Deceased.objects.exclude(id=deceased_id).update(contributions_open=False)

    return redirect('home')



def stop_contributions(request, deceased_id):
    # Get the Deceased instance
    deceased = get_object_or_404(Deceased, pk=deceased_id)

    # Call the method to stop contributions
    deceased.stop_contributions()

    # Return a JSON response indicating success
    return HttpResponse('<h1>Contributions for This Deceased Member Closed</h2>')


def filter_contributions(request, deceased_id=None):
    mode = request.GET.get('mode')
    status_filter = request.GET.get('status', 'all')
    
    # Common: Calculate Total Amount (Always needed for OOB)
    if deceased_id and deceased_id != 'all':
        base_contributions = Contribution.objects.filter(deceased_member_id=deceased_id)
    else:
        base_contributions = Contribution.objects.filter(
            deceased_member__group__is_active=True,
            deceased_member__contributions_open=True
        )
    total_amount = base_contributions.aggregate(Sum('amount'))['amount__sum'] or 0

    # Detailed Mode Logic (When deceased is selected and mode is requested)
    if mode == 'detailed' and deceased_id and deceased_id != 'all':
        active_group = Group.objects.filter(is_active=True).first() # Should get this more robustly ideally
        # Get all members of the active group
        all_members = Profile.objects.filter(groups=active_group)
        
        # Get contributions for this deceased person, indexed by member ID
        contributions_map = {
            c.contributing_member_id: c 
            for c in base_contributions
        }
        
        members_data = []
        for member in all_members:
            contribution = contributions_map.get(member.id)
            is_paid = contribution is not None
            
            # Filter Logic
            if status_filter == 'paid' and not is_paid: continue
            if status_filter == 'unpaid' and is_paid: continue
            
            members_data.append({
                'member': member,
                'is_paid': is_paid,
                'amount': contribution.amount if contribution else 0,
                'date': contribution.contribution_date if contribution else None
            })
            
        context = {
            'members_data': members_data,
            'deceased_id': deceased_id,
            'filter_status': status_filter,
            'total_amount': total_amount # For OOB
        }
        return render(request, 'condolence/partials/member_status_list.html', context)

    # Standard List Logic
    if deceased_id and deceased_id != 'all':
        contributions = base_contributions.order_by('-contribution_date')
    else:
        contributions = base_contributions.order_by('-contribution_date')
        
    context = {
        'contributions': contributions,
        'total_amount': total_amount,
        'deceased_id': deceased_id,
        'show_detail_toggle': bool(deceased_id and deceased_id != 'all') # Flag to show button
    }
    return render(request, 'condolence/partials/contributions_list.html', context)


def search_contributions(request):
    query = request.GET.get('q', '')
    
    if query:
        contributions = Contribution.objects.filter(
            Q(contributing_member__first_name__icontains=query) |
            Q(contributing_member__last_name__icontains=query) |
            Q(deceased_member__deceased__first_name__icontains=query) |
            Q(deceased_member__deceased__last_name__icontains=query) |
            Q(amount__icontains=query) 
        ).filter(
            deceased_member__group__is_active=True, 
            deceased_member__contributions_open=True
        ).distinct().order_by('-contribution_date')
    else:
        contributions = Contribution.objects.none()

    total_amount = contributions.aggregate(Sum('amount'))['amount__sum'] or 0
    
    context = {
        'contributions': contributions,
        'total_amount': total_amount,
        'is_search': True,
        'query': query,
    }
    
    return render(request, 'condolence/partials/contributions_list.html', context)


@login_required
def contributions_list(request):
    """Page showing the list of contributions."""
    active_group = Group.objects.filter(is_active=True).first()
    deceased = Deceased.objects.filter(group=active_group)
    contributions = Contribution.objects.filter(group=active_group).order_by('-contribution_date')
    total_contributions = contributions.aggregate(Sum('amount'))['amount__sum'] or 0
    
    context = {
        'active_group': active_group,
        'deceased': deceased,
        'contributions': contributions,
        'total_contributions': total_contributions,
    }
    return render(request, 'condolence/contributions_page.html', context)