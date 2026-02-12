import React from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    Alert, SafeAreaView, KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native';
import client from '../api/client';

interface PasswordResetProps {
    onBackToLogin: () => void;
}

const PasswordResetScreen = ({ onBackToLogin }: PasswordResetProps) => {
    const [email, setEmail] = React.useState('');
    const [loading, setLoading] = React.useState(false);
    const [emailSent, setEmailSent] = React.useState(false);

    const handleSubmit = async () => {
        if (!email.trim()) {
            Alert.alert('Error', 'Please enter your email address.');
            return;
        }

        setLoading(true);
        try {
            await client.post('password-reset/', { email: email.trim() });
            setEmailSent(true);
        } catch (error: any) {
            console.error('Password reset error:', error);
            const errorData = error.response?.data;
            if (errorData?.error) {
                Alert.alert('Error', errorData.error);
            } else {
                Alert.alert('Error', 'Something went wrong. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    if (emailSent) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.innerContainer}>
                    <View style={styles.iconContainer}>
                        <Text style={styles.icon}>📧</Text>
                    </View>

                    <Text style={styles.title}>Check Your Email</Text>
                    <Text style={styles.description}>
                        If an account exists with{' '}
                        <Text style={styles.emailHighlight}>{email.trim()}</Text>
                        , you'll receive a password reset link shortly.
                    </Text>

                    <Text style={styles.spamNote}>
                        Don't see it? Check your spam folder.
                    </Text>

                    <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={onBackToLogin}
                    >
                        <Text style={styles.primaryButtonText}>Back to Sign In</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={() => {
                            setEmailSent(false);
                            setEmail('');
                        }}
                    >
                        <Text style={styles.secondaryButtonText}>Try a different email</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <View style={styles.innerContainer}>
                    <View style={styles.iconContainer}>
                        <Text style={styles.icon}>🔑</Text>
                    </View>

                    <Text style={styles.title}>Reset Password</Text>
                    <Text style={styles.description}>
                        Enter the email address associated with your account and we'll send you a link to reset your password.
                    </Text>

                    <TextInput
                        style={styles.input}
                        placeholder="Email Address"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        autoFocus
                    />

                    <TouchableOpacity
                        style={[styles.primaryButton, loading && styles.buttonDisabled]}
                        onPress={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
                            <Text style={styles.primaryButtonText}>Send Reset Link</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.backLink}
                        onPress={onBackToLogin}
                        disabled={loading}
                    >
                        <Text style={styles.backLinkText}>
                            ← Back to Sign In
                        </Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    innerContainer: {
        flex: 1,
        justifyContent: 'center',
        padding: 30,
    },
    iconContainer: {
        alignItems: 'center',
        marginBottom: 16,
    },
    icon: {
        fontSize: 48,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        textAlign: 'center',
        color: '#111827',
        marginBottom: 12,
    },
    description: {
        fontSize: 15,
        textAlign: 'center',
        color: '#6b7280',
        lineHeight: 22,
        marginBottom: 32,
        paddingHorizontal: 10,
    },
    emailHighlight: {
        fontWeight: 'bold',
        color: '#2563eb',
    },
    spamNote: {
        fontSize: 13,
        textAlign: 'center',
        color: '#9ca3af',
        marginBottom: 32,
    },
    input: {
        backgroundColor: '#f9fafb',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
        fontSize: 16,
    },
    primaryButton: {
        backgroundColor: '#2563eb',
        padding: 18,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 10,
        elevation: 2,
        shadowColor: '#2563eb',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    buttonDisabled: {
        backgroundColor: '#93c5fd',
    },
    primaryButtonText: {
        color: '#ffffff',
        fontWeight: 'bold',
        fontSize: 18,
    },
    secondaryButton: {
        marginTop: 16,
        padding: 14,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    secondaryButtonText: {
        color: '#6b7280',
        fontWeight: '600',
        fontSize: 16,
    },
    backLink: {
        marginTop: 24,
        alignItems: 'center',
    },
    backLinkText: {
        color: '#2563eb',
        fontWeight: '600',
        fontSize: 15,
    },
});

export default PasswordResetScreen;
