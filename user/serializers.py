from rest_framework import serializers
from .models import CustomUser, Profile

class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = [
            'id', 'user', 'first_name', 'surname', 'full_name', 'date_of_birth', 
            'phone', 'profile_picture', 'cultural_background', 
            'religious_affiliation', 'traditional_names', 'bio', 
            'is_complete', 'is_deceased', 'is_active', 'date_of_death'
        ]
        read_only_fields = ['full_name', 'is_complete']

class UserSerializer(serializers.ModelSerializer):
    profile = ProfileSerializer(read_only=True)

    class Meta:
        model = CustomUser
        fields = ['id', 'email', 'profile', 'date_joined']
        read_only_fields = ['date_joined']

class SignupSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = CustomUser
        fields = ['email', 'password']

    def create(self, validated_data):
        user = CustomUser.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password']
        )
        user.is_active = True # Activating by default for mobile API for now
        user.save()
        return user
