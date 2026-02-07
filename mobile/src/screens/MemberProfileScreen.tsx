import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, Image, ScrollView,
    TouchableOpacity, ActivityIndicator, Alert, Dimensions
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import client from '../api/client';

const { width } = Dimensions.get('window');

interface MemberProfileProps {
    membership: any;
    isAdmin: boolean;
    onBack: () => void;
    onStatusChange: () => void;
}

const MemberProfileScreen = ({ membership, isAdmin, onBack, onStatusChange }: MemberProfileProps) => {
    const insets = useSafeAreaInsets();
    const [loading, setLoading] = useState(false);
    const profile = membership.member_detail;

    const handleDeclareDeceased = () => {
        Alert.alert(
            'Declare Deceased',
            `Are you sure you want to declare ${profile.full_name} as deceased? This will initiate the condolence and contribution workflow. This action is sensitive and permanent.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Confirm',
                    onPress: performDeclareDeceased,
                    style: 'destructive'
                }
            ]
        );
    };

    const performDeclareDeceased = async () => {
        setLoading(true);
        try {
            await client.post(`memberships/${membership.id}/declare_deceased/`);
            Alert.alert('Notice Recorded', 'The member has been declared deceased.');
            onStatusChange();
            onBack();
        } catch (error) {
            console.error('Error declaring deceased:', error);
            Alert.alert('Error', 'Failed to record notice. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const InfoRow = ({ label, value }: { label: string, value: string | null }) => (
        <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{label}</Text>
            <Text style={styles.infoValue}>{value || 'Not provided'}</Text>
        </View>
    );

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Text style={styles.backButtonText}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Member Profile</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.profileHero}>
                    <View style={styles.avatarContainer}>
                        {profile.profile_picture ? (
                            <Image source={{ uri: profile.profile_picture }} style={styles.avatar} />
                        ) : (
                            <View style={[styles.avatar, styles.placeholderAvatar]}>
                                <Text style={styles.placeholderInitial}>
                                    {profile.full_name[0].toUpperCase()}
                                </Text>
                            </View>
                        )}
                        {membership.is_deceased && (
                            <View style={styles.deceasedBadge}>
                                <Text style={styles.deceasedBadgeText}>DECEASED</Text>
                            </View>
                        )}
                    </View>
                    <Text style={styles.name}>{profile.full_name}</Text>
                    <View style={styles.roleBadge}>
                        <Text style={styles.roleText}>{membership.role.toUpperCase()}</Text>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Cultural & Spiritual Information</Text>
                    <InfoRow label="Cultural Background" value={profile.cultural_background} />
                    <InfoRow label="Religious Affiliation" value={profile.religious_affiliation} />
                    <InfoRow label="Traditional Names" value={profile.traditional_names} />
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Bio</Text>
                    <Text style={styles.bioText}>{profile.bio || 'This member hasn\'t added a bio yet.'}</Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Membership Details</Text>
                    <InfoRow label="Member Since" value={new Date(membership.date_joined).toLocaleDateString()} />
                    <InfoRow label="Status" value={membership.status} />
                </View>

                {isAdmin && !membership.is_deceased && (
                    <TouchableOpacity
                        style={styles.deceasedButton}
                        onPress={handleDeclareDeceased}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#ffffff" />
                        ) : (
                            <Text style={styles.deceasedButtonText}>Declare Deceased</Text>
                        )}
                    </TouchableOpacity>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f3f4f6',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    backButton: {
        padding: 4,
    },
    backButtonText: {
        fontSize: 24,
        color: '#2563eb',
        fontWeight: 'bold',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
    },
    profileHero: {
        backgroundColor: '#ffffff',
        alignItems: 'center',
        paddingVertical: 30,
        marginBottom: 8,
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 16,
    },
    avatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 4,
        borderColor: '#f3f4f6',
    },
    placeholderAvatar: {
        backgroundColor: '#eff6ff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderInitial: {
        fontSize: 48,
        fontWeight: 'bold',
        color: '#2563eb',
    },
    deceasedBadge: {
        position: 'absolute',
        bottom: 0,
        backgroundColor: '#ef4444',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#ffffff',
    },
    deceasedBadgeText: {
        color: '#ffffff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    name: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 8,
    },
    roleBadge: {
        backgroundColor: '#dbeafe',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 16,
    },
    roleText: {
        color: '#2563eb',
        fontSize: 12,
        fontWeight: 'bold',
    },
    section: {
        backgroundColor: '#ffffff',
        padding: 16,
        marginBottom: 8,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#374151',
        marginBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
        paddingBottom: 8,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    infoLabel: {
        fontSize: 14,
        color: '#6b7280',
    },
    infoValue: {
        fontSize: 14,
        color: '#111827',
        fontWeight: '500',
    },
    bioText: {
        fontSize: 15,
        color: '#4b5563',
        lineHeight: 22,
    },
    deceasedButton: {
        margin: 16,
        backgroundColor: '#ef4444',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: '#ef4444',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    deceasedButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default MemberProfileScreen;
