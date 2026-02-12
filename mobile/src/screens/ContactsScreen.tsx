import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, Share } from 'react-native';
import * as Contacts from 'expo-contacts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import client from '../api/client';
import * as SMS from 'expo-sms';

interface ContactsScreenProps {
    onBack?: () => void;
    groupId?: number; // Optional: If inviting to a specific group
}

const ContactsScreen = ({ onBack, groupId }: ContactsScreenProps) => {
    const insets = useSafeAreaInsets();
    const [contacts, setContacts] = useState<Contacts.Contact[]>([]);
    const [loading, setLoading] = useState(true);
    const [permissionStatus, setPermissionStatus] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            const { status } = await Contacts.requestPermissionsAsync();
            setPermissionStatus(status);

            if (status === 'granted') {
                const { data } = await Contacts.getContactsAsync({
                    fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Emails, Contacts.Fields.Image],
                });

                if (data.length > 0) {
                    setContacts(data);
                }
            } else {
                Alert.alert("Permission Required", "We need access to contacts to invite your friends.");
            }
            setLoading(false);
        })();
    }, []);

    const handleInvite = async (contact: Contacts.Contact) => {
        const name = contact.name || "Friend";
        const phoneNumber = contact.phoneNumbers?.[0]?.number;
        const email = contact.emails?.[0]?.email;

        let inviteLink = "https://komunity.app/invite";
        if (groupId) {
            inviteLink = `https://komunity.app/group/${groupId}/join`;
        }

        const message = `Hey ${name}, join me on Komunity! It's a great app for our community. Here is the link: ${inviteLink}`;

        if (phoneNumber) {
            const isAvailable = await SMS.isAvailableAsync();
            if (isAvailable) {
                await SMS.sendSMSAsync(
                    [phoneNumber],
                    message
                );
            } else {
                Alert.alert("SMS not available", "Cannot send SMS on this device.");
            }
        } else if (email) {
            // Fallback to generic share
            Share.share({
                message: message,
                title: "Join Komunity"
            });
        } else {
            Alert.alert("No Contact Info", "This contact does not have a phone number or email.");
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color="#2563eb" />
            </View>
        );
    }

    if (permissionStatus !== 'granted') {
        return (
            <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
                <Text style={styles.permissionText}>Permission to access contacts was denied.</Text>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Text style={styles.backButtonText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.headerButton}>
                    <Text style={styles.headerButtonText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Invite Friends</Text>
                <View style={{ width: 60 }} />
            </View>

            <FlatList
                data={contacts}
                keyExtractor={(item) => item.id || item.name || Math.random().toString()}
                renderItem={({ item }) => (
                    <View style={styles.contactItem}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>{item.name?.[0] || "?"}</Text>
                        </View>
                        <View style={styles.contactInfo}>
                            <Text style={styles.contactName}>{item.name}</Text>
                            <Text style={styles.contactDetail}>
                                {item.phoneNumbers?.[0]?.number || item.emails?.[0]?.email || "No details"}
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={styles.inviteButton}
                            onPress={() => handleInvite(item)}
                        >
                            <Text style={styles.inviteButtonText}>Invite</Text>
                        </TouchableOpacity>
                    </View>
                )}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
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
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    headerButton: {
        padding: 8,
    },
    headerButtonText: {
        fontSize: 16,
        color: '#2563eb',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
    },
    permissionText: {
        fontSize: 16,
        color: '#6b7280',
        marginBottom: 20,
    },
    backButton: {
        padding: 12,
        backgroundColor: '#2563eb',
        borderRadius: 8,
    },
    backButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    contactItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#e0e7ff',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    avatarText: {
        fontSize: 18,
        color: '#2563eb',
        fontWeight: 'bold',
    },
    contactInfo: {
        flex: 1,
    },
    contactName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
    },
    contactDetail: {
        fontSize: 14,
        color: '#6b7280',
    },
    inviteButton: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        backgroundColor: '#2563eb',
        borderRadius: 16,
    },
    inviteButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
});

export default ContactsScreen;
