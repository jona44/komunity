import React, { useEffect, useState } from 'react';
import {
    View, Text, FlatList, StyleSheet, Image,
    ActivityIndicator, TouchableOpacity, SafeAreaView,
    Dimensions, ScrollView, TextInput, KeyboardAvoidingView, Platform, Alert
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import client from '../api/client';

const { width } = Dimensions.get('window');

interface Author {
    id: number;
    full_name: string;
    profile_picture: string | null;
}

interface ImageType {
    id: number;
    image: string;
}

interface Reply {
    id: number;
    author_detail: Author;
    content: string;
    created_at: string;
}

interface Comment {
    id: number;
    author_detail: Author;
    content: string;
    created_at: string;
    replies: Reply[];
}

interface Post {
    id: number;
    author_detail: Author;
    content: string;
    images: ImageType[];
    created_at: string;
    comment_count: number;
    likes_count: number;
    has_liked: boolean;
}

interface PostDetailProps {
    post: Post;
    onBack: () => void;
}

const PostDetailScreen = ({ post, onBack }: PostDetailProps) => {
    const insets = useSafeAreaInsets();
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(true);
    const [newComment, setNewComment] = useState('');
    const [activeImageIndex, setActiveImageIndex] = useState(0);
    const [postLikes, setPostLikes] = useState(post.likes_count);
    const [hasLiked, setHasLiked] = useState(post.has_liked);
    const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
    const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);

    useEffect(() => {
        fetchComments();
        fetchCurrentUser();
    }, []);

    const fetchCurrentUser = async () => {
        try {
            const response = await client.get('profiles/me/');
            setCurrentUserProfile(response.data);
        } catch (error) {
            console.error('Error fetching current user:', error);
        }
    };

    const handleDeletePost = () => {
        Alert.alert(
            'Delete Post',
            'Are you sure you want to permanently delete this post?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    onPress: performDelete,
                    style: 'destructive'
                }
            ]
        );
    };

    const performDelete = async () => {
        try {
            await client.delete(`posts/${post.id}/`);
            Alert.alert('Deleted', 'Your post has been removed.');
            onBack();
        } catch (error) {
            console.error('Error deleting post:', error);
            Alert.alert('Error', 'Failed to delete post. Please try again.');
        }
    };

    const handleLike = async () => {
        try {
            const response = await client.post(`posts/${post.id}/like/`);
            setPostLikes(response.data.likes_count);
            setHasLiked(response.data.liked);
        } catch (error) {
            console.error('Error liking post:', error);
        }
    };

    const fetchComments = async () => {
        try {
            const response = await client.get(`comments/?post_id=${post.id}`);
            setComments(response.data);
        } catch (error) {
            console.error('Error fetching comments:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSendComment = async () => {
        if (!newComment.trim()) return;
        try {
            if (replyingTo) {
                await client.post('replies/', {
                    comment: replyingTo.id,
                    content: newComment
                });
                setReplyingTo(null);
            } else {
                await client.post('comments/', {
                    post: post.id,
                    content: newComment
                });
            }
            fetchComments();
            setNewComment('');
        } catch (error) {
            console.error('Error sending comment:', error);
        }
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const onScroll = (event: any) => {
        const slideSize = event.nativeEvent.layoutMeasurement.width;
        const index = event.nativeEvent.contentOffset.x / slideSize;
        setActiveImageIndex(Math.round(index));
    };

    const renderHeader = () => (
        <View style={styles.postHeaderContainer}>
            <View style={styles.authorSection}>
                <View style={styles.avatarCircle}>
                    {post.author_detail.profile_picture ? (
                        <Image
                            source={{ uri: post.author_detail.profile_picture }}
                            style={styles.avatarImage}
                        />
                    ) : (
                        <Text style={styles.avatarInitial}>
                            {(post.author_detail.full_name || 'U')[0].toUpperCase()}
                        </Text>
                    )}
                </View>
                <View style={styles.authorMeta}>
                    <Text style={styles.authorName}>{post.author_detail.full_name}</Text>
                    <Text style={styles.timestamp}>{formatDate(post.created_at)}</Text>
                </View>
                {currentUserProfile && currentUserProfile.id === post.author_detail.id && (
                    <TouchableOpacity onPress={handleDeletePost} style={styles.deleteButton}>
                        <Text style={styles.deleteButtonText}>🗑️</Text>
                    </TouchableOpacity>
                )}
            </View>

            <Text style={styles.postContent}>{post.content}</Text>

            {post.images && post.images.length > 0 && (
                <View style={styles.mediaContainer}>
                    <FlatList
                        data={post.images}
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        onMomentumScrollEnd={onScroll}
                        keyExtractor={(img) => img.id.toString()}
                        renderItem={({ item: img }) => (
                            <Image
                                source={{ uri: img.image }}
                                style={styles.detailPostImage}
                                resizeMode="cover"
                            />
                        )}
                    />
                    {post.images.length > 1 && (
                        <View style={styles.imageBadge}>
                            <Text style={styles.imageBadgeText}>{activeImageIndex + 1}/{post.images.length}</Text>
                        </View>
                    )}
                </View>
            )}

            <View style={styles.interactionBar}>
                <TouchableOpacity
                    style={styles.interactionButton}
                    onPress={handleLike}
                >
                    <Text style={[styles.interactionIcon, hasLiked && styles.likedIcon]}>
                        {hasLiked ? '❤️' : '🤍'}
                    </Text>
                    <Text style={[styles.interactionText, hasLiked && styles.likedText]}>
                        {postLikes} {postLikes === 1 ? 'Like' : 'Likes'}
                    </Text>
                </TouchableOpacity>
                <View style={styles.interactionButton}>
                    <Text style={styles.interactionIcon}>💬</Text>
                    <Text style={styles.interactionText}>{comments.length} Comments</Text>
                </View>
            </View>

            <View style={styles.divider} />
            <Text style={styles.commentsLabel}>Comments ({comments.length})</Text>
        </View>
    );

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 25}
                style={{ flex: 1 }}
            >
                <View style={styles.header}>
                    <TouchableOpacity onPress={onBack} style={styles.backButton}>
                        <Text style={styles.backButtonText}>←</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Post Details</Text>
                    <View style={{ width: 40 }} />
                </View>

                {loading ? (
                    <View style={styles.centered}>
                        <ActivityIndicator size="large" color="#2563eb" />
                    </View>
                ) : (
                    <FlatList
                        data={comments}
                        keyExtractor={(item) => item.id.toString()}
                        ListHeaderComponent={renderHeader()}
                        showsVerticalScrollIndicator={false}
                        renderItem={({ item: comment }) => (
                            <View style={styles.commentItem}>
                                <View style={styles.commentMain}>
                                    <View style={[styles.avatarCircle, { width: 32, height: 32, borderRadius: 16 }]}>
                                        {comment.author_detail.profile_picture ? (
                                            <Image
                                                source={{ uri: comment.author_detail.profile_picture }}
                                                style={styles.avatarImage}
                                            />
                                        ) : (
                                            <Text style={[styles.avatarInitial, { fontSize: 14 }]}>
                                                {(comment.author_detail.full_name || 'U')[0].toUpperCase()}
                                            </Text>
                                        )}
                                    </View>
                                    <View style={styles.commentContentSection}>
                                        <View style={styles.commentBubble}>
                                            <Text style={styles.commentAuthor}>{comment.author_detail.full_name}</Text>
                                            <Text style={styles.commentText}>{comment.content}</Text>
                                        </View>
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <Text style={styles.commentTime}>{formatDate(comment.created_at)}</Text>
                                            <TouchableOpacity
                                                onPress={() => setReplyingTo(comment)}
                                                style={{ marginLeft: 12, marginTop: 4 }}
                                            >
                                                <Text style={styles.replyButtonText}>Reply</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </View>

                                {comment.replies && comment.replies.map(reply => (
                                    <View key={reply.id} style={styles.replyItem}>
                                        <View style={[styles.avatarCircle, { width: 24, height: 24, borderRadius: 12 }]}>
                                            {reply.author_detail.profile_picture ? (
                                                <Image
                                                    source={{ uri: reply.author_detail.profile_picture }}
                                                    style={styles.avatarImage}
                                                />
                                            ) : (
                                                <Text style={[styles.avatarInitial, { fontSize: 12 }]}>
                                                    {(reply.author_detail.full_name || 'U')[0].toUpperCase()}
                                                </Text>
                                            )}
                                        </View>
                                        <View style={styles.commentContentSection}>
                                            <View style={[styles.commentBubble, { backgroundColor: '#f9fafb' }]}>
                                                <Text style={[styles.commentAuthor, { fontSize: 13 }]}>{reply.author_detail.full_name}</Text>
                                                <Text style={[styles.commentText, { fontSize: 13 }]}>{reply.content}</Text>
                                            </View>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        )}
                        ListEmptyComponent={
                            <View style={styles.emptyComments}>
                                <Text style={styles.emptyText}>No comments yet.</Text>
                            </View>
                        }
                    />
                )}

                <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 10) }]}>
                    <View style={{ flex: 1 }}>
                        {replyingTo && (
                            <View style={styles.replyContext}>
                                <Text style={styles.replyContextText}>Replying to {replyingTo.author_detail.full_name}</Text>
                                <TouchableOpacity onPress={() => setReplyingTo(null)}>
                                    <Text style={styles.cancelReply}>Cancel</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                        <TextInput
                            style={styles.input}
                            placeholder={replyingTo ? "Write a reply..." : "Write a comment..."}
                            value={newComment}
                            onChangeText={setNewComment}
                            multiline
                        />
                    </View>
                    <TouchableOpacity
                        style={[styles.sendButton, !newComment.trim() && { opacity: 0.5 }]}
                        onPress={handleSendComment}
                        disabled={!newComment.trim()}
                    >
                        <Text style={styles.sendButtonText}>Post</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff',
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
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    backButton: {
        padding: 4,
    },
    backButtonText: {
        fontSize: 28,
        color: '#2563eb',
        fontWeight: 'bold',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
    },
    postHeaderContainer: {
        padding: 16,
    },
    authorSection: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
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
        color: '#9ca3af',
    },
    postContent: {
        fontSize: 17,
        color: '#374151',
        lineHeight: 26,
        marginBottom: 16,
    },
    mediaContainer: {
        position: 'relative',
        marginBottom: 16,
    },
    detailPostImage: {
        width: width - 32,
        height: width * 0.8,
        borderRadius: 12,
        backgroundColor: '#f3f4f6',
    },
    imageBadge: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    imageBadgeText: {
        color: '#ffffff',
        fontSize: 12,
        fontWeight: '600',
    },
    divider: {
        height: 1,
        backgroundColor: '#f3f4f6',
        marginVertical: 16,
    },
    interactionBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
    },
    interactionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 24,
    },
    interactionIcon: {
        fontSize: 18,
        marginRight: 6,
    },
    interactionText: {
        fontSize: 14,
        color: '#6b7280',
        fontWeight: '500',
    },
    likedIcon: {
        color: '#ef4444',
    },
    likedText: {
        color: '#ef4444',
    },
    commentsLabel: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 16,
    },
    commentItem: {
        paddingHorizontal: 16,
        marginBottom: 20,
    },
    commentMain: {
        flexDirection: 'row',
    },
    commentContentSection: {
        flex: 1,
        marginLeft: 10,
    },
    commentBubble: {
        backgroundColor: '#f3f4f6',
        padding: 12,
        borderRadius: 16,
        borderTopLeftRadius: 2,
    },
    commentAuthor: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 2,
    },
    commentText: {
        fontSize: 14,
        color: '#374151',
        lineHeight: 20,
    },
    commentTime: {
        fontSize: 11,
        color: '#9ca3af',
        marginTop: 4,
        marginLeft: 4,
    },
    replyItem: {
        flexDirection: 'row',
        marginLeft: 42,
        marginTop: 10,
    },
    emptyComments: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        color: '#9ca3af',
        fontSize: 15,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        backgroundColor: '#ffffff',
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
    },
    input: {
        flex: 1,
        backgroundColor: '#f9fafb',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginRight: 10,
        maxHeight: 100,
        fontSize: 15,
    },
    sendButton: {
        backgroundColor: '#2563eb',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    sendButtonText: {
        color: '#ffffff',
        fontWeight: 'bold',
    },
    replyButtonText: {
        fontSize: 12,
        color: '#2563eb',
        fontWeight: '600',
    },
    replyContext: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: '#eff6ff',
        borderRadius: 12,
        marginBottom: 8,
    },
    replyContextText: {
        fontSize: 12,
        color: '#1e40af',
    },
    cancelReply: {
        fontSize: 12,
        color: '#ef4444',
        fontWeight: 'bold',
    },
    deleteButton: {
        padding: 8,
    },
    deleteButtonText: {
        fontSize: 18,
    },
});

export default PostDetailScreen;
