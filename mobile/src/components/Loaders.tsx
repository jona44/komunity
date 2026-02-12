import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Skeleton from './Skeleton';

const { width } = Dimensions.get('window');

const FeedSkeleton = () => {
    return (
        <View style={styles.card}>
            <View style={styles.header}>
                <Skeleton width={40} height={40} borderRadius={20} />
                <View style={styles.headerMeta}>
                    <Skeleton width={120} height={14} style={{ marginBottom: 6 }} />
                    <Skeleton width={80} height={10} />
                </View>
            </View>
            <Skeleton width="100%" height={250} borderRadius={8} style={{ marginBottom: 12 }} />
            <Skeleton width="90%" height={16} style={{ marginBottom: 8 }} />
            <Skeleton width="60%" height={16} />
        </View>
    );
};

export const FeedPlaceholder = () => (
    <View style={{ padding: 16 }}>
        <FeedSkeleton />
        <FeedSkeleton />
    </View>
);

const GroupSkeleton = () => (
    <View style={styles.groupCard}>
        <Skeleton width="100%" height={140} />
        <View style={{ padding: 16 }}>
            <Skeleton width="50%" height={20} style={{ marginBottom: 8 }} />
            <Skeleton width="30%" height={14} style={{ marginBottom: 16 }} />
            <Skeleton width="100%" height={14} style={{ marginBottom: 8 }} />
            <Skeleton width="100%" height={14} style={{ marginBottom: 16 }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Skeleton width="45%" height={36} borderRadius={18} />
                <Skeleton width="45%" height={36} borderRadius={18} />
            </View>
        </View>
    </View>
);

export const GroupPlaceholder = () => (
    <View style={{ padding: 16 }}>
        <GroupSkeleton />
        <GroupSkeleton />
    </View>
);

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    headerMeta: {
        marginLeft: 12,
    },
    groupCard: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        marginBottom: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#e5e7eb',
    }
});

export default FeedSkeleton;
