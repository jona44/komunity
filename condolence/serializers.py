from rest_framework import serializers
from .models import Contribution, Deceased
from user.serializers import ProfileSerializer
from chema.serializers import GroupSerializer

class DeceasedSerializer(serializers.ModelSerializer):
    deceased_detail = ProfileSerializer(source='deceased', read_only=True)
    group_detail = GroupSerializer(source='group', read_only=True)
    beneficiary_detail = ProfileSerializer(source='beneficiary', read_only=True)
    total_raised = serializers.SerializerMethodField()
    total_disbursed = serializers.SerializerMethodField()
    balance = serializers.SerializerMethodField()

    class Meta:
        model = Deceased
        fields = [
            'id', 'deceased', 'deceased_detail', 'group', 'group_detail', 
            'date', 'contributions_open', 'cont_is_active', 'total_raised',
            'beneficiary', 'beneficiary_detail', 'funds_disbursed',
            'total_disbursed', 'balance'
        ]

    def get_total_raised(self, obj):
        return obj.get_total_raised()

    def get_total_disbursed(self, obj):
        return obj.get_total_disbursed()

    def get_balance(self, obj):
        return obj.get_balance()

class ContributionSerializer(serializers.ModelSerializer):
    contributing_member_detail = ProfileSerializer(source='contributing_member', read_only=True)
    deceased_member_detail = DeceasedSerializer(source='deceased_member', read_only=True)

    class Meta:
        model = Contribution
        fields = [
            'id', 'group', 'deceased_member', 'deceased_member_detail',
            'contributing_member', 'contributing_member_detail', 
            'group_admin', 'amount', 'payment_method', 'contribution_date'
        ]
