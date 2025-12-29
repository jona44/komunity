from django.urls import path
from . import views

urlpatterns = [
    path('create-contribution/', views.create_contribution, name='create_contribution'),
    path('test-form/', views.test_form, name='test_form'),  # Test URL
    path('contribution/<int:contribution_id>/', views.contribution_detail, name='contribution_detail'), 
    # path('contributions_list/', views.contributions_list, name='contributions_list'),
    path('deceased/', views.deceased, name='deceased'),
    path('toggle_deceased/<int:deceased_id>/', views.toggle_deceased, name='toggle_deceased'),
    path('stop_contributions/<int:deceased_id>/', views.stop_contributions, name='stop_contributions'),
    path('filter-contributions/<str:deceased_id>/', views.filter_contributions, name='filter_contributions'),
    path('search-contributions/', views.search_contributions, name='search_contributions'),
]

