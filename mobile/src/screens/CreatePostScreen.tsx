import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TextInput, Image,
    TouchableOpacity, ScrollView, ActivityIndicator,
    Alert, SafeAreaView, Platform, KeyboardAvoidingView
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import client from '../api/client';

interface Group {
    id: number;
    name: string;
}

interface PostImage {
    id: number;
    image: string;
}

interface Post {
    id: number;
    content: string;
    images: PostImage[];
}

interface CreatePostProps {
    group: Group;
    post?: Post;
    onBack: () => void;
    onPostCreated: () => void;
}

const CreatePostScreen = ({ group, post, onBack, onPostCreated }: CreatePostProps) => {
    const insets = useSafeAreaInsets();
    const [content, setContent] = useState(post?.content || '');
    // Store images with metadata: uri, isNew (local), id (remote)
    const [images, setImages] = useState<{ uri: string; id?: number; isNew?: boolean }[]>(
        post ? post.images.map(img => ({ uri: img.image, id: img.id, isNew: false })) : []
    );
    const [deletedImageIds, setDeletedImageIds] = useState<number[]>([]);
    const [loading, setLoading] = useState(false);

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Sorry, we need gallery permissions to make this work!');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsMultipleSelection: true,
            quality: 0.8,
        });

        if (!result.canceled) {
            const selectedImages = result.assets.map(asset => ({ uri: asset.uri, isNew: true }));
            setImages([...images, ...selectedImages]);
        }
    };

    const takePhoto = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Sorry, we need camera permissions to make this work!');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            quality: 0.8,
        });

        if (!result.canceled) {
            const selectedImages = result.assets.map(asset => ({ uri: asset.uri, isNew: true }));
            setImages([...images, ...selectedImages]);
        }
    };

    const removeImage = (index: number) => {
        const imageToRemove = images[index];
        // If removing an existing remote image, mark for deletion
        if (!imageToRemove.isNew && imageToRemove.id) {
            setDeletedImageIds([...deletedImageIds, imageToRemove.id]);
        }

        const newImages = [...images];
        newImages.splice(index, 1);
        setImages(newImages);
    };

    const handleCreatePost = async () => {
        if (!content.trim() && images.length === 0) {
            Alert.alert('Empty Post', 'Please add some content or an image to your post.');
            return;
        }

        setLoading(true);
        try {
            let postId;

            if (post) {
                // UPDATE existing post
                await client.patch(`posts/${post.id}/`, {
                    content: content
                });
                postId = post.id;

                // Handle deletions
                for (const id of deletedImageIds) {
                    await client.delete(`post-images/${id}/`);
                }
            } else {
                // CREATE new post
                const postResponse = await client.post('posts/', {
                    group: group.id,
                    content: content,
                    approved: true
                });
                postId = postResponse.data.id;
            }

            // Upload NEW images
            const newImages = images.filter(img => img.isNew);
            if (newImages.length > 0) {
                for (const imgWrapper of newImages) {
                    const formData = new FormData();
                    formData.append('post', postId.toString());

                    const filename = imgWrapper.uri.split('/').pop() || 'upload.jpg';
                    const match = /\.(\w+)$/.exec(filename);
                    const type = match ? `image/${match[1]}` : `image`;

                    formData.append('image', {
                        uri: imgWrapper.uri,
                        name: filename,
                        type,
                    } as any);

                    await client.post('post-images/', formData, {
                        headers: {
                            'Content-Type': 'multipart/form-data',
                        },
                    });
                }
            }

            Alert.alert('Success', post ? 'Post updated successfully!' : 'Your post has been shared with the community!');
            onPostCreated();
        } catch (error) {
            console.error(post ? 'Error updating post:' : 'Error creating post:', error);
            Alert.alert('Error', 'Failed to save post. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
                <ScrollView style={styles.contentScroll} keyboardShouldPersistTaps="handled">
                    <View style={styles.groupContext}>
                        <Text style={styles.postingToLabel}>{post ? 'Editing in ' : 'Posting to '}</Text>
                        <Text style={styles.groupNameText}>{group.name}</Text>
                    </View>

                    <TextInput
                        placeholder="What's on your mind?"
                        placeholderTextColor="#9ca3af"
                        multiline
                        style={styles.textInput}
                        value={content}
                        onChangeText={setContent}
                        autoFocus={!post}
                    />

                    {images.length > 0 && (
                        <View style={styles.imageGrid}>
                            {images.map((img, index) => (
                                <View key={index} style={styles.imageWrapper}>
                                    <Image source={{ uri: img.uri }} style={styles.previewImage} />
                                    <TouchableOpacity
                                        style={styles.removeImageButton}
                                        onPress={() => removeImage(index)}
                                    >
                                        <Text style={styles.removeImageText}>✕</Text>
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>
                    )}
                </ScrollView>

                <View style={[styles.toolbar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
                    <View style={styles.toolbarLeft}>
                        <TouchableOpacity style={styles.toolbarItem} onPress={pickImage}>
                            <Text style={styles.toolbarIcon}>🖼️</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.toolbarItem} onPress={takePhoto}>
                            <Text style={styles.toolbarIcon}>📷</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.toolbarItem}>
                            <Text style={styles.toolbarIcon}>📍</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        onPress={handleCreatePost}
                        disabled={loading || (!content.trim() && images.length === 0)}
                        style={[styles.postButton, (loading || (!content.trim() && images.length === 0)) && { opacity: 0.5 }]}
                    >
                        {loading ? (
                            <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
                            <Text style={styles.postButtonText}>Post Proposal</Text>
                        )}
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    closeButton: {
        padding: 4,
    },
    closeButtonText: {
        fontSize: 24,
        color: '#6b7280',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
    },
    postButton: {
        backgroundColor: '#2563eb',
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20,
        minWidth: 70,
        alignItems: 'center',
    },
    postButtonText: {
        color: '#ffffff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    contentScroll: {
        flex: 1,
        padding: 16,
    },
    groupContext: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        backgroundColor: '#f3f4f6',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        alignSelf: 'flex-start',
    },
    postingToLabel: {
        fontSize: 13,
        color: '#6b7280',
    },
    groupNameText: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#2563eb',
    },
    textInput: {
        fontSize: 18,
        color: '#111827',
        minHeight: 120,
        textAlignVertical: 'top',
        lineHeight: 26,
    },
    imageGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 20,
        marginHorizontal: -4,
    },
    imageWrapper: {
        width: '33.33%',
        aspectRatio: 1,
        padding: 4,
        position: 'relative',
    },
    previewImage: {
        width: '100%',
        height: '100%',
        borderRadius: 8,
        backgroundColor: '#f3f4f6',
    },
    removeImageButton: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        width: 22,
        height: 22,
        borderRadius: 11,
        justifyContent: 'center',
        alignItems: 'center',
    },
    removeImageText: {
        color: '#ffffff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    toolbar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
        backgroundColor: '#ffffff',
    },
    toolbarLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    toolbarItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 20,
        paddingVertical: 8,
    },
    toolbarIcon: {
        fontSize: 20,
        marginRight: 6,
    },
    toolbarLabel: {
        fontSize: 14,
        color: '#4b5563',
        fontWeight: '500',
    },
});

export default CreatePostScreen;
