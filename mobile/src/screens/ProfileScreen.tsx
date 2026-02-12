import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, Alert, TextInput, Pressable, Platform
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import client from '../api/client';

interface ProfileScreenProps {
    onBack: () => void;
    onLogout: () => void;
    onProfileUpdate?: () => void;
}

const ProfileScreen = ({ onBack, onLogout, onProfileUpdate }: ProfileScreenProps) => {
    const insets = useSafeAreaInsets();
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Editable fields
    const [firstName, setFirstName] = useState('');
    const [surname, setSurname] = useState('');
    const [phone, setPhone] = useState('');
    const [dob, setDob] = useState<Date | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [culturalBackground, setCulturalBackground] = useState('');
    const [religiousAffiliation, setReligiousAffiliation] = useState('');
    const [traditionalNames, setTraditionalNames] = useState('');
    const [spiritualBeliefs, setSpiritualBeliefs] = useState('');
    const [bio, setBio] = useState('');
    const [profilePicture, setProfilePicture] = useState<string | null>(null);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const response = await client.get('users/me/');
            const data = response.data;
            setProfile(data);

            // Initialize editable fields
            setFirstName(data.profile?.first_name || '');
            setSurname(data.profile?.surname || '');
            setPhone(data.profile?.phone || '');

            if (data.profile?.date_of_birth) {
                setDob(new Date(data.profile.date_of_birth));
            } else {
                setDob(null);
            }

            setCulturalBackground(data.profile?.cultural_background || '');
            setReligiousAffiliation(data.profile?.religious_affiliation || '');
            setTraditionalNames(data.profile?.traditional_names || '');
            setSpiritualBeliefs(data.profile?.spiritual_beliefs || '');
            setBio(data.profile?.bio || '');
            setProfilePicture(null); // Reset local selection
        } catch (error) {
            console.error('Error fetching profile:', error);
            Alert.alert('Error', 'Failed to load profile');
        } finally {
            setLoading(false);
        }
    };

    const pickImage = async () => {
        Alert.alert(
            'Profile Picture',
            'Choose a source for your profile photo',
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
            Alert.alert('Permission Needed', 'We need permission to use your camera to change your profile picture.');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
        });

        if (!result.canceled) {
            setProfilePicture(result.assets[0].uri);
        }
    };

    const handleGalleryLaunch = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Needed', 'We need permission to access your gallery to change your profile picture.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
        });

        if (!result.canceled) {
            setProfilePicture(result.assets[0].uri);
        }
    };

    const handleSave = async () => {
        if (!profile?.profile?.id) return;

        setIsSaving(true);
        try {
            const formData = new FormData();
            formData.append('first_name', firstName);
            formData.append('surname', surname);
            formData.append('phone', phone);
            if (dob) formData.append('date_of_birth', dob.toISOString().split('T')[0]);
            formData.append('cultural_background', culturalBackground);
            formData.append('religious_affiliation', religiousAffiliation);
            formData.append('traditional_names', traditionalNames);
            formData.append('spiritual_beliefs', spiritualBeliefs);
            formData.append('bio', bio);

            if (profilePicture) {
                const filename = profilePicture.split('/').pop();
                const match = /\.(\w+)$/.exec(filename || '');
                const type = match ? `image/${match[1]}` : `image`;

                formData.append('profile_picture', {
                    uri: profilePicture,
                    name: filename || 'profile.jpg',
                    type,
                } as any);
            }

            await client.patch(`profiles/${profile.profile.id}/`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            Alert.alert('Success', 'Profile updated successfully');
            setIsEditing(false);
            fetchProfile(); // Refresh local data
            onProfileUpdate?.(); // Refresh global data (like nav bar)
        } catch (error: any) {
            console.error('Error saving profile:', error);
            const errorMsg = error.response?.data ? JSON.stringify(error.response.data) : 'Failed to update profile';
            Alert.alert('Error', errorMsg);
        } finally {
            setIsSaving(false);
        }
    };

    const handleLogout = () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: () => {
                        console.log('ProfileScreen: Logout confirmed');
                        onLogout();
                    }
                }
            ]
        );
    };

    const onDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(false);
        if (selectedDate) {
            setDob(selectedDate);
        }
    };

    const formatDateDisplay = (date: Date) => {
        return date.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
                <ActivityIndicator size="large" color="#2563eb" />
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Text style={styles.backButtonText}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Profile</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.content}>
                {/* Profile Header */}
                <View style={styles.profileHeader}>
                    <TouchableOpacity
                        style={styles.avatarContainer}
                        onPress={isEditing ? pickImage : undefined}
                        disabled={!isEditing}
                    >
                        {profilePicture ? (
                            <Image
                                source={{ uri: profilePicture }}
                                style={styles.avatar}
                                transition={200}
                            />
                        ) : profile?.profile?.profile_picture ? (
                            <Image
                                source={{ uri: profile.profile.profile_picture }}
                                style={styles.avatar}
                                transition={200}
                            />
                        ) : (
                            <View style={styles.avatarPlaceholder}>
                                <Text style={styles.avatarText}>
                                    {profile?.profile?.full_name?.[0]?.toUpperCase() || profile?.email?.[0]?.toUpperCase() || '?'}
                                </Text>
                            </View>
                        )}
                        {isEditing && (
                            <View style={styles.editBadge}>
                                <Text style={styles.editBadgeText}>✎</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                    <Text style={styles.profileName}>
                        {isEditing ? `${firstName} ${surname}`.trim() || 'New User' : profile?.profile?.full_name || 'No name set'}
                    </Text>
                    <Text style={styles.profileEmail}>{profile?.email}</Text>
                </View>

                {/* Profile Details */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Personal Information</Text>

                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>First Name</Text>
                        {isEditing ? (
                            <TextInput
                                style={styles.editInput}
                                value={firstName}
                                onChangeText={setFirstName}
                                placeholder="First Name"
                            />
                        ) : (
                            <Text style={styles.infoValue}>
                                {profile?.profile?.first_name || 'Not set'}
                            </Text>
                        )}
                    </View>

                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Surname</Text>
                        {isEditing ? (
                            <TextInput
                                style={styles.editInput}
                                value={surname}
                                onChangeText={setSurname}
                                placeholder="Surname"
                            />
                        ) : (
                            <Text style={styles.infoValue}>
                                {profile?.profile?.surname || 'Not set'}
                            </Text>
                        )}
                    </View>

                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Phone</Text>
                        {isEditing ? (
                            <TextInput
                                style={styles.editInput}
                                value={phone}
                                onChangeText={setPhone}
                                placeholder="Phone"
                                keyboardType="phone-pad"
                            />
                        ) : (
                            <Text style={styles.infoValue}>
                                {profile?.profile?.phone || 'Not set'}
                            </Text>
                        )}
                    </View>

                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Date of Birth</Text>
                        {isEditing ? (
                            <Pressable
                                style={styles.datePickerButton}
                                onPress={() => setShowDatePicker(true)}
                            >
                                <Text style={styles.editInput}>
                                    {dob ? formatDateDisplay(dob) : 'Select Date'}
                                </Text>
                            </Pressable>
                        ) : (
                            <Text style={styles.infoValue}>
                                {dob ? formatDateDisplay(dob) : 'Not set'}
                            </Text>
                        )}
                        {showDatePicker && (
                            <DateTimePicker
                                value={dob || new Date(2000, 0, 1)}
                                mode="date"
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                onChange={onDateChange}
                                maximumDate={new Date()}
                            />
                        )}
                    </View>
                </View>

                {/* Cultural Information */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Cultural & Religious</Text>

                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Cultural Background</Text>
                        {isEditing ? (
                            <TextInput
                                style={styles.editInput}
                                value={culturalBackground}
                                onChangeText={setCulturalBackground}
                                placeholder="Cultural Background"
                            />
                        ) : (
                            <Text style={styles.infoValue}>
                                {profile?.profile?.cultural_background || 'Not set'}
                            </Text>
                        )}
                    </View>

                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Religious Affiliation</Text>
                        {isEditing ? (
                            <TextInput
                                style={styles.editInput}
                                value={religiousAffiliation}
                                onChangeText={setReligiousAffiliation}
                                placeholder="Religious Affiliation"
                            />
                        ) : (
                            <Text style={styles.infoValue}>
                                {profile?.profile?.religious_affiliation || 'Not set'}
                            </Text>
                        )}
                    </View>

                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Traditional Names</Text>
                        {isEditing ? (
                            <TextInput
                                style={styles.editInput}
                                value={traditionalNames}
                                onChangeText={setTraditionalNames}
                                placeholder="Traditional Names"
                            />
                        ) : (
                            <Text style={styles.infoValue}>
                                {profile?.profile?.traditional_names || 'Not set'}
                            </Text>
                        )}
                    </View>

                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Spiritual Beliefs</Text>
                        {isEditing ? (
                            <TextInput
                                style={styles.editInput}
                                value={spiritualBeliefs}
                                onChangeText={setSpiritualBeliefs}
                                placeholder="Spiritual Beliefs"
                            />
                        ) : (
                            <Text style={styles.infoValue}>
                                {profile?.profile?.spiritual_beliefs || 'Not set'}
                            </Text>
                        )}
                    </View>
                </View>

                {/* Bio */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>About Me</Text>
                    {isEditing ? (
                        <TextInput
                            style={[styles.editInput, styles.bioInput]}
                            value={bio}
                            onChangeText={setBio}
                            placeholder="Write something about yourself..."
                            multiline
                        />
                    ) : (
                        <Text style={styles.bioText}>{profile?.profile?.bio || 'No bio yet.'}</Text>
                    )}
                </View>

                {/* Actions */}
                <View style={styles.section}>
                    {isEditing ? (
                        <>
                            <TouchableOpacity
                                style={[styles.actionButton, isSaving && styles.disabledButton]}
                                onPress={handleSave}
                                disabled={isSaving}
                            >
                                {isSaving ? (
                                    <ActivityIndicator color="#ffffff" />
                                ) : (
                                    <Text style={styles.actionButtonText}>Save Changes</Text>
                                )}
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.actionButton, styles.cancelButton]}
                                onPress={() => setIsEditing(false)}
                                disabled={isSaving}
                            >
                                <Text style={[styles.actionButtonText, styles.cancelText]}>Cancel</Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <>
                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={() => setIsEditing(true)}
                            >
                                <Text style={styles.actionButtonText}>Edit Profile</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.actionButton, styles.logoutButton]}
                                onPress={handleLogout}
                            >
                                <Text style={[styles.actionButtonText, styles.logoutText]}>Logout</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 16,
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
    content: {
        flex: 1,
    },
    profileHeader: {
        backgroundColor: '#ffffff',
        alignItems: 'center',
        paddingVertical: 32,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    avatarContainer: {
        marginBottom: 16,
        position: 'relative',
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
    },
    avatarPlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#eff6ff',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#dbeafe',
    },
    avatarText: {
        fontSize: 40,
        fontWeight: 'bold',
        color: '#2563eb',
    },
    editBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#2563eb',
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#ffffff',
    },
    editBadgeText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    profileName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 4,
    },
    profileEmail: {
        fontSize: 14,
        color: '#6b7280',
    },
    section: {
        backgroundColor: '#ffffff',
        marginTop: 16,
        paddingHorizontal: 16,
        paddingVertical: 20,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: '#e5e7eb',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 16,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    infoLabel: {
        fontSize: 14,
        color: '#6b7280',
        fontWeight: '500',
    },
    infoValue: {
        fontSize: 14,
        color: '#111827',
        fontWeight: '600',
        textAlign: 'right',
        flex: 1,
        marginLeft: 16,
    },
    bioText: {
        fontSize: 14,
        color: '#374151',
        lineHeight: 20,
    },
    actionButton: {
        backgroundColor: '#2563eb',
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 12,
    },
    actionButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
    logoutButton: {
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#ef4444',
    },
    logoutText: {
        color: '#ef4444',
    },
    editInput: {
        flex: 1,
        fontSize: 14,
        color: '#111827',
        fontWeight: '600',
        textAlign: 'right',
        marginLeft: 16,
        paddingVertical: 4,
        borderBottomWidth: 1,
        borderBottomColor: '#2563eb',
    },
    bioInput: {
        textAlign: 'left',
        marginLeft: 0,
        marginTop: 8,
        minHeight: 80,
    },
    datePickerButton: {
        flex: 1,
        marginLeft: 16,
    },
    cancelButton: {
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#6b7280',
    },
    cancelText: {
        color: '#6b7280',
    },
    disabledButton: {
        opacity: 0.5,
    },
});

export default ProfileScreen;
