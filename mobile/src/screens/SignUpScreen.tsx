import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import client, { setAuthToken, saveToken } from '../api/client';

interface SignUpProps {
    onSignUpSuccess: (token: string) => void;
    onBackToLogin: () => void;
}

const SignUpScreen = ({ onSignUpSuccess, onBackToLogin }: SignUpProps) => {
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [confirmPassword, setConfirmPassword] = React.useState('');
    const [loading, setLoading] = React.useState(false);

    const handleSignUp = async () => {
        if (!email || !password || !confirmPassword) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match');
            return;
        }

        if (password.length < 8) {
            Alert.alert('Error', 'Password must be at least 8 characters long');
            return;
        }

        setLoading(true);
        try {
            // 1. Create User
            await client.post('users/signup/', {
                email: email.trim(),
                password: password,
            });

            // 2. Login to get token
            const loginResponse = await client.post('auth-token/', {
                username: email.trim(),
                password: password,
            });

            const token = loginResponse.data.token;
            setAuthToken(token);
            await saveToken(token);
            onSignUpSuccess(token);
        } catch (error: any) {
            console.error(error);
            const errorData = error.response?.data;
            let errorMessage = 'Unable to connect to server';

            if (errorData) {
                if (typeof errorData === 'object') {
                    const firstField = Object.keys(errorData)[0];
                    errorMessage = `${firstField}: ${errorData[firstField][0]}`;
                }
            }

            Alert.alert('Registration Failed', errorMessage);
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
                <ScrollView contentContainerStyle={styles.scrollContainer}>
                    <View style={styles.innerContainer}>
                        <Text style={styles.title}>Join Komunity</Text>
                        <Text style={styles.subtitle}>Create an account to connect with your community</Text>

                        <TextInput
                            style={styles.input}
                            placeholder="Email Address"
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Password"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Confirm Password"
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            secureTextEntry
                        />

                        <TouchableOpacity
                            style={[styles.button, loading && styles.buttonDisabled]}
                            onPress={handleSignUp}
                            disabled={loading}
                        >
                            <Text style={styles.buttonText}>
                                {loading ? 'Creating Account...' : 'Create Account'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.loginLink}
                            onPress={onBackToLogin}
                            disabled={loading}
                        >
                            <Text style={styles.loginLinkText}>
                                Already have an account? <Text style={styles.loginLinkBold}>Sign In</Text>
                            </Text>
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
    scrollContainer: {
        flexGrow: 1,
    },
    innerContainer: {
        flex: 1,
        justifyContent: 'center',
        padding: 30,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        textAlign: 'center',
        color: '#2563eb',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        textAlign: 'center',
        color: '#6b7280',
        marginBottom: 40,
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
    button: {
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
    buttonText: {
        color: '#ffffff',
        fontWeight: 'bold',
        fontSize: 18,
    },
    loginLink: {
        marginTop: 24,
        alignItems: 'center',
    },
    loginLinkText: {
        color: '#6b7280',
        fontSize: 14,
    },
    loginLinkBold: {
        color: '#2563eb',
        fontWeight: 'bold',
    },
});

export default SignUpScreen;
