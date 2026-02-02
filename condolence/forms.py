from django import forms
from .models import *
from chema.models import *


class ContributionForm(forms.ModelForm):
    class Meta:
        model = Contribution
        fields = ['contributing_member', 'amount', 'deceased_member', 'payment_method']
        widgets = {
            'contributing_member': forms.Select(attrs={
                'class': 'select select-bordered w-full bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
            }),
            'deceased_member': forms.Select(attrs={
                'class': 'select select-bordered w-full bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
            }),
            'amount': forms.NumberInput(attrs={
                'class': 'input input-bordered w-full pl-8 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500',
                'step': '0.01',
                'placeholder': '100.00'
            }),
            'payment_method': forms.Select(attrs={
                'class': 'select select-bordered w-full bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
            }),
        }

    def __init__(self, *args, **kwargs):
        # Pop custom kwargs before calling super
        active_group = kwargs.pop('active_group', None)
        
        super(ContributionForm, self).__init__(*args, **kwargs)
        
        # If no active group provided, try to get one
        if not active_group:
            active_group = Group.objects.filter(is_active=True).first()
        
        if active_group:
            # Filter deceased members to only those in the active group with open contributions
            self.fields['deceased_member'].queryset = Deceased.objects.filter(
                group=active_group, 
                cont_is_active=True
            )
            # Filter contributing members to active group members only
            self.fields['contributing_member'].queryset = active_group.members.all()
        else:
            # Fallback: no members available
            self.fields['deceased_member'].queryset = Deceased.objects.none()
            self.fields['contributing_member'].queryset = Profile.objects.none()
        
        # If deceased_member is passed in initial, we might want to hide it or make it readonly
        if 'deceased_member' in kwargs.get('initial', {}):
            deceased_id = kwargs['initial']['deceased_member']
            # We can change the widget to HiddenInput
            # But we still want to show WHO it is for.
            # A common pattern is to set it as a hidden field and show the name in the template,
            # OR just trust the user sees the pre-selection.
            # The request was "1 less field to select", so hidden is appropriate if we want to enforce it.
            # Let's make it a HiddenInput but ensure the ID is valid.
            self.fields['deceased_member'].widget = forms.HiddenInput()

            # Filter out members who have already contributed for this deceased member within the ACTIVE GROUP
            # Get IDs of members who have contributions for this deceased in this group
            existing_contributor_ids = Contribution.objects.filter(
                deceased_member_id=deceased_id,
                group__is_active=True 
            ).values_list('contributing_member_id', flat=True)

            self.fields['contributing_member'].queryset = self.fields['contributing_member'].queryset.exclude(
                id__in=existing_contributor_ids
            )
        
        # If contributing_member is also passed in initial (Scenario 3), hide it too
        if 'contributing_member' in kwargs.get('initial', {}):
            self.fields['contributing_member'].widget = forms.HiddenInput()



class DeceasedForm(forms.ModelForm):
    class Meta:
        model = Deceased
        fields =['deceased']
        
    def __init__(self, *args, **kwargs):
        active_group = kwargs.pop('active_group', None)
        super(DeceasedForm, self).__init__(*args, **kwargs)
        
        # Filter to show only members of the active group who are not already marked as deceased
        if active_group:
            self.fields['deceased'].queryset = active_group.members.filter(
                groupmembership__is_deceased=False,
                profile_deceased__isnull=True
            ).distinct()
        else:
            self.fields['deceased'].queryset = Profile.objects.none()