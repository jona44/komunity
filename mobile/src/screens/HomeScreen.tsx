import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Image, ActivityIndicator, TouchableOpacity, SafeAreaView } from 'react-native';
import client from '../api/client';

interface Group {
    id: number;
    name: string;
    description: string;
    cover_image: string | null;
    total_members: number;
    is_selected: boolean;
}

interface HomeScreenProps {
    onSelectGroup: (group: Group) => void;
    onViewGroupDetails?: (group: Group) => void;
    onViewWallet?: () => void;
    onDiscover?: () => void;
}

const HomeScreen = ({ onSelectGroup, onViewGroupDetails, onViewWallet, onDiscover }: HomeScreenProps) => {
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchGroups();
    }, []);

    const fetchGroups = async () => {
        try {
            const response = await client.get('groups/mine/');
            setGroups(response.data);
        } catch (error) {
            console.error('Error fetching groups:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectGroup = async (groupId: number) => {
        try {
            await client.post(`groups/${groupId}/select/`);
            // Refresh groups to reflect selection change
            fetchGroups();
        } catch (error) {
            console.error('Error selecting group:', error);
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
        <SafeAreaView style={styles.container}>
            <View style={styles.headerContainer}>
                <View>
                    <Text style={styles.headerTitle}>My Groups</Text>
                    <TouchableOpacity onPress={onDiscover}>
                        <Text style={styles.discoverLink}>+ Discover Communities</Text>
                    </TouchableOpacity>
                </View>

            </View>
            <FlatList
                data={groups}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.listContent}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={styles.groupCard}
                        onPress={() => onViewGroupDetails?.(item)}
                    >
                        {item.cover_image ? (
                            <Image source={{ uri: item.cover_image }} style={styles.coverImage} />
                        ) : (
                            <View style={[styles.coverImage, { backgroundColor: '#e5e7eb' }]} />
                        )}
                        <View style={styles.cardContent}>
                            <View style={styles.cardHeader}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.groupName}>{item.name}</Text>
                                    <Text style={styles.memberCount}>{item.total_members} members</Text>
                                </View>
                            </View>

                            <Text style={styles.description} numberOfLines={2}>
                                {item.description || 'No description available'}
                            </Text>

                            <View style={styles.actionRow}>
                                <TouchableOpacity
                                    style={[styles.detailsButton, item.is_selected && styles.selectedButton]}
                                    onPress={() => handleSelectGroup(item.id)}
                                >
                                    <Text style={[styles.detailsButtonText, item.is_selected && styles.selectedButtonText]}>
                                        {item.is_selected ? 'Selected' : 'Select'}
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.feedButton}
                                    onPress={() => onSelectGroup(item)}
                                >
                                    <Text style={styles.feedButtonText}>Discussion Feed</Text>
                                    <View style={styles.notificationBadge}>
                                        <Text style={styles.badgeText}>3</Text>
                                    </View>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </TouchableOpacity>
                )}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No groups found.</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerContainer: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    walletHeaderButton: {
        backgroundColor: '#eff6ff',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#dbeafe',
    },
    walletIcon: {
        color: '#2563eb',
        fontWeight: 'bold',
        fontSize: 14,
    },
    discoverLink: {
        color: '#2563eb',
        fontSize: 14,
        fontWeight: '500',
        marginTop: 4,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#111827',
    },
    listContent: {
        padding: 16,
    },
    groupCard: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        marginBottom: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    coverImage: {
        width: '100%',
        height: 140,
    },
    cardContent: {
        padding: 16,
    },
    groupName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 4,
    },
    memberCount: {
        fontSize: 14,
        color: '#6b7280',
        marginBottom: 8,
    },
    description: {
        fontSize: 14,
        color: '#4b5563',
        lineHeight: 20,
        marginBottom: 16,
    },
    actionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    feedButton: {
        backgroundColor: '#eff6ff',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#dbeafe',
    },
    feedButtonText: {
        color: '#2563eb',
        fontWeight: 'bold',
        fontSize: 14,
        marginRight: 6,
    },
    detailsButton: {
        backgroundColor: '#f0fdf4',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        marginRight: 8,
        borderWidth: 1,
        borderColor: '#dcfce7',
    },
    detailsButtonText: {
        color: '#16a34a',
        fontWeight: 'bold',
        fontSize: 14,
    },
    selectedButton: {
        backgroundColor: '#16a34a',
        borderColor: '#16a34a',
    },
    selectedButtonText: {
        color: '#ffffff',
    },
    notificationBadge: {
        backgroundColor: '#ef4444',
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    badgeText: {
        color: '#ffffff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    emptyContainer: {
        marginTop: 60,
        alignItems: 'center',
    },
    emptyText: {
        color: '#9ca3af',
        fontSize: 16,
    },
});

export default HomeScreen;
