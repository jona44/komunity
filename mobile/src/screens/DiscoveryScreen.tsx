import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Image, ActivityIndicator, TouchableOpacity, SafeAreaView, Alert } from 'react-native';
import client from '../api/client';

interface Group {
    id: number;
    name: string;
    description: string;
    cover_image: string | null;
    total_members: number;
    requires_approval: boolean;
}

interface DiscoveryScreenProps {
    onBack: () => void;
    onGroupJoined: () => void;
}

const DiscoveryScreen = ({ onBack, onGroupJoined }: DiscoveryScreenProps) => {
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(true);
    const [joiningId, setJoiningId] = useState<number | null>(null);

    useEffect(() => {
        fetchGroups();
    }, []);

    const fetchGroups = async () => {
        try {
            // Fetch all active groups
            // In a real app, you'd filter out groups the user is already in on the backend
            const response = await client.get('groups/');
            setGroups(response.data);
        } catch (error) {
            console.error('Error fetching discovery groups:', error);
        } finally {
            setLoading(false);
        }
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
            } else {
                Alert.alert('Request Sent', `Your request to join ${group.name} is pending approval.`);
            }

            fetchGroups();
        } catch (error) {
            console.error('Error joining group:', error);
            Alert.alert('Error', 'Failed to join group. Please try again.');
        } finally {
            setJoiningId(null);
        }
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#2563eb" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={groups}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.listContent}
                renderItem={({ item }) => (
                    <View style={styles.groupCard}>
                        {item.cover_image ? (
                            <Image source={{ uri: item.cover_image }} style={styles.coverImage} />
                        ) : (
                            <View style={[styles.coverImage, { backgroundColor: '#e5e7eb' }]} />
                        )}
                        <View style={styles.cardContent}>
                            <Text style={styles.groupName}>{item.name}</Text>
                            <Text style={styles.memberCount}>{item.total_members} members</Text>
                            <Text style={styles.description} numberOfLines={3}>
                                {item.description || 'Connecting community members together.'}
                            </Text>

                            <TouchableOpacity
                                style={[styles.joinButton, joiningId === item.id && styles.buttonDisabled]}
                                onPress={() => handleJoinGroup(item)}
                                disabled={joiningId === item.id}
                            >
                                {joiningId === item.id ? (
                                    <ActivityIndicator size="small" color="#ffffff" />
                                ) : (
                                    <Text style={styles.joinButtonText}>
                                        {item.requires_approval ? 'Request to Join' : 'Join Group'}
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
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
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
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
    listContent: {
        padding: 16,
    },
    groupCard: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        marginBottom: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    coverImage: {
        width: '100%',
        height: 120,
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
        color: '#6b7280',
        marginBottom: 12,
    },
    description: {
        fontSize: 14,
        color: '#4b5563',
        lineHeight: 20,
        marginBottom: 20,
    },
    joinButton: {
        backgroundColor: '#2563eb',
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
    },
    buttonDisabled: {
        backgroundColor: '#93c5fd',
    },
    joinButtonText: {
        color: '#ffffff',
        fontWeight: 'bold',
        fontSize: 16,
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
