import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, Alert, RefreshControl
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import client from '../api/client';

interface Transaction {
    id: number;
    transaction_type: string;
    amount: string;
    status: string;
    timestamp: string;
    wallet_detail?: {
        user_email: string;
        full_name?: string;
    };
}

interface GroupWalletScreenProps {
    group: any;
    onBack: () => void;
}

const GroupWalletScreen = ({ group, onBack }: GroupWalletScreenProps) => {
    const insets = useSafeAreaInsets();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [balance, setBalance] = useState<string>(group.balance || '0.00');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [walletRes, transRes] = await Promise.all([
                client.get(`groups/${group.id}/`),
                client.get(`groups/${group.id}/transactions/`)
            ]);
            setBalance(walletRes.data.balance);
            setTransactions(transRes.data);
        } catch (error) {
            console.error('Error fetching group wallet data:', error);
            Alert.alert('Error', 'Failed to load group wallet information');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const formatCurrency = (amount: string) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(parseFloat(amount));
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getTransactionIcon = (type: string) => {
        switch (type) {
            case 'TRANSFER': return '📥';
            case 'PAYOUT_RECEIVED': return '📤';
            default: return '💰';
        }
    };

    const getTransactionLabel = (type: string) => {
        switch (type) {
            case 'TRANSFER': return 'Contribution';
            case 'PAYOUT_RECEIVED': return 'Disbursement';
            default: return type;
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
                <ActivityIndicator size="large" color="#2563eb" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView
                style={styles.content}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                {/* Group Balance Card */}
                <View style={styles.balanceCard}>
                    <Text style={styles.balanceLabel}>{group.name} Total Funds</Text>
                    <Text style={styles.balanceAmount}>{formatCurrency(balance)}</Text>
                    <View style={styles.fundInfo}>
                        <Text style={styles.fundInfoText}>
                            Transparently managed for the benefit of all community members.
                        </Text>
                    </View>
                </View>

                {/* Transaction History */}
                <Text style={styles.sectionTitle}>Fund History</Text>

                {transactions.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyStateText}>No transactions yet.</Text>
                    </View>
                ) : (
                    transactions.map((item) => (
                        <View key={item.id} style={styles.transactionItem}>
                            <View style={styles.itemIconContainer}>
                                <Text style={styles.itemIcon}>{getTransactionIcon(item.transaction_type)}</Text>
                            </View>
                            <View style={styles.itemContent}>
                                <View style={styles.itemHeader}>
                                    <Text style={styles.itemType}>{getTransactionLabel(item.transaction_type)}</Text>
                                    <Text style={[
                                        styles.itemAmount,
                                        item.transaction_type === 'TRANSFER' ? styles.positiveAmount : styles.negativeAmount
                                    ]}>
                                        {item.transaction_type === 'TRANSFER' ? '+' : '-'}{formatCurrency(item.amount)}
                                    </Text>
                                </View>
                                <View style={styles.itemFooter}>
                                    <Text style={styles.itemUser}>
                                        {item.wallet_detail?.full_name || item.wallet_detail?.user_email || 'Member'}
                                    </Text>
                                    <Text style={styles.itemDate}>{formatDate(item.timestamp)}</Text>
                                </View>
                            </View>
                        </View>
                    ))
                )}

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
        marginHorizontal: 16,
    },
    balanceCard: {
        backgroundColor: '#2563eb',
        borderRadius: 20,
        padding: 24,
        marginTop: 20,
        marginBottom: 24,
        alignItems: 'center',
        shadowColor: '#2563eb',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
        elevation: 8,
    },
    balanceLabel: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
        textAlign: 'center',
    },
    balanceAmount: {
        color: '#ffffff',
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    fundInfo: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 12,
    },
    fundInfoText: {
        color: 'rgba(255, 255, 255, 0.9)',
        fontSize: 12,
        textAlign: 'center',
        fontStyle: 'italic',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 16,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyStateText: {
        color: '#6b7280',
        fontSize: 16,
    },
    transactionItem: {
        flexDirection: 'row',
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#f3f4f6',
    },
    itemIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#eff6ff',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    itemIcon: {
        fontSize: 24,
    },
    itemContent: {
        flex: 1,
    },
    itemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    itemType: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
    },
    itemAmount: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    positiveAmount: {
        color: '#10b981',
    },
    negativeAmount: {
        color: '#ef4444',
    },
    itemFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    itemUser: {
        fontSize: 12,
        color: '#6b7280',
    },
    itemDate: {
        fontSize: 12,
        color: '#9ca3af',
    },
});

export default GroupWalletScreen;
