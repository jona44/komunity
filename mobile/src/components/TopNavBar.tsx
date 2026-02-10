import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface TopNavBarProps {
    title: string;
    onBack?: () => void;
    rightComponent?: React.ReactNode;
}

const TopNavBar = ({ title, onBack, rightComponent }: TopNavBarProps) => {
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.content}>
                <View style={styles.left}>
                    {onBack && (
                        <TouchableOpacity onPress={onBack} style={styles.backButton}>
                            <Text style={styles.backIcon}>←</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <View style={styles.center}>
                    <Text style={styles.title} numberOfLines={1}>{title}</Text>
                </View>

                <View style={styles.right}>
                    {rightComponent}
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    content: {
        height: 56,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    left: {
        flex: 1,
        alignItems: 'flex-start',
    },
    center: {
        flex: 3,
        alignItems: 'center',
    },
    right: {
        flex: 1,
        alignItems: 'flex-end',
    },
    backButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#eff6ff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    backIcon: {
        fontSize: 20,
        color: '#2563eb',
        fontWeight: 'bold',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
    },
});

export default TopNavBar;
