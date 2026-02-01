
from django.urls import path
from . import views

urlpatterns = [
    path('',views.home, name='home'),
    path('join-existing-group/', views.join_existing_group, name='join_existing_group'),
    path('create_group/', views.create_group, name='create_group'),
    path('edit_group/<int:group_id>/', views.edit_group, name='edit_group'),
    # path('join_group/<int:group_id>/', views.join_group, name='join_group'),    
    # path('groupDetail/<int:group_id>/',views.groupDetail, name='groupDetail'),
    path('join_active_group/', views.join_active_group, name='join_active_group'),
   
    path('createPost/<int:group_id>/', views.create_post, name='createPost'),
    path('edit_post/<int:post_id>/', views.edit_post, name='edit_post'),
    path('delete_post/<int:post_id>/', views.delete_post, name='delete_post'),
    path('approve-post/<int:post_id>/', views.approve_post, name='approve_post'),
    
    path('create_comment/<int:post_id>/', views.create_comment, name='create_comment'),
    path('edit_comment/<int:comment_id>/', views.edit_comment, name='edit_comment'),
    path('delete_comment/<int:comment_id>/', views.delete_comment, name='delete_comment'),
    
    path('choice',views.choice, name ='choice'),
    path('add-dependents/', views.add_dependents, name='add_dependents'),

    
    path('add_reply/<int:comment_id>/', views.add_reply, name='add_reply'),
    path('remove_reply/<int:reply_id>/', views.remove_reply, name='remove_reply'),
    path('edit_reply/<int:reply_id>/', views.edit_reply, name='edit_reply'),
    
    path('member/<int:group_id>/<int:member_id>/', views.member_detail, name='member_detail'),

    path('search/', views.search_view, name='search_view'),
    path('group_detail_view/<int:group_id>/', views.group_detail_view, name='group_detail_view'),    
    path('members-table/<int:group_id>/', views.group_members_table, name='group_members_table'),
    path('update_member_attribute/<int:group_id>/<int:member_id>/', views.update_member_attribute, name='update_member_attribute'),
    path('toggle_group/<int:group_id>/', views.toggle_group, name='toggle_group'),
    
    path('group-discovery/', views.group_discovery, name='group_discovery'),
    path('group-list/', views.group_list, name='group_list'),
    path('my-groups/', views.my_groups, name='my_groups'),
    
    path('upload_csv/', views.upload_csv, name='upload_csv'),
   
 
]
