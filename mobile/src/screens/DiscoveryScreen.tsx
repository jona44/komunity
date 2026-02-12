import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, SafeAreaView, Alert, RefreshControl, Share } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import client from '../api/client';
import SearchScreen from './SearchScreen';
import { GroupPlaceholder } from '../components/Loaders';

interface Group {
    id: number;
    name: string;
    description: string;
    cover_image: string | null;
    total_members: number;
    requires_approval: boolean;
    membership_status: 'active' | 'pending' | null;
}

interface DiscoveryScreenProps {
    onBack: () => void;
    onGroupJoined: () => void;
}

const DiscoveryScreen = ({ onBack, onGroupJoined }: DiscoveryScreenProps) => {
    const insets = useSafeAreaInsets();
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchVisible, setSearchVisible] = useState(false);
    const [joiningId, setJoiningId] = useState<number | null>(null);

    useEffect(() => {
        fetchGroups();
    }, []);

    const fetchGroups = async () => {
        try {
            const response = await client.get('groups/discover/');
            setGroups(response.data);
        } catch (error) {
            console.error('Error fetching discovery groups:', error);
            Alert.alert('Error', 'Failed to load discovery communities.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleShareGroup = async (group: Group) => {
        try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            const shareUrl = `komunity://group/${group.id}`;
            await Share.share({
                message: `Check out "${group.name}" on Komunity!\n\n${group.description}\n\nJoin here: ${shareUrl}`,
            });
        } catch (error) {
            console.error('Error sharing group:', error);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchGroups();
    };

    const handleJoinGroup = (group: Group) => {
        Alert.alert(
            'Join Community',
            `Are you sure you want to ${group.requires_approval ? 'request to join' : 'join'} ${group.name}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Confirm',
                    onPress: () => performJoin(group)
                }
            ]
        );
    };

    const performJoin = async (group: Group) => {
        setJoiningId(group.id);
        try {
            const response = await client.post(`groups/${group.id}/join/`);
            const status = response.data.status;

            if (status === 'active') {
                Alert.alert('Welcome!', `You have successfully joined ${group.name}.`);
                onGroupJoined();
            } else if (status === 'pending') {
                Alert.alert('Request Sent', 'Your request to join has been sent to the community admins.');
                fetchGroups();
            }
        } catch (error) {
            console.error('Error joining group:', error);
            Alert.alert('Error', 'Failed to join the community. Please try again.');
        } finally {
            setJoiningId(null);
        }
    };

    const getButtonConfig = (group: Group) => {
        if (group.membership_status === 'active') {
            return {
                label: 'Joined',
                style: styles.joinedButton,
                textStyle: styles.joinedButtonText,
                disabled: true
            };
        }
        if (group.membership_status === 'pending') {
            return {
                label: 'Pending',
                style: styles.pendingButton,
                textStyle: styles.pendingButtonText,
                disabled: true
            };
        }
        return {
            label: group.requires_approval ? 'Request to Join' : 'Join Community',
            style: styles.joinButton,
            textStyle: styles.joinButtonText,
            disabled: false
        };
    };

    if (searchVisible) {
        return (
            <SearchScreen
                onClose={() => setSearchVisible(false)}
                onSelectGroup={(group) => {
                    setSearchVisible(false);
                    handleJoinGroup(group as any);
                }}
            />
        );
    }

    if (loading) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Explore</Text>
                </View>
                <GroupPlaceholder />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: insets.top }]}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Text style={styles.backButtonText}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Discover Communities</Text>
                <TouchableOpacity onPress={() => setSearchVisible(true)} style={styles.searchButton}>
                    <Text style={{ fontSize: 22 }}>🔍</Text>
                </TouchableOpacity>
            </View>
            <FlatList
                data={groups}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={['#2563eb']}
                        tintColor="#2563eb"
                    />
                }
                renderItem={({ item }) => {
                    const btn = getButtonConfig(item);
                    return (
                        <View style={styles.groupCard}>
                            {item.cover_image ? (
                                <Image
                                    source={{ uri: item.cover_image }}
                                    style={styles.coverImage}
                                    transition={200}
                                />
                            ) : (
                                <View style={[styles.coverImage, { backgroundColor: '#e5e7eb' }]} />
                            )}
                            <View style={styles.cardContent}>
                                <Text style={styles.groupName}>{item.name}</Text>
                                <Text style={styles.memberCount}>{item.total_members} members</Text>
                                <Text style={styles.description} numberOfLines={3}>
                                    {item.description || 'Connecting community members together.'}
                                </Text>

                                <View style={styles.actionRow}>
                                    <TouchableOpacity
                                        style={[btn.style, joiningId === item.id && styles.buttonLoading, { flex: 4 }]}
                                        onPress={() => handleJoinGroup(item)}
                                        disabled={btn.disabled || joiningId === item.id}
                                    >
                                        {joiningId === item.id ? (
                                            <ActivityIndicator size="small" color="#ffffff" />
                                        ) : (
                                            <Text style={btn.textStyle}>{btn.label}</Text>
                                        )}
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.shareIconBtn}
                                        onPress={() => handleShareGroup(item)}
                                    >
                                        <Text style={styles.shareIconText}>🚀</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    );
                }}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No new communities found at the moment.</Text>
                    </View>
                }
            />
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
        paddingBottom: 12,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#eff6ff',
        justifyContent: 'center',
        alignItems: 'center',
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
    searchButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        padding: 16,
        paddingBottom: 100,
    },
    groupCard: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        marginBottom: 16,
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    coverImage: {
        width: '100%',
        height: 140,
    },
    cardContent: {
        padding: 16,
    },
    groupName: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 4,
    },
    memberCount: {
        fontSize: 14,
        color: '#3b82f6',
        fontWeight: '600',
        marginBottom: 8,
    },
    description: {
        fontSize: 14,
        color: '#6b7280',
        marginBottom: 16,
        lineHeight: 20,
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    shareIconBtn: {
        flex: 1,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#f3f4f6',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    shareIconText: {
        fontSize: 20,
    },
    // Join button (default — not yet a member)
    joinButton: {
        backgroundColor: '#2563eb',
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: '#2563eb',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    joinButtonText: {
        color: '#ffffff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    // Already joined
    joinedButton: {
        backgroundColor: '#f0fdf4',
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#22c55e',
    },
    joinedButtonText: {
        color: '#16a34a',
        fontWeight: 'bold',
        fontSize: 16,
    },
    // Pending approval
    pendingButton: {
        backgroundColor: '#fffbeb',
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#f59e0b',
    },
    pendingButtonText: {
        color: '#d97706',
        fontWeight: 'bold',
        fontSize: 16,
    },
    buttonLoading: {
        backgroundColor: '#93c5fd',
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        color: '#9ca3af',
        fontSize: 16,
        textAlign: 'center',
    },
});

export default DiscoveryScreen;
