import os
import random
from django.conf import settings
from django.db import models
from django.urls import reverse
from user.models import Profile

class Group(models.Model):
    name = models.CharField(max_length=100)
    is_active = models.BooleanField(default=True)
    description = models.TextField(null=True, blank=True)
    date = models.DateTimeField(auto_now_add=True)
    cover_image = models.ImageField(upload_to='group_cover_images', null=True, blank=True)
    admin = models.ForeignKey(Profile, on_delete=models.SET_NULL, null=True, blank=True, related_name='admin_groups')
    members = models.ManyToManyField(Profile, through='GroupMembership', related_name='groups')
    
    max_members = models.PositiveIntegerField(null=True, blank=True, help_text="Leave blank for unlimited")
    requires_approval = models.BooleanField(default=False, help_text="New members need approval")
    
    # Ownership
    creator = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='created_groups',null=True, blank=True)
    admins  = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name='admin_groups', blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True,null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)
    def get_admins(self):
        return self.members.filter(groupmembership__is_admin=True)
    
    def get_total_members(self):
        return self.members.count()

    def __str__(self):
        return self.name

    def get_absolute_url(self):
        return reverse('create_post', args=[str(self.id)])

    def is_admin(self, user):
        return user == self.creator or user in self.admins.all()

    def is_member(self, user):
        return self.members.filter(id=user.profile.id, groupmembership__is_active=True).exists()

    def can_join(self, user):
        """Check if user can join this group"""
        if not user.is_authenticated:
            return False, "You must be logged in to join groups"
        
        if self.is_member(user):
            return False, "You're already a member of this group"
        
        if self.privacy == 'closed':
            return False, "This group is closed to new members"
        
        if self.is_full:
            return False, "This group has reached its maximum capacity"
        
        return True, "Can join"    
    
    def save(self, *args, **kwargs):
        if not self.pk:  # Check if this is a new group
            cover_images_dir = os.path.join(settings.STATIC_ROOT, 'group_cover_images')
            cover_images = [os.path.join('group_cover_images', file) for file in os.listdir(cover_images_dir) if file.endswith(('.jpg', '.jpeg', '.png', '.gif'))]
            if cover_images:
                random_cover_image = random.choice(cover_images)
                self.cover_image = random_cover_image
        super().save(*args, **kwargs)




class GroupMembership(models.Model):

    ROLE_CHOICES = [
        ('member', 'Member'),
        ('moderator', 'Moderator'),
        ('admin', 'Admin'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending Approval'),
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('banned', 'Banned'),
    ]
    member      = models.ForeignKey(Profile, on_delete=models.CASCADE)
    group       = models.ForeignKey(Group, on_delete=models.CASCADE)
    is_admin    = models.BooleanField(default=False)
    status   = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    role     = models.CharField(max_length=20, choices=ROLE_CHOICES, default='member')
    date_joined = models.DateTimeField(auto_now_add=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    approved_by = models.ForeignKey( settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,blank=True,related_name='approved_memberships')
    is_active   = models.BooleanField(default=True)
    is_deceased = models.BooleanField(default=False)
    can_post    = models.BooleanField(default=True)
    can_comment = models.BooleanField(default=True)
    join_message = models.TextField(blank=True, help_text="Message when requesting to join")
    
    def __str__(self):
        return f"{self.member.user.username} in {self.group.name}"
    
    def get_is_admin(self):
        return self.is_admin

    def approve(self, approved_by_user):
        """Approve membership"""
        self.status = 'active'
        self.approved_at = timezone.now()
        self.approved_by = approved_by_user
        self.save()

    def is_admin_or_creator(self):
        return (self.role in ['admin', 'moderator'] or 
                self.user == self.group.creator)    


class Post(models.Model):
    author = models.ForeignKey(Profile, on_delete=models.CASCADE, null=True, blank=True)
    group = models.ForeignKey(Group, on_delete=models.CASCADE, null=True, blank=True)
    content = models.TextField()
    image = models.ImageField(upload_to='post_images/', null=True, blank=True)
    video = models.FileField(upload_to='post_videos/', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    approved = models.BooleanField(default=True, null=True, blank=True)

    def __str__(self):
        return f"{self.author.user.username}: {self.content}"



class PostImage(models.Model):
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to='post_images/')
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Image for {self.post.id}"
    
    class Meta:
        ordering = ['uploaded_at']


class Comment(models.Model):
    post = models.ForeignKey(Post, on_delete=models.CASCADE)
    author = models.ForeignKey(Profile, on_delete=models.CASCADE)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.author.user.username}: {self.content}"


class Reply(models.Model):
    author = models.ForeignKey(Profile, on_delete=models.CASCADE, null=True, blank=True)
    comment = models.ForeignKey(Comment, on_delete=models.CASCADE, related_name='replies', null=True, blank=True)
    content = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)

    def __str__(self):
        return f'Reply by {self.author.user.username} -> {self.content}'

    class Meta:
        verbose_name_plural = "Replies"
        
class Dependent(models.Model):
    guardian = models.ForeignKey(Profile, on_delete=models.CASCADE, null=True, blank=True)
    name = models.CharField(max_length=100,null=True, blank=True)
    date_of_birth = models.DateField()
    relationship = models.CharField(max_length=100, null=True, blank=True)
    date_added = models.DateTimeField(auto_now_add=True)
    group = models.ForeignKey(Group, on_delete=models.CASCADE, related_name='dependents',null=True, blank=True)

    def __str__(self):
        return self.name        
