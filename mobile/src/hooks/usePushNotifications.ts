import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import client from '../api/client';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

if (!isExpoGo) {
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
            shouldShowBanner: true,
            shouldShowList: true,
        }),
    });
}

async function registerForPushNotificationsAsync() {
    if (isExpoGo) {
        console.log('Skipping push notification registration in Expo Go');
        return;
    }

    let token;

    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
        });
    }

    if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }
        if (finalStatus !== 'granted') {
            console.log('Failed to get push token for push notification!');
            return;
        }

        // Get the project ID (optional but recommended for EAS)
        const projectId =
            Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;

        // If no projectId is found, we can't reliably get an Expo push token
        if (!projectId) {
            console.log('No projectId found in app config. Skipping token registration.');
            return;
        }

        try {
            const pushTokenString = (
                await Notifications.getExpoPushTokenAsync({
                    projectId,
                })
            ).data;
            return pushTokenString;
        } catch (e: unknown) {
            console.warn('Push notifications: Failed to get push token.', e);
        }
    } else {
        console.log('Must use physical device for Push Notifications');
    }
}

export const usePushNotifications = () => {
    const [expoPushToken, setExpoPushToken] = useState<string | undefined>('');

    const registerToken = async () => {
        const token = await registerForPushNotificationsAsync();
        if (token) {
            setExpoPushToken(token);
            try {
                // Send to backend
                await client.post('device-tokens/register/', {
                    token: token,
                    platform: Platform.OS
                });
                console.log('Push token registered successfully:', token);
            } catch (error) {
                console.error('Error registering push token on backend:', error);
            }
        }
    };

    return { registerToken, expoPushToken };
}
