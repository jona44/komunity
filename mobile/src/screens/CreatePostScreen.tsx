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

interface CreatePostProps {
    group: Group;
    onBack: () => void;
    onPostCreated: () => void;
}

const CreatePostScreen = ({ group, onBack, onPostCreated }: CreatePostProps) => {
    const insets = useSafeAreaInsets();
    const [content, setContent] = useState('');
    const [images, setImages] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to make this work!');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsMultipleSelection: true,
            quality: 0.8,
        });

        if (!result.canceled) {
            const selectedImages = result.assets.map(asset => asset.uri);
            setImages([...images, ...selectedImages]);
        }
    };

    const removeImage = (index: number) => {
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
            // 1. Create the post
            const postResponse = await client.post('posts/', {
                group: group.id,
                content: content,
                approved: true // Auto-approve for now or let backend handle it
            });

            const postId = postResponse.data.id;

            // 2. Upload images one by one if any
            if (images.length > 0) {
                for (const imageUri of images) {
                    const formData = new FormData();
                    formData.append('post', postId);

                    const filename = imageUri.split('/').pop() || 'upload.jpg';
                    const match = /\.(\w+)$/.exec(filename);
                    const type = match ? `image/${match[1]}` : `image`;

                    formData.append('image', {
                        uri: imageUri,
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

            Alert.alert('Success', 'Your post has been shared with the community!');
            onPostCreated();
        } catch (error) {
            console.error('Error creating post:', error);
            Alert.alert('Error', 'Failed to create post. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.closeButton}>
                    <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Create Post</Text>
                <TouchableOpacity
                    onPress={handleCreatePost}
                    disabled={loading || (!content.trim() && images.length === 0)}
                    style={[styles.postButton, (loading || (!content.trim() && images.length === 0)) && { opacity: 0.5 }]}
                >
                    {loading ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                        <Text style={styles.postButtonText}>Post</Text>
                    )}
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
                <ScrollView style={styles.contentScroll} keyboardShouldPersistTaps="handled">
                    <View style={styles.groupContext}>
                        <Text style={styles.postingToLabel}>Posting to </Text>
                        <Text style={styles.groupNameText}>{group.name}</Text>
                    </View>

                    <TextInput
                        placeholder="What's on your mind?"
                        placeholderTextColor="#9ca3af"
                        multiline
                        style={styles.textInput}
                        value={content}
                        onChangeText={setContent}
                        autoFocus
                    />

                    {images.length > 0 && (
                        <View style={styles.imageGrid}>
                            {images.map((uri, index) => (
                                <View key={index} style={styles.imageWrapper}>
                                    <Image source={{ uri }} style={styles.previewImage} />
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
                    <TouchableOpacity style={styles.toolbarItem} onPress={pickImage}>
                        <Text style={styles.toolbarIcon}>🖼️</Text>
                        <Text style={styles.toolbarLabel}>Photos</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.toolbarItem}>
                        <Text style={styles.toolbarIcon}>📍</Text>
                        <Text style={styles.toolbarLabel}>Location</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.toolbarItem}>
                        <Text style={styles.toolbarIcon}>🏷️</Text>
                        <Text style={styles.toolbarLabel}>Tag</Text>
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
        paddingHorizontal: 16,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
        backgroundColor: '#ffffff',
    },
    toolbarItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 24,
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
