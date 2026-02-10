import React from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import GroupFeedScreen from './src/screens/GroupFeedScreen';
import PostDetailScreen from './src/screens/PostDetailScreen';
import GroupDetailScreen from './src/screens/GroupDetailScreen';
import CreatePostScreen from './src/screens/CreatePostScreen';
import WalletScreen from './src/screens/WalletScreen';
import SignUpScreen from './src/screens/SignUpScreen';
import ProfileSetupScreen from './src/screens/ProfileSetupScreen';
import DiscoveryScreen from './src/screens/DiscoveryScreen';
import GroupManagementScreen from './src/screens/GroupManagementScreen';
import MemberProfileScreen from './src/screens/MemberProfileScreen';
import MemberListScreen from './src/screens/MemberListScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import GroupWalletScreen from './src/screens/GroupWalletScreen';
import GroupSelectionScreen from './src/screens/GroupSelectionScreen';
import CreateGroupScreen from './src/screens/CreateGroupScreen';
import BottomNavBar from './src/components/BottomNavBar';
import TopNavBar from './src/components/TopNavBar';
import client, { setAuthToken } from './src/api/client';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);
  const [isSigningUp, setIsSigningUp] = React.useState(false);
  const [needsProfileSetup, setNeedsProfileSetup] = React.useState(false);
  const [userProfile, setUserProfile] = React.useState<any>(null);
  const [selectedGroup, setSelectedGroup] = React.useState<any>(null);
  const [selectedPost, setSelectedPost] = React.useState<any>(null);
  const [viewingGroupDetails, setViewingGroupDetails] = React.useState<any>(null);
  const [isCreatingPost, setIsCreatingPost] = React.useState(false);
  const [viewingWallet, setViewingWallet] = React.useState(false);
  const [isDiscovering, setIsDiscovering] = React.useState(false);
  const [isManagingGroup, setIsManagingGroup] = React.useState<any>(null);
  const [viewingMemberProfile, setViewingMemberProfile] = React.useState<any>(null);
  const [isViewingAllMembers, setIsViewingAllMembers] = React.useState<any>(null);
  const [viewingGroupWallet, setViewingGroupWallet] = React.useState<any>(null);
  const [isChoosingGroup, setIsChoosingGroup] = React.useState(false);
  const [isCreatingGroup, setIsCreatingGroup] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<'home' | 'discovery' | 'wallet' | 'profile'>('home');

  const checkProfileStatus = async () => {
    try {
      const response = await client.get('profiles/me/');
      if (!response.data.is_complete) {
        setNeedsProfileSetup(true);
      } else {
        setNeedsProfileSetup(false);
      }
      setUserProfile(response.data);
    } catch (error) {
      console.error('Error checking profile status:', error);
      // If we can't check, assume it might need setup if it's a new user
    }
  };

  const handleLoginSuccess = async () => {
    await checkProfileStatus();
    setIsLoggedIn(true);
  };

  const handleSignUpSuccess = async () => {
    setNeedsProfileSetup(true);
    setIsLoggedIn(true);
    setIsSigningUp(false);
  };

  const handleLogout = () => {
    console.log('App: Logging out...');
    setAuthToken(null);
    setIsLoggedIn(false);
    setActiveTab('home');
    setSelectedGroup(null);
    setSelectedPost(null);
    setViewingGroupDetails(null);
    setIsCreatingPost(false);
    setViewingWallet(false);
    setIsDiscovering(false);
    setIsManagingGroup(null);
    setViewingMemberProfile(null);
    setIsViewingAllMembers(null);
    setViewingGroupWallet(null);
    setNeedsProfileSetup(false);
  };

  if (!isLoggedIn) {
    if (isSigningUp) {
      return (
        <SignUpScreen
          onSignUpSuccess={handleSignUpSuccess}
          onBackToLogin={() => setIsSigningUp(false)}
        />
      );
    }
    return (
      <LoginScreen
        onLoginSuccess={handleLoginSuccess}
        onShowSignUp={() => setIsSigningUp(true)}
      />
    );
  }

  if (needsProfileSetup) {
    return (
      <SafeAreaProvider>
        <ProfileSetupScreen onComplete={() => {
          setNeedsProfileSetup(false);
          setIsChoosingGroup(true);
        }} />
      </SafeAreaProvider>
    );
  }

  if (isChoosingGroup) {
    return (
      <SafeAreaProvider>
        <GroupSelectionScreen
          onJoin={() => {
            setIsChoosingGroup(false);
            setActiveTab('discovery');
          }}
          onCreate={() => {
            setIsChoosingGroup(false);
            setIsCreatingGroup(true);
          }}
        />
      </SafeAreaProvider>
    );
  }

  const getCurrentBackAction = () => {
    if (isCreatingGroup) return () => setIsCreatingGroup(false);
    if (viewingMemberProfile) return () => setViewingMemberProfile(null);
    if (isViewingAllMembers) return () => setIsViewingAllMembers(null);
    if (viewingGroupWallet) return () => setViewingGroupWallet(null);
    if (isManagingGroup) return () => setIsManagingGroup(null);
    if (selectedPost) return () => setSelectedPost(null);
    if (isCreatingPost) return () => setIsCreatingPost(false);
    if (viewingGroupDetails) return () => setViewingGroupDetails(null);
    if (selectedGroup) return () => setSelectedGroup(null);
    return undefined;
  };

  const getCurrentTitle = () => {
    if (isCreatingGroup) return 'Create Community';
    if (viewingMemberProfile) return viewingMemberProfile.member_detail.full_name;
    if (isViewingAllMembers) return 'Community Members';
    if (viewingGroupWallet) return 'Group Wallet';
    if (isManagingGroup) return 'Group Management';
    if (selectedPost) return 'Discussion';
    if (isCreatingPost) return 'Create Post';
    if (viewingGroupDetails) return 'About Group';
    if (selectedGroup) return selectedGroup.name;

    if (activeTab === 'home') return 'My Groups';
    if (activeTab === 'discovery') return 'Explore';
    if (activeTab === 'wallet') return 'Wallet';
    if (activeTab === 'profile') return 'Profile';
    return 'Komunity';
  };

  const resetSubScreens = () => {
    setSelectedGroup(null);
    setSelectedPost(null);
    setViewingGroupDetails(null);
    setIsCreatingPost(false);
    setViewingWallet(false);
    setIsDiscovering(false);
    setIsManagingGroup(null);
    setViewingMemberProfile(null);
    setIsViewingAllMembers(null);
    setViewingGroupWallet(null);
  };

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
        <TopNavBar title={getCurrentTitle()} onBack={getCurrentBackAction()} />
        <View style={{ flex: 1, marginBottom: 70 }}>
          {isCreatingGroup ? (
            <CreateGroupScreen
              onBack={() => setIsCreatingGroup(false)}
              onGroupCreated={(group) => {
                setIsCreatingGroup(false);
                setSelectedGroup(group);
                setActiveTab('home');
              }}
            />
          ) : viewingMemberProfile ? (
            <MemberProfileScreen
              membership={viewingMemberProfile}
              isAdmin={selectedGroup?.is_admin || isManagingGroup?.is_admin || viewingGroupDetails?.is_admin}
              onBack={() => setViewingMemberProfile(null)}
              onStatusChange={() => { }}
            />
          ) : isViewingAllMembers ? (
            <MemberListScreen
              group={isViewingAllMembers}
              onBack={() => setIsViewingAllMembers(null)}
              onSelectMember={(membership) => setViewingMemberProfile(membership)}
            />
          ) : viewingGroupWallet ? (
            <GroupWalletScreen
              group={viewingGroupWallet}
              onBack={() => setViewingGroupWallet(null)}
            />
          ) : isManagingGroup ? (
            <GroupManagementScreen
              group={isManagingGroup}
              onBack={() => setIsManagingGroup(null)}
              onSelectMember={(membership) => setViewingMemberProfile(membership)}
              onViewWallet={() => {
                setViewingGroupWallet(isManagingGroup);
              }}
            />
          ) : selectedPost ? (
            <PostDetailScreen post={selectedPost} onBack={() => setSelectedPost(null)} />
          ) : isCreatingPost ? (
            <CreatePostScreen
              group={selectedGroup}
              onBack={() => setIsCreatingPost(false)}
              onPostCreated={() => setIsCreatingPost(false)}
            />
          ) : viewingGroupDetails ? (
            <GroupDetailScreen
              group={viewingGroupDetails}
              onBack={() => setViewingGroupDetails(null)}
              onViewFeed={() => {
                setSelectedGroup(viewingGroupDetails);
                setViewingGroupDetails(null); // Clear context when jumping to feed to make feed primary
              }}
              onManage={() => {
                setIsManagingGroup(viewingGroupDetails);
              }}
              onSelectMember={(membership) => setViewingMemberProfile(membership)}
              onViewAllMembers={() => {
                setIsViewingAllMembers(viewingGroupDetails);
              }}
              onViewWallet={() => {
                setViewingGroupWallet(viewingGroupDetails);
              }}
            />
          ) : selectedGroup ? (
            <GroupFeedScreen
              group={selectedGroup}
              onBack={() => setSelectedGroup(null)}
              onSelectPost={(post) => setSelectedPost(post)}
              onCreatePost={() => setIsCreatingPost(true)}
            />
          ) : (
            <View style={{ flex: 1 }}>
              {activeTab === 'home' && (
                <HomeScreen
                  onSelectGroup={(group: any) => setSelectedGroup(group)}
                  onViewGroupDetails={(group: any) => setViewingGroupDetails(group)}
                  onViewWallet={() => setActiveTab('wallet')}
                  onDiscover={() => setActiveTab('discovery')}
                />
              )}
              {activeTab === 'discovery' && (
                <DiscoveryScreen
                  onBack={() => setActiveTab('home')}
                  onGroupJoined={() => setActiveTab('home')}
                />
              )}
              {activeTab === 'wallet' && (
                <WalletScreen onBack={() => setActiveTab('home')} />
              )}
              {activeTab === 'profile' && (
                <ProfileScreen
                  onBack={() => setActiveTab('home')}
                  onLogout={handleLogout}
                  onProfileUpdate={checkProfileStatus}
                />
              )}
            </View>
          )}
        </View>

        <BottomNavBar
          activeTab={activeTab}
          onTabPress={(tab) => {
            resetSubScreens();
            setActiveTab(tab);
          }}
          profilePicture={userProfile?.profile_picture}
        />
      </View>
    </SafeAreaProvider>
  );
}
