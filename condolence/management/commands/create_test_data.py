from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from user.models import Profile
from chema.models import Group, GroupMembership
from condolence.models import Deceased

User = get_user_model()


class Command(BaseCommand):
    help = 'Creates test data for contribution form'

    def handle(self, *args, **kwargs):
        self.stdout.write('Creating test data...')

        # Create or get test users
        user1, created = User.objects.get_or_create(
            email='testuser1@example.com',
            defaults={'is_active': True}
        )
        if created:
            user1.set_password('testpass123')
            user1.save()
            self.stdout.write(self.style.SUCCESS(f'Created user: {user1.email}'))

        user2, created = User.objects.get_or_create(
            email='testuser2@example.com',
            defaults={'is_active': True}
        )
        if created:
            user2.set_password('testpass123')
            user2.save()
            self.stdout.write(self.style.SUCCESS(f'Created user: {user2.email}'))

        user3, created = User.objects.get_or_create(
            email='testuser3@example.com',
            defaults={'is_active': True}
        )
        if created:
            user3.set_password('testpass123')
            user3.save()
            self.stdout.write(self.style.SUCCESS(f'Created user: {user3.email}'))

        # Create or get profiles
        profile1, created = Profile.objects.get_or_create(
            user=user1,
            defaults={
                'first_name': 'John',
                'last_name': 'Doe',
                'phone': '1234567890'
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f'Created profile: {profile1}'))

        profile2, created = Profile.objects.get_or_create(
            user=user2,
            defaults={
                'first_name': 'Jane',
                'last_name': 'Smith',
                'phone': '0987654321'
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f'Created profile: {profile2}'))

        profile3, created = Profile.objects.get_or_create(
            user=user3,
            defaults={
                'first_name': 'Bob',
                'last_name': 'Johnson',
                'phone': '5555555555'
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f'Created profile: {profile3}'))

        # Create or get an active group
        group, created = Group.objects.get_or_create(
            name='Test Group',
            defaults={
                'description': 'A test group for contribution form',
                'is_active': True
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f'Created group: {group.name}'))
        else:
            # Make sure it's active
            group.is_active = True
            group.save()
            self.stdout.write(self.style.WARNING(f'Group already exists: {group.name}, set to active'))

        # Add members to the group
        membership1, created = GroupMembership.objects.get_or_create(
            group=group,
            member=profile1,
            defaults={'is_admin': True, 'role': 'admin'}
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f'Added {profile1} to {group.name} as admin'))

        membership2, created = GroupMembership.objects.get_or_create(
            group=group,
            member=profile2,
            defaults={'is_admin': False, 'role': 'member'}
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f'Added {profile2} to {group.name} as member'))

        membership3, created = GroupMembership.objects.get_or_create(
            group=group,
            member=profile3,
            defaults={'is_admin': False, 'role': 'member'}
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f'Added {profile3} to {group.name} as member'))

        # Create a deceased member
        deceased, created = Deceased.objects.get_or_create(
            deceased=profile3,
            defaults={
                'group': group,
                'group_admin': profile1,
                'contributions_open': True,
                'cont_is_active': True
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f'Created deceased record for {profile3}'))
            # Mark profile as deceased
            profile3.is_deceased = True
            profile3.save()
            # Mark membership as deceased
            membership3.is_deceased = True
            membership3.save()
        else:
            # Make sure it's active
            deceased.cont_is_active = True
            deceased.contributions_open = True
            deceased.save()
            self.stdout.write(self.style.WARNING(f'Deceased record already exists for {profile3}, set to active'))

        self.stdout.write(self.style.SUCCESS('\n=== Test Data Summary ==='))
        self.stdout.write(f'Active Group: {group.name}')
        self.stdout.write(f'Members: {profile1}, {profile2}, {profile3}')
        self.stdout.write(f'Deceased: {profile3}')
        self.stdout.write(self.style.SUCCESS('\nTest data created successfully!'))
        self.stdout.write('You can now test the contribution form.')
