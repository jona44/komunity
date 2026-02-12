import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, FlatList, StyleSheet, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import client from '../api/client';

interface SearchResult {
    groups: Group[];
    members: Member[];
}

interface Group {
    id: number;
    name: string;
    description: string;
    cover_image: string | null;
    total_members: number;
}

interface Member {
    id: number;
    full_name: string;
    profile_picture: string | null;
    bio: string;
}

interface SearchScreenProps {
    onClose: () => void;
    onSelectGroup: (group: Group) => void;
}

const SearchScreen = ({ onClose, onSelectGroup }: SearchScreenProps) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult>({ groups: [], members: [] });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (query.length > 2) {
                performSearch();
            } else {
                setResults({ groups: [], members: [] });
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [query]);

    const performSearch = async () => {
        setLoading(true);
        try {
            const response = await client.get(`search/?q=${encodeURIComponent(query)}`);
            setResults(response.data);
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setLoading(false);
        }
    };

    const renderGroupItem = ({ item }: { item: Group }) => (
        <TouchableOpacity style={styles.resultItem} onPress={() => onSelectGroup(item)}>
            {item.cover_image ? (
                <Image source={{ uri: item.cover_image }} style={styles.resultImage} />
            ) : (
                <View style={[styles.resultImage, { backgroundColor: '#e5e7eb' }]} />
            )}
            <View style={styles.resultInfo}>
                <Text style={styles.resultName}>{item.name}</Text>
                <Text style={styles.resultSubtext}>{item.total_members} members</Text>
            </View>
            <Text style={{ fontSize: 16, color: '#6b7280' }}>👥</Text>
        </TouchableOpacity>
    );

    const renderMemberItem = ({ item }: { item: Member }) => (
        <View style={styles.resultItem}>
            {item.profile_picture ? (
                <Image source={{ uri: item.profile_picture }} style={styles.resultImageRound} />
            ) : (
                <View style={[styles.resultImageRound, { backgroundColor: '#d1d5db' }]} />
            )}
            <View style={styles.resultInfo}>
                <Text style={styles.resultName}>{item.full_name}</Text>
                <Text style={styles.resultSubtext}>{item.bio || 'No bio'}</Text>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.searchBar}>
                    <Text style={{ fontSize: 18, color: '#6b7280' }}>🔍</Text>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search groups and members..."
                        value={query}
                        onChangeText={setQuery}
                        autoFocus
                    />
                    {query.length > 0 && (
                        <TouchableOpacity onPress={() => setQuery('')}>
                            <Text style={{ fontSize: 16, color: '#9ca3af' }}>✕</Text>
                        </TouchableOpacity>
                    )}
                </View>
                <TouchableOpacity onPress={onClose}>
                    <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#2563eb" />
                </View>
            ) : (
                <View style={styles.resultsContainer}>
                    {(results.groups.length > 0 || results.members.length > 0) ? (
                        <FlatList
                            data={[
                                ...results.groups.map(g => ({ ...g, type: 'group' })),
                                ...results.members.map(m => ({ ...m, type: 'member' }))
                            ]}
                            keyExtractor={(item: any) => `${item.type}-${item.id}`}
                            renderItem={({ item }: { item: any }) => (
                                item.type === 'group' ? renderGroupItem({ item }) : renderMemberItem({ item })
                            )}
                        />
                    ) : (
                        query.length > 2 && (
                            <View style={styles.emptyContainer}>
                                <Text style={styles.emptyText}>No results found.</Text>
                            </View>
                        )
                    )}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
        gap: 12,
        paddingTop: 50, // Safe area fix essentially
    },
    searchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f3f4f6',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 16,
        color: '#111827',
    },
    cancelText: {
        color: '#2563eb',
        fontSize: 16,
        fontWeight: '500',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    resultsContainer: {
        flex: 1,
    },
    resultItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    resultImage: {
        width: 40,
        height: 40,
        borderRadius: 8,
        marginRight: 12,
    },
    resultImageRound: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
    },
    resultInfo: {
        flex: 1,
    },
    resultName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
    },
    resultSubtext: {
        fontSize: 14,
        color: '#6b7280',
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        color: '#9ca3af',
        fontSize: 16,
    },
});

export default SearchScreen;
