import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet as RNStyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import * as Haptics from 'expo-haptics';
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
import PasswordResetScreen from './src/screens/PasswordResetScreen';
import GroupManagementScreen from './src/screens/GroupManagementScreen';
import MemberProfileScreen from './src/screens/MemberProfileScreen';
import MemberListScreen from './src/screens/MemberListScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import GroupWalletScreen from './src/screens/GroupWalletScreen';
import GroupSelectionScreen from './src/screens/GroupSelectionScreen';
import CreateGroupScreen from './src/screens/CreateGroupScreen';
import ContributionsScreen from './src/screens/ContributionsScreen';
import EditGroupScreen from './src/screens/EditGroupScreen';
import ContactsScreen from './src/screens/ContactsScreen';
import AnimatedScreen from './src/components/AnimatedScreen';
import BottomNavBar from './src/components/BottomNavBar';
import TopNavBar from './src/components/TopNavBar';
import client, { setAuthToken, loadToken, clearToken } from './src/api/client';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);
  const [isSigningUp, setIsSigningUp] = React.useState(false);
  const [isResettingPassword, setIsResettingPassword] = React.useState(false);
  const [needsProfileSetup, setNeedsProfileSetup] = React.useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = React.useState(true);
  const [userProfile, setUserProfile] = React.useState<any>(null);
  const [selectedGroup, setSelectedGroup] = React.useState<any>(null);
  const [selectedPost, setSelectedPost] = React.useState<any>(null);
  const [editingPost, setEditingPost] = React.useState<any>(null);
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
  const [isViewingContributions, setIsViewingContributions] = React.useState(false);
  const [editingGroup, setEditingGroup] = React.useState<any>(null);
  const [isInviting, setIsInviting] = React.useState<any>(null); // Group to invite to
  const [activeTab, setActiveTab] = React.useState<'home' | 'discovery' | 'wallet' | 'profile'>('home');

  const url = Linking.useURL();

  const resetSubScreens = React.useCallback(() => {
    setSelectedGroup(null);
    setSelectedPost(null);
    setEditingPost(null);
    setViewingGroupDetails(null);
    setIsCreatingPost(false);
    setViewingWallet(false);
    setIsDiscovering(false);
    setIsManagingGroup(null);
    setViewingMemberProfile(null);
    setIsViewingAllMembers(null);
    setViewingGroupWallet(null);
    setIsViewingContributions(false);
    setEditingGroup(null);
  }, []);

  const handleDeepLink = React.useCallback(async (initialUrl: string | null) => {
    if (!initialUrl) return;
    try {
      const { hostname, path } = Linking.parse(initialUrl);
      console.log('Handling deep link:', { hostname, path });

      // Handle komunity://group/123 or komunity://post/456
      // For some schemes, hostname is the primary segment
      const segment = hostname || path?.split('/')[0];
      const id = path?.includes('/') ? (path.split('/')[1] || path.split('/')[0]) : path;

      if (segment === 'group' && id) {
        const response = await client.get(`groups/${id}/`);
        resetSubScreens();
        setSelectedGroup(response.data);
        setActiveTab('home');
      } else if (segment === 'post' && id) {
        const response = await client.get(`posts/${id}/`);
        resetSubScreens();
        setSelectedPost(response.data);

        // Also fetch/set the group context for the post
        if (response.data.group) {
          const groupRes = await client.get(`groups/${response.data.group}/`);
          setSelectedGroup(groupRes.data);
        }
        setActiveTab('home');
      }
    } catch (error) {
      console.error('Deep link error:', error);
    }
  }, [resetSubScreens]);

  React.useEffect(() => {
    if (url && isLoggedIn && !isCheckingAuth) {
      handleDeepLink(url);
    }
  }, [url, isLoggedIn, isCheckingAuth, handleDeepLink]);

  // Auto-login: try to restore session from secure storage on launch
  React.useEffect(() => {
    const tryAutoLogin = async () => {
      try {
        const token = await loadToken();
        if (token) {
          // Validate the token by fetching the profile
          const response = await client.get('profiles/me/');
          setUserProfile(response.data);
          if (!response.data.is_complete) {
            setNeedsProfileSetup(true);
          }
          setIsLoggedIn(true);
        }
      } catch (error) {
        // Token is invalid or expired — clear it and show login
        console.log('Auto-login failed, showing login screen');
        await clearToken();
      } finally {
        setIsCheckingAuth(false);
      }
    };
    tryAutoLogin();
  }, []);

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

  const handleLogout = async () => {
    console.log('App: Logging out...');
    await clearToken();
    setIsLoggedIn(false);
    setActiveTab('home');
    setSelectedGroup(null);
    setSelectedPost(null);
    setEditingPost(null);
    setViewingGroupDetails(null);
    setIsCreatingPost(false);
    setViewingWallet(false);
    setIsDiscovering(false);
    setIsManagingGroup(null);
    setViewingMemberProfile(null);
    setIsViewingAllMembers(null);
    setViewingGroupWallet(null);
    setNeedsProfileSetup(false);
    setUserProfile(null);
  };

  // Show loading screen while checking for stored token
  if (isCheckingAuth) {
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff' }}>
          <Text style={{ fontSize: 36, fontWeight: 'bold', color: '#2563eb', marginBottom: 16 }}>Komunity</Text>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      </SafeAreaProvider>
    );
  }

  if (!isLoggedIn) {
    if (isSigningUp) {
      return (
        <SignUpScreen
          onSignUpSuccess={handleSignUpSuccess}
          onBackToLogin={() => setIsSigningUp(false)}
        />
      );
    }

    if (isResettingPassword) {
      return (
        <PasswordResetScreen
          onBackToLogin={() => setIsResettingPassword(false)}
        />
      );
    }

    return (
      <LoginScreen
        onLoginSuccess={handleLoginSuccess}
        onShowSignUp={() => setIsSigningUp(true)}
        onForgotPassword={() => setIsResettingPassword(true)}
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
    if (isViewingContributions) return () => setIsViewingContributions(false);
    if (editingGroup) return () => setEditingGroup(null);
    if (viewingMemberProfile) return () => setViewingMemberProfile(null);
    if (isViewingAllMembers) return () => setIsViewingAllMembers(null);
    if (viewingGroupWallet) return () => setViewingGroupWallet(null);
    if (isManagingGroup) return () => setIsManagingGroup(null);
    if (editingPost) return () => setEditingPost(null);
    if (selectedPost) return () => setSelectedPost(null);
    if (isCreatingPost) return () => setIsCreatingPost(false);
    if (viewingGroupDetails) return () => setViewingGroupDetails(null);
    if (selectedGroup) return () => setSelectedGroup(null);
    return undefined;
  };

  const getCurrentTitle = () => {
    if (isCreatingGroup) return 'Create Community';
    if (isViewingContributions) return 'My Contributions';
    if (editingGroup) return 'Edit Community';
    if (viewingMemberProfile) return viewingMemberProfile.member_detail.full_name;
    if (isViewingAllMembers) return 'Community Members';
    if (viewingGroupWallet) return 'Group Wallet';
    if (isManagingGroup) return 'Group Management';
    if (editingPost) return 'Edit Proposal';
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


  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
        <TopNavBar title={getCurrentTitle()} onBack={getCurrentBackAction()} />
        <View style={{ flex: 1, marginBottom: 70 }}>
          {isCreatingGroup ? (
            <AnimatedScreen animation="slideUp">
              <CreateGroupScreen
                onBack={() => setIsCreatingGroup(false)}
                onGroupCreated={(group) => {
                  setIsCreatingGroup(false);
                  setSelectedGroup(group);
                  setActiveTab('home');
                }}
              />
            </AnimatedScreen>
          ) : viewingMemberProfile ? (
            <AnimatedScreen animation="slideRight">
              <MemberProfileScreen
                membership={viewingMemberProfile}
                isAdmin={selectedGroup?.is_admin || isManagingGroup?.is_admin || viewingGroupDetails?.is_admin}
                onBack={() => setViewingMemberProfile(null)}
                onStatusChange={() => { }}
              />
            </AnimatedScreen>
          ) : isViewingAllMembers ? (
            <AnimatedScreen animation="slideRight">
              <MemberListScreen
                group={isViewingAllMembers}
                onBack={() => setIsViewingAllMembers(null)}
                onSelectMember={(membership) => setViewingMemberProfile(membership)}
              />
            </AnimatedScreen>
          ) : viewingGroupWallet ? (
            <AnimatedScreen animation="slideRight">
              <GroupWalletScreen
                group={viewingGroupWallet}
                onBack={() => setViewingGroupWallet(null)}
              />
            </AnimatedScreen>
          ) : isManagingGroup ? (
            <AnimatedScreen animation="slideRight">
              <GroupManagementScreen
                group={isManagingGroup}
                onBack={() => setIsManagingGroup(null)}
                onSelectMember={(membership) => setViewingMemberProfile(membership)}
                onViewWallet={() => {
                  setViewingGroupWallet(isManagingGroup);
                }}
              />
            </AnimatedScreen>
          ) : editingPost ? (
            <AnimatedScreen animation="slideUp">
              <CreatePostScreen
                group={selectedGroup}
                post={editingPost}
                onBack={() => setEditingPost(null)}
                onPostCreated={() => {
                  setEditingPost(null);
                  setSelectedPost(null);
                }}
              />
            </AnimatedScreen>
          ) : selectedPost ? (
            <AnimatedScreen animation="fadeSlide">
              <PostDetailScreen
                post={selectedPost}
                onBack={() => setSelectedPost(null)}
                onEditPost={(post: any) => setEditingPost(post)}
              />
            </AnimatedScreen>
          ) : isCreatingPost ? (
            <AnimatedScreen animation="slideUp">
              <CreatePostScreen
                group={selectedGroup}
                onBack={() => setIsCreatingPost(false)}
                onPostCreated={() => setIsCreatingPost(false)}
              />
            </AnimatedScreen>
          ) : isInviting ? (
            <AnimatedScreen animation="slideUp">
              <ContactsScreen
                groupId={isInviting.id}
                onBack={() => setIsInviting(null)}
              />
            </AnimatedScreen>
          ) : editingGroup ? (
            <AnimatedScreen animation="slideUp">
              <EditGroupScreen
                group={editingGroup}
                onBack={() => setEditingGroup(null)}
                onGroupUpdated={(updatedGroup) => {
                  setEditingGroup(null);
                  if (viewingGroupDetails) setViewingGroupDetails(updatedGroup);
                  if (selectedGroup) setSelectedGroup(updatedGroup);
                }}
              />
            </AnimatedScreen>
          ) : viewingGroupDetails ? (
            <AnimatedScreen animation="slideRight">
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
                onEditGroup={() => {
                  setEditingGroup(viewingGroupDetails);
                }}
                onInvite={() => {
                  setIsInviting(viewingGroupDetails);
                }}
              />
            </AnimatedScreen>
          ) : selectedGroup ? (
            <AnimatedScreen animation="fadeSlide">
              <GroupFeedScreen
                group={selectedGroup}
                onBack={() => setSelectedGroup(null)}
                onSelectPost={(post) => setSelectedPost(post)}
                onCreatePost={() => setIsCreatingPost(true)}
              />
            </AnimatedScreen>
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
                isViewingContributions ? (
                  <AnimatedScreen animation="slideRight">
                    <ContributionsScreen onBack={() => setIsViewingContributions(false)} />
                  </AnimatedScreen>
                ) : (
                  <WalletScreen
                    onBack={() => setActiveTab('home')}
                    onViewContributions={() => setIsViewingContributions(true)}
                  />
                )
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
