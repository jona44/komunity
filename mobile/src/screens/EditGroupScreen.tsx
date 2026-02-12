import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    ScrollView, Alert, ActivityIndicator, Switch, Platform,
    KeyboardAvoidingView, Image
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import client from '../api/client';

interface EditGroupScreenProps {
    group: any;
    onBack: () => void;
    onGroupUpdated: (updatedGroup: any) => void;
}

const EditGroupScreen = ({ group, onBack, onGroupUpdated }: EditGroupScreenProps) => {
    const insets = useSafeAreaInsets();
    const [name, setName] = useState(group.name || '');
    const [description, setDescription] = useState(group.description || '');
    const [requiresApproval, setRequiresApproval] = useState(group.requires_approval || false);
    const [loading, setLoading] = useState(false);
    const [coverImage, setCoverImage] = useState<string | null>(group.cover_image || null);
    const [newCoverImage, setNewCoverImage] = useState<any>(null); // For the picked image
    const [removeCover, setRemoveCover] = useState(false);

    const pickCoverImage = async () => {
        Alert.alert(
            'Community Cover',
            'Choose a source for your cover image',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Take Photo', onPress: handleCameraLaunch },
                { text: 'Choose from Gallery', onPress: handleGalleryLaunch },
            ]
        );
    };

    const handleCameraLaunch = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Needed', 'We need permission to use your camera to take a cover photo.');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [16, 9],
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            setCoverImage(result.assets[0].uri);
            setNewCoverImage(result.assets[0]);
            setRemoveCover(false);
        }
    };

    const handleGalleryLaunch = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Required', 'We need access to your photos to set a cover image.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [16, 9],
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            setCoverImage(result.assets[0].uri);
            setNewCoverImage(result.assets[0]);
            setRemoveCover(false);
        }
    };

    const handleRemoveCover = () => {
        setCoverImage(null);
        setNewCoverImage(null);
        setRemoveCover(true);
    };

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert('Required Field', 'Community name cannot be empty.');
            return;
        }

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('name', name.trim());
            formData.append('description', description.trim());
            formData.append('requires_approval', requiresApproval.toString());

            if (newCoverImage) {
                const uri = newCoverImage.uri;
                const filename = uri.split('/').pop() || 'cover.jpg';
                const match = /\.(\w+)$/.exec(filename);
                const type = match ? `image/${match[1]}` : 'image/jpeg';
                formData.append('cover_image', {
                    uri,
                    name: filename,
                    type,
                } as any);
            } else if (removeCover) {
                formData.append('cover_image', '');
            }

            const response = await client.patch(`groups/${group.id}/`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            Alert.alert('Success', 'Community details have been updated!');
            onGroupUpdated(response.data);
        } catch (error: any) {
            console.error('Error updating group:', error);
            const errorMsg = error.response?.data
                ? JSON.stringify(error.response.data)
                : 'Failed to update community. Please try again.';
            Alert.alert('Error', errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const hasChanges = () => {
        return (
            name.trim() !== (group.name || '') ||
            description.trim() !== (group.description || '') ||
            requiresApproval !== (group.requires_approval || false) ||
            newCoverImage !== null ||
            removeCover
        );
    };

    return (
        <View style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    {/* Cover Image Section */}
                    <View style={styles.coverSection}>
                        <Text style={styles.label}>Cover Image</Text>
                        <TouchableOpacity style={styles.coverPicker} onPress={pickCoverImage}>
                            {coverImage ? (
                                <Image source={{ uri: coverImage }} style={styles.coverPreview} />
                            ) : (
                                <View style={styles.coverPlaceholder}>
                                    <Text style={styles.coverPlaceholderIcon}>📷</Text>
                                    <Text style={styles.coverPlaceholderText}>Tap to select cover image</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                        {coverImage && (
                            <View style={styles.coverActions}>
                                <TouchableOpacity style={styles.changeCoverBtn} onPress={pickCoverImage}>
                                    <Text style={styles.changeCoverText}>Change</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.removeCoverBtn} onPress={handleRemoveCover}>
                                    <Text style={styles.removeCoverText}>Remove</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>

                    {/* Name */}
                    <View style={styles.formSection}>
                        <Text style={styles.label}>Community Name *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. Sunnyvale Neighborhood"
                            value={name}
                            onChangeText={setName}
                            placeholderTextColor="#9ca3af"
                        />
                    </View>

                    {/* Description */}
                    <View style={styles.formSection}>
                        <Text style={styles.label}>Description</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="What is this community about?"
                            value={description}
                            onChangeText={setDescription}
                            multiline
                            numberOfLines={5}
                            placeholderTextColor="#9ca3af"
                        />
                    </View>

                    {/* Requires Approval */}
                    <View style={styles.settingRow}>
                        <View style={styles.settingText}>
                            <Text style={styles.settingLabel}>Require Approval</Text>
                            <Text style={styles.settingDescription}>
                                New members must be approved by an admin before joining.
                            </Text>
                        </View>
                        <Switch
                            value={requiresApproval}
                            onValueChange={setRequiresApproval}
                            trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
                            thumbColor={requiresApproval ? '#2563eb' : '#f4f3f4'}
                        />
                    </View>

                    <View style={styles.infoBox}>
                        <Text style={styles.infoText}>
                            ✏️ Changes will be visible to all community members immediately after saving.
                        </Text>
                    </View>
                </ScrollView>

                <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
                    <TouchableOpacity
                        style={[
                            styles.saveButton,
                            (loading || !hasChanges()) && styles.buttonDisabled
                        ]}
                        onPress={handleSave}
                        disabled={loading || !hasChanges()}
                    >
                        {loading ? (
                            <ActivityIndicator color="#ffffff" />
                        ) : (
                            <Text style={styles.saveButtonText}>Save Changes</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity onPress={onBack} style={styles.cancelButton}>
                        <Text style={styles.cancelButtonText}>Cancel</Text>
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
    scrollContent: {
        padding: 24,
    },
    // Cover Image
    coverSection: {
        marginBottom: 24,
    },
    coverPicker: {
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: '#e5e7eb',
        borderStyle: 'dashed',
    },
    coverPreview: {
        width: '100%',
        height: 180,
        borderRadius: 14,
    },
    coverPlaceholder: {
        width: '100%',
        height: 180,
        backgroundColor: '#f9fafb',
        justifyContent: 'center',
        alignItems: 'center',
    },
    coverPlaceholderIcon: {
        fontSize: 36,
        marginBottom: 8,
    },
    coverPlaceholderText: {
        fontSize: 14,
        color: '#9ca3af',
        fontWeight: '500',
    },
    coverActions: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 12,
        marginTop: 10,
    },
    changeCoverBtn: {
        paddingVertical: 8,
        paddingHorizontal: 20,
        backgroundColor: '#eff6ff',
        borderRadius: 8,
    },
    changeCoverText: {
        color: '#2563eb',
        fontWeight: '600',
        fontSize: 14,
    },
    removeCoverBtn: {
        paddingVertical: 8,
        paddingHorizontal: 20,
        backgroundColor: '#fef2f2',
        borderRadius: 8,
    },
    removeCoverText: {
        color: '#ef4444',
        fontWeight: '600',
        fontSize: 14,
    },
    // Form
    formSection: {
        marginBottom: 24,
    },
    label: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#374151',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#f9fafb',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: '#111827',
    },
    textArea: {
        height: 130,
        textAlignVertical: 'top',
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#f9fafb',
        padding: 16,
        borderRadius: 12,
        marginBottom: 24,
    },
    settingText: {
        flex: 1,
        marginRight: 16,
    },
    settingLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111827',
    },
    settingDescription: {
        fontSize: 14,
        color: '#6b7280',
        marginTop: 2,
    },
    infoBox: {
        backgroundColor: '#eff6ff',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#dbeafe',
    },
    infoText: {
        fontSize: 14,
        color: '#1e40af',
        lineHeight: 20,
    },
    // Footer
    footer: {
        padding: 24,
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
    },
    saveButton: {
        backgroundColor: '#2563eb',
        borderRadius: 12,
        padding: 18,
        alignItems: 'center',
        marginBottom: 12,
        shadowColor: '#2563eb',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    buttonDisabled: {
        backgroundColor: '#93c5fd',
        shadowOpacity: 0,
        elevation: 0,
    },
    saveButtonText: {
        color: '#ffffff',
        fontWeight: 'bold',
        fontSize: 18,
    },
    cancelButton: {
        padding: 12,
        alignItems: 'center',
    },
    cancelButtonText: {
        color: '#6b7280',
        fontSize: 16,
        fontWeight: '500',
    },
});

export default EditGroupScreen;
