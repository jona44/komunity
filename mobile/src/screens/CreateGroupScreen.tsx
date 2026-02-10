import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    ScrollView, Alert, ActivityIndicator, Switch, Platform, KeyboardAvoidingView
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import client from '../api/client';

interface CreateGroupScreenProps {
    onBack: () => void;
    onGroupCreated: (group: any) => void;
}

const CreateGroupScreen = ({ onBack, onGroupCreated }: CreateGroupScreenProps) => {
    const insets = useSafeAreaInsets();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [requiresApproval, setRequiresApproval] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleCreateGroup = async () => {
        if (!name.trim()) {
            Alert.alert('Required Field', 'Please enter a community name.');
            return;
        }

        setLoading(true);
        try {
            const response = await client.post('groups/', {
                name: name.trim(),
                description: description.trim(),
                requires_approval: requiresApproval,
            });

            Alert.alert('Success', `Community "${name}" has been created!`);
            onGroupCreated(response.data);
        } catch (error) {
            console.error('Error creating group:', error);
            Alert.alert('Error', 'Failed to create community. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.formSection}>
                        <Text style={styles.label}>Community Name *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. Sunnyvale Neighborhood"
                            value={name}
                            onChangeText={setName}
                        />
                    </View>

                    <View style={styles.formSection}>
                        <Text style={styles.label}>Description</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="What is this community about?"
                            value={description}
                            onChangeText={setDescription}
                            multiline
                            numberOfLines={4}
                        />
                    </View>

                    <View style={styles.settingRow}>
                        <View style={styles.settingText}>
                            <Text style={styles.settingLabel}>Require Approval</Text>
                            <Text style={styles.settingDescription}>New members must be approved by an admin.</Text>
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
                            💡 You will automatically become the administrator of this community. You can change settings and add more admins later.
                        </Text>
                    </View>
                </ScrollView>

                <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
                    <TouchableOpacity
                        style={[styles.createButton, loading && styles.buttonDisabled]}
                        onPress={handleCreateGroup}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#ffffff" />
                        ) : (
                            <Text style={styles.createButtonText}>Launch Community</Text>
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
        height: 120,
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
    footer: {
        padding: 24,
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
    },
    createButton: {
        backgroundColor: '#2563eb',
        borderRadius: 12,
        padding: 18,
        alignItems: 'center',
        marginBottom: 12,
    },
    buttonDisabled: {
        backgroundColor: '#93c5fd',
    },
    createButtonText: {
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

export default CreateGroupScreen;
