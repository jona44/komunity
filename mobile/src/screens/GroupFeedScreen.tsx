import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Dimensions, RefreshControl, Share } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import client from '../api/client';
import { FeedPlaceholder } from '../components/Loaders';

interface Author {
    id: number;
    full_name: string;
    profile_picture: string | null;
}

interface Post {
    id: number;
    author_detail: Author;
    content: string;
    images: { id: number; image: string }[];
    created_at: string;
    comment_count: number;
}

interface GroupFeedProps {
    group: { id: number; name: string };
    onBack: () => void;
    onSelectPost: (post: Post) => void;
    onCreatePost: () => void;
}

const { width } = Dimensions.get('window');

const ImageCarousel = ({ images }: { images: { id: number; image: string }[] }) => {
    const [activeIndex, setActiveIndex] = useState(0);

    const onScroll = (event: any) => {
        const slideSize = event.nativeEvent.layoutMeasurement.width;
        const index = event.nativeEvent.contentOffset.x / slideSize;
        setActiveIndex(Math.round(index));
    };

    return (
        <View style={styles.carouselContainer}>
            <FlatList
                data={images}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.id.toString()}
                onScroll={onScroll}
                renderItem={({ item }) => (
                    <Image
                        source={{ uri: item.image }}
                        style={styles.postImage}
                        transition={200}
                        contentFit="cover"
                    />
                )}
            />
            {images.length > 1 && (
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                        {activeIndex + 1}/{images.length}
                    </Text>
                </View>
            )}
        </View>
    );
};

const GroupFeedScreen = ({ group, onBack, onSelectPost, onCreatePost }: GroupFeedProps) => {
    const insets = useSafeAreaInsets();
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [nextPage, setNextPage] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(true);

    useEffect(() => {
        fetchPosts(1);
        markAsRead();
    }, []);

    const markAsRead = async () => {
        try {
            await client.post(`groups/${group.id}/mark_read/`);
        } catch (error) {
            console.error('Error marking group as read:', error);
        }
    };

    const fetchPosts = async (page: number = 1) => {
        try {
            const response = await client.get(`posts/?group_id=${group.id}&page=${page}`);
            const data = response.data;

            // Handle both paginated { results, next } and flat array responses
            const newPosts = Array.isArray(data) ? data : data.results || [];
            const nextUrl = Array.isArray(data) ? null : data.next;

            if (page === 1) {
                setPosts(newPosts);
            } else {
                setPosts(prev => [...prev, ...newPosts]);
            }
            setNextPage(nextUrl);
            setHasMore(!!nextUrl);
        } catch (error) {
            console.error('Error fetching posts:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
            setLoadingMore(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchPosts(1);
        markAsRead();
    };

    const loadMore = () => {
        if (!hasMore || loadingMore || !nextPage) return;
        setLoadingMore(true);
        // Extract page number from next URL
        const pageMatch = nextPage.match(/page=(\d+)/);
        const page = pageMatch ? parseInt(pageMatch[1]) : 2;
        fetchPosts(page);
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const handleShare = async (post: Post) => {
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            const shareUrl = `komunity://post/${post.id}`;
            await Share.share({
                message: `${post.author_detail.full_name} shared a post in Komunity!\n\n"${post.content}"\n\nView here: ${shareUrl}`,
            });
        } catch (error) {
            console.error('Error sharing:', error);
        }
    };

    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
                <FeedPlaceholder />
            </View>
        );
    }

    return (
        <View style={[styles.container]}>
            <FlatList
                data={posts}
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
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={styles.postCard}
                        onPress={() => onSelectPost(item)}
                        activeOpacity={0.9}
                    >
                        <View style={styles.authorSection}>
                            <View style={styles.avatarCircle}>
                                {item.author_detail.profile_picture ? (
                                    <Image
                                        source={{ uri: item.author_detail.profile_picture }}
                                        style={styles.avatarImage}
                                        transition={200}
                                    />
                                ) : (
                                    <Text style={styles.avatarInitial}>
                                        {(item.author_detail.full_name || 'U')[0].toUpperCase()}
                                    </Text>
                                )}
                            </View>
                            <View style={styles.authorMeta}>
                                <Text style={styles.authorName}>{item.author_detail.full_name}</Text>
                                <Text style={styles.timestamp}>{formatDate(item.created_at)}</Text>
                            </View>
                        </View>

                        <Text style={styles.content}>{item.content}</Text>

                        {/* Multiple Images Carousel */}
                        {item.images && item.images.length > 0 && (
                            <ImageCarousel images={item.images} />
                        )}

                        <View style={styles.footer}>
                            <TouchableOpacity
                                style={styles.footerAction}
                                onPress={() => onSelectPost(item)}
                            >
                                <Text style={styles.footerActionText}>💬 {item.comment_count} comments</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.footerAction} onPress={() => handleShare(item)}>
                                <Text style={styles.footerActionText}>🚀 share</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableOpacity>
                )}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No posts yet. Be the first to share!</Text>
                    </View>
                }
                onEndReached={loadMore}
                onEndReachedThreshold={0.3}
                ListFooterComponent={
                    loadingMore ? (
                        <View style={{ paddingVertical: 20 }}>
                            <ActivityIndicator size="small" color="#2563eb" />
                        </View>
                    ) : null
                }
            />

            <TouchableOpacity
                style={[styles.fab, { bottom: Math.max(insets.bottom, 20) }]}
                onPress={onCreatePost}
                activeOpacity={0.8}
            >
                <Text style={styles.fabIcon}>+</Text>
            </TouchableOpacity>
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
        padding: 12,
    },
    postCard: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        marginBottom: 12,
        padding: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    authorSection: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    avatarCircle: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: '#eff6ff',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
        borderWidth: 1,
        borderColor: '#dbeafe',
        overflow: 'hidden',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    avatarInitial: {
        color: '#2563eb',
        fontWeight: 'bold',
        fontSize: 18,
    },
    authorMeta: {
        flex: 1,
    },
    authorName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    timestamp: {
        fontSize: 12,
        color: '#6b7280',
    },
    content: {
        fontSize: 15,
        color: '#4b5563',
        lineHeight: 22,
        marginBottom: 12,
    },
    carouselContainer: {
        marginHorizontal: -12,
        marginBottom: 12,
        position: 'relative',
    },
    postImage: {
        width: width - 24,
        height: 300,
        backgroundColor: '#f3f4f6',
    },
    badge: {
        position: 'absolute',
        top: 12,
        right: 12,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    badgeText: {
        color: '#ffffff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    footer: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
        paddingTop: 12,
        marginTop: 4,
    },
    footerAction: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 24,
    },
    footerActionText: {
        fontSize: 14,
        color: '#6b7280',
        fontWeight: '500',
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
    fab: {
        position: 'absolute',
        right: 20,
        bottom: 20,
        backgroundColor: '#2563eb',
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    fabIcon: {
        color: '#ffffff',
        fontSize: 32,
        fontWeight: '300',
        marginTop: -2,
    },
});

export default GroupFeedScreen;
