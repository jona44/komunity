import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    ScrollView, Alert, SafeAreaView, KeyboardAvoidingView,
    Platform, ActivityIndicator, Pressable
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import client from '../api/client';

interface ProfileSetupProps {
    onComplete: () => void;
}

const ProfileSetupScreen = ({ onComplete }: ProfileSetupProps) => {
    const insets = useSafeAreaInsets();
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
    const [loading, setLoading] = useState(false);

    const onDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(false);
        if (selectedDate) {
            setDob(selectedDate);
        }
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    const handleSaveProfile = async () => {
        if (!firstName.trim() || !surname.trim()) {
            Alert.alert('Required Fields', 'Please enter at least your first name and surname.');
            return;
        }

        setLoading(true);
        try {
            // First, get the current user's profile ID
            const meResponse = await client.get('profiles/me/');
            const profileId = meResponse.data.id;

            // Updated profile
            await client.patch(`profiles/${profileId}/`, {
                first_name: firstName.trim(),
                surname: surname.trim(),
                phone: phone.trim(),
                date_of_birth: dob ? dob.toISOString().split('T')[0] : null,
                cultural_background: culturalBackground.trim(),
                religious_affiliation: religiousAffiliation.trim(),
                traditional_names: traditionalNames.trim(),
                spiritual_beliefs: spiritualBeliefs.trim(),
                bio: bio.trim(),
            });

            Alert.alert('Welcome!', 'Your profile has been set up successfully.');
            onComplete();
        } catch (error: any) {
            console.error('Error saving profile:', error);
            Alert.alert('Save Failed', 'We couldn\'t save your profile. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Complete Your Profile</Text>
                        <Text style={styles.subtitle}>Tell us a bit about yourself to get started</Text>
                    </View>

                    <View style={styles.form}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>First Name *</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. John"
                                value={firstName}
                                onChangeText={setFirstName}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Surname *</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. Doe"
                                value={surname}
                                onChangeText={setSurname}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Date of Birth</Text>
                            <Pressable
                                style={styles.input}
                                onPress={() => setShowDatePicker(true)}
                            >
                                <Text style={[styles.dateText, !dob && styles.placeholderText]}>
                                    {dob ? formatDate(dob) : "Select your birth date"}
                                </Text>
                            </Pressable>
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

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Phone Number</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. +1 234 567 8900"
                                value={phone}
                                onChangeText={setPhone}
                                keyboardType="phone-pad"
                            />
                        </View>

                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Cultural & Religious (Optional)</Text>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Cultural Background</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. Zulu, Yoruba, etc."
                                value={culturalBackground}
                                onChangeText={setCulturalBackground}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Religious Affiliation</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. Christian, Muslim, etc."
                                value={religiousAffiliation}
                                onChangeText={setReligiousAffiliation}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Traditional/Clan Names</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Names used in your tradition"
                                value={traditionalNames}
                                onChangeText={setTraditionalNames}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Spiritual Beliefs</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Any specific beliefs or practices"
                                value={spiritualBeliefs}
                                onChangeText={setSpiritualBeliefs}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Bio</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                placeholder="A short bio about yourself..."
                                value={bio}
                                onChangeText={setBio}
                                multiline
                                numberOfLines={4}
                            />
                        </View>

                        <TouchableOpacity
                            style={[styles.button, loading && styles.buttonDisabled]}
                            onPress={handleSaveProfile}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#ffffff" />
                            ) : (
                                <Text style={styles.buttonText}>Get Started</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    scrollContent: {
        flexGrow: 1,
        padding: 24,
    },
    header: {
        marginBottom: 32,
        marginTop: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#6b7280',
    },
    form: {
        flex: 1,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
    },
    sectionHeader: {
        marginTop: 12,
        marginBottom: 16,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2563eb',
    },
    input: {
        backgroundColor: '#f9fafb',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        color: '#111827',
        justifyContent: 'center',
    },
    dateText: {
        fontSize: 16,
        color: '#111827',
    },
    placeholderText: {
        color: '#9ca3af',
    },
    textArea: {
        height: 120,
        textAlignVertical: 'top',
    },
    button: {
        backgroundColor: '#2563eb',
        borderRadius: 12,
        padding: 18,
        alignItems: 'center',
        marginTop: 12,
        shadowColor: '#2563eb',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 2,
    },
    buttonDisabled: {
        backgroundColor: '#93c5fd',
    },
    buttonText: {
        color: '#ffffff',
        fontWeight: 'bold',
        fontSize: 18,
    },
});

export default ProfileSetupScreen;
