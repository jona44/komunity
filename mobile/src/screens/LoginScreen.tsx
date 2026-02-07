import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, SafeAreaView } from 'react-native';
import client, { setAuthToken } from '../api/client';

interface LoginProps {
    onLoginSuccess: () => void;
    onShowSignUp: () => void;
}

const LoginScreen = ({ onLoginSuccess, onShowSignUp }: LoginProps) => {
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [loading, setLoading] = React.useState(false);

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please enter both email and password');
            return;
        }

        setLoading(true);
        try {
            const response = await client.post('auth-token/', {
                username: email.trim(),
                password: password,
            });

            const token = response.data.token;
            setAuthToken(token);
            onLoginSuccess();
        } catch (error: any) {
            console.error(error);
            const errorData = error.response?.data;
            let errorMessage = 'Unable to connect to server';

            if (errorData) {
                if (errorData.non_field_errors) {
                    errorMessage = errorData.non_field_errors[0];
                } else if (typeof errorData === 'object') {
                    const firstField = Object.keys(errorData)[0];
                    errorMessage = `${errorData[firstField][0]}`;
                }
            } else if (error.message === 'Network Error') {
                errorMessage = 'Network Error. Check your server IP.';
            }

            Alert.alert('Login Failed', errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.innerContainer}>
                <Text style={styles.title}>Komunity</Text>
                <Text style={styles.subtitle}>Sign in to your account</Text>

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

                <TouchableOpacity
                    style={[styles.button, loading && styles.buttonDisabled]}
                    onPress={handleLogin}
                    disabled={loading}
                >
                    <Text style={styles.buttonText}>
                        {loading ? 'Signing in...' : 'Sign In'}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.signUpLink}
                    onPress={onShowSignUp}
                    disabled={loading}
                >
                    <Text style={styles.signUpLinkText}>
                        Don't have an account? <Text style={styles.signUpLinkBold}>Sign Up</Text>
                    </Text>
                </TouchableOpacity>
            </View>
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
    title: {
        fontSize: 36,
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
    signUpLink: {
        marginTop: 24,
        alignItems: 'center',
    },
    signUpLinkText: {
        color: '#6b7280',
        fontSize: 14,
    },
    signUpLinkBold: {
        color: '#2563eb',
        fontWeight: 'bold',
    },
});

export default LoginScreen;
