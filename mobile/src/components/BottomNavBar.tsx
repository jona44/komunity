import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface BottomNavBarProps {
    activeTab: 'home' | 'discovery' | 'wallet' | 'profile';
    onTabPress: (tab: 'home' | 'discovery' | 'wallet' | 'profile') => void;
    profilePicture?: string | null;
}

const BottomNavBar = ({ activeTab, onTabPress, profilePicture }: BottomNavBarProps) => {
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            <TouchableOpacity
                style={styles.navItem}
                onPress={() => onTabPress('home')}
            >
                <Text style={[styles.navIcon, activeTab === 'home' && styles.activeIcon]}>🏠</Text>
                <Text style={[styles.navText, activeTab === 'home' && styles.activeText]}>My Groups</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.navItem}
                onPress={() => onTabPress('discovery')}
            >
                <Text style={[styles.navIcon, activeTab === 'discovery' && styles.activeIcon]}>🔍</Text>
                <Text style={[styles.navText, activeTab === 'discovery' && styles.activeText]}>Explore</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.navItem}
                onPress={() => onTabPress('wallet')}
            >
                <Text style={[styles.navIcon, activeTab === 'wallet' && styles.activeIcon]}>💳</Text>
                <Text style={[styles.navText, activeTab === 'wallet' && styles.activeText]}>Wallet</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.navItem}
                onPress={() => onTabPress('profile')}
            >
                {profilePicture ? (
                    <Image
                        source={{ uri: profilePicture }}
                        style={[styles.profilePic, activeTab === 'profile' && styles.activeProfilePic]}
                    />
                ) : (
                    <Text style={[styles.navIcon, activeTab === 'profile' && styles.activeIcon]}>👤</Text>
                )}
                <Text style={[styles.navText, activeTab === 'profile' && styles.activeText]}>Profile</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        backgroundColor: '#ffffff',
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
        paddingTop: 12,
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 10,
    },
    navItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    navIcon: {
        fontSize: 22,
        marginBottom: 4,
        opacity: 0.5,
    },
    activeIcon: {
        opacity: 1,
    },
    navText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#6b7280',
    },
    activeText: {
        color: '#2563eb',
    },
    profilePic: {
        width: 24,
        height: 24,
        borderRadius: 12,
        marginBottom: 4,
        opacity: 0.5,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    activeProfilePic: {
        opacity: 1,
        borderColor: '#2563eb',
    },
});

export default BottomNavBar;
