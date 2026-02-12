import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

import { Platform } from 'react-native';

const API_BASE_URL = 'http://192.168.88.236:8000/api/v1/'; // Use machine IP for mobile devices

const TOKEN_KEY = 'komunity_auth_token';

const client = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const setAuthToken = (token: string | null) => {
    if (token) {
        client.defaults.headers.common['Authorization'] = `Token ${token}`;
    } else {
        delete client.defaults.headers.common['Authorization'];
    }
};

/** Save auth token to secure storage */
export const saveToken = async (token: string): Promise<void> => {
    try {
        if (Platform.OS === 'web') {
            localStorage.setItem(TOKEN_KEY, token);
        } else {
            await SecureStore.setItemAsync(TOKEN_KEY, token);
        }
    } catch (error) {
        console.error('Error saving token to secure storage:', error);
    }
};

/** Load auth token from secure storage and set it on the client */
export const loadToken = async (): Promise<string | null> => {
    try {
        let token: string | null = null;
        if (Platform.OS === 'web') {
            token = localStorage.getItem(TOKEN_KEY);
        } else {
            token = await SecureStore.getItemAsync(TOKEN_KEY);
        }

        if (token) {
            setAuthToken(token);
        }
        return token;
    } catch (error) {
        console.error('Error loading token from secure storage:', error);
        return null;
    }
};

/** Clear auth token from secure storage and client headers */
export const clearToken = async (): Promise<void> => {
    try {
        setAuthToken(null);
        if (Platform.OS === 'web') {
            localStorage.removeItem(TOKEN_KEY);
        } else {
            await SecureStore.deleteItemAsync(TOKEN_KEY);
        }
    } catch (error) {
        console.error('Error clearing token from secure storage:', error);
    }
};

export default client;
