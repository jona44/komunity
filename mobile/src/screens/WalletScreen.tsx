import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    ActivityIndicator, SafeAreaView, ScrollView, RefreshControl,
    Modal, TextInput, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import client from '../api/client';
import { authenticateAction } from '../utils/biometrics';

interface Transaction {
    id: number;
    transaction_type: string;
    amount: string;
    status: string;
    timestamp: string;
    destination_group_detail?: {
        name: string;
    };
    recipient_wallet_detail?: {
        user_id: number;
        full_name: string;
    };
    wallet_detail?: {
        user_id: number;
        user_email: string;
        full_name?: string;
    };
}

const WalletScreen = ({ onBack, onViewContributions }: { onBack: () => void; onViewContributions?: () => void }) => {
    const insets = useSafeAreaInsets();
    const [balance, setBalance] = useState<string>('0.00');
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Top Up States
    const [showTopUp, setShowTopUp] = useState(false);
    const [topUpAmount, setTopUpAmount] = useState('');
    const [voucherRef, setVoucherRef] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Send Money States
    const [showSendMoney, setShowSendMoney] = useState(false);
    const [sendAmount, setSendAmount] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [members, setMembers] = useState<any[]>([]);
    const [selectedRecipient, setSelectedRecipient] = useState<any>(null);
    const [isSending, setIsSending] = useState(false);

    // Contribute to Deceased States
    const [showContribute, setShowContribute] = useState(false);
    const [deceasedMembers, setDeceasedMembers] = useState<any[]>([]);
    const [selectedDeceased, setSelectedDeceased] = useState<any>(null);
    const [contributeAmount, setContributeAmount] = useState('');
    const [isContributing, setIsContributing] = useState(false);

    useEffect(() => {
        fetchData();
        fetchMembers();
        fetchDeceasedMembers();
    }, []);

    const fetchData = async () => {
        try {
            const [balanceRes, transRes] = await Promise.all([
                client.get('wallets/balance/'),
                client.get('transactions/')
            ]);
            setBalance(balanceRes.data.balance);
            setTransactions(transRes.data);
        } catch (error) {
            console.error('Error fetching wallet data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const handleTopUp = async () => {
        if (!topUpAmount || parseFloat(topUpAmount) <= 0) {
            Alert.alert('Invalid Amount', 'Please enter a valid amount to top up.');
            return;
        }

        setIsSubmitting(true);
        try {
            await client.post('wallets/top_up/', {
                amount: topUpAmount,
                voucher_reference: voucherRef || `SIM_${Date.now()}`
            });
            Alert.alert('Success', `Successfully topped up ${formatCurrency(topUpAmount)}`);
            setShowTopUp(false);
            setTopUpAmount('');
            setVoucherRef('');
            fetchData(); // Refresh balance and history
        } catch (error: any) {
            console.error('Top up error:', error);
            const errorMsg = error.response?.data?.error || 'Failed to process top-up. Please try again.';
            Alert.alert('Error', errorMsg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const fetchMembers = async () => {
        try {
            // Fetch all groups and their members
            const groupsRes = await client.get('groups/mine/');
            const allMembers: any[] = [];

            for (const group of groupsRes.data) {
                const membersRes = await client.get(`groups/${group.id}/members/`);
                membersRes.data.forEach((membership: any) => {
                    if (!allMembers.find(m => m.member_detail.id === membership.member_detail.id)) {
                        allMembers.push(membership);
                    }
                });
            }

            setMembers(allMembers);
        } catch (error) {
            console.error('Error fetching members:', error);
        }
    };

    const handleSendMoney = async () => {
        if (!selectedRecipient) {
            Alert.alert('No Recipient', 'Please select a member to send money to.');
            return;
        }

        if (!sendAmount || parseFloat(sendAmount) <= 0) {
            Alert.alert('Invalid Amount', 'Please enter a valid amount to send.');
            return;
        }

        if (parseFloat(sendAmount) > parseFloat(balance)) {
            Alert.alert('Insufficient Funds', 'You do not have enough balance for this transfer.');
            return;
        }

        // Authenticate before sending money
        const authenticated = await authenticateAction(`Authenticate to send ${formatCurrency(sendAmount)} to ${selectedRecipient.member_detail.full_name}`);
        if (!authenticated) return;

        setIsSending(true);
        try {
            console.log('Selected recipient:', selectedRecipient);
            console.log('Sending to user ID:', selectedRecipient.member_detail.user);

            const payload = {
                recipient_user_id: selectedRecipient.member_detail.user,
                amount: sendAmount
            };

            console.log('Send money payload:', payload);

            await client.post('wallets/send_money/', payload);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('Success', `Successfully sent ${formatCurrency(sendAmount)} to ${selectedRecipient.member_detail.full_name}`);
            setShowSendMoney(false);
            setSendAmount('');
            setSelectedRecipient(null);
            setSearchQuery('');
            fetchData(); // Refresh balance and history
        } catch (error: any) {
            console.error('Send money error:', error);
            console.error('Error response:', error.response?.data);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            const errorMsg = error.response?.data?.error || 'Failed to send money. Please try again.';
            Alert.alert('Error', errorMsg);
        } finally {
            setIsSending(false);
        }
    };

    const fetchDeceasedMembers = async () => {
        try {
            const response = await client.get('deceased/');
            setDeceasedMembers(response.data);
        } catch (error) {
            console.error('Error fetching deceased members:', error);
        }
    };

    const handleContributeToDeceased = async () => {
        if (!selectedDeceased) {
            Alert.alert('No Selection', 'Please select a deceased member to contribute to.');
            return;
        }

        if (!contributeAmount || parseFloat(contributeAmount) <= 0) {
            Alert.alert('Invalid Amount', 'Please enter a valid amount to contribute.');
            return;
        }

        if (parseFloat(contributeAmount) > parseFloat(balance)) {
            Alert.alert('Insufficient Funds', 'You do not have enough balance for this contribution.');
            return;
        }

        // Authenticate before contribution
        const authenticated = await authenticateAction(`Authenticate to contribute ${formatCurrency(contributeAmount)} to ${selectedDeceased.deceased_detail.full_name}'s fund`);
        if (!authenticated) return;

        setIsContributing(true);
        try {
            const response = await client.post('wallets/contribute_to_deceased/', {
                deceased_id: selectedDeceased.id,
                amount: contributeAmount
            });
            Alert.alert(
                'Contribution Successful',
                `You contributed ${formatCurrency(contributeAmount)} to ${selectedDeceased.deceased_detail.full_name}'s fund.\n\nTotal raised: ${formatCurrency(response.data.contribution.total_raised)}`
            );
            setShowContribute(false);
            setContributeAmount('');
            setSelectedDeceased(null);
            fetchData(); // Refresh balance and history
            fetchDeceasedMembers(); // Refresh deceased list
        } catch (error: any) {
            console.error('Contribution error:', error);
            const errorMsg = error.response?.data?.error || 'Failed to process contribution. Please try again.';
            Alert.alert('Error', errorMsg);
        } finally {
            setIsContributing(false);
        }
    };

    const formatCurrency = (amount: string) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(parseFloat(amount));
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const getTransactionIcon = (type: string) => {
        switch (type) {
            case 'TOP_UP': return '💰';
            case 'TRANSFER': return '📤';
            case 'WITHDRAWAL': return '📥';
            case 'PAYOUT_RECEIVED': return '🎁';
            case 'P2P_SENT': return '💸';
            case 'P2P_RECEIVED': return '💵';
            default: return '💸';
        }
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#2563eb" />
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Text style={styles.backButtonText}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Wallet</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                <View style={styles.balanceCard}>
                    <Text style={styles.balanceLabel}>Current Balance</Text>
                    <Text style={styles.balanceAmount}>{formatCurrency(balance)}</Text>

                    <View style={styles.quickActions}>
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => setShowTopUp(true)}
                        >
                            <Text style={styles.actionIcon}>➕</Text>
                            <Text style={styles.actionText}>Top Up</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => setShowSendMoney(true)}
                        >
                            <Text style={styles.actionIcon}>💸</Text>
                            <Text style={styles.actionText}>Send</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => setShowContribute(true)}
                        >
                            <Text style={styles.actionIcon}>🕊️</Text>
                            <Text style={styles.actionText}>Contribute</Text>
                        </TouchableOpacity>
                        {onViewContributions && (
                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={onViewContributions}
                            >
                                <Text style={styles.actionIcon}>📋</Text>
                                <Text style={styles.actionText}>History</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                <Text style={styles.sectionTitle}>Transaction History</Text>

                {transactions.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyStateText}>No transactions yet.</Text>
                    </View>
                ) : (
                    transactions.map((item) => (
                        <View key={item.id} style={styles.transactionItem}>
                            <View style={styles.transactionIconContainer}>
                                <Text style={styles.transactionIcon}>{getTransactionIcon(item.transaction_type)}</Text>
                            </View>
                            <View style={styles.transactionDetails}>
                                <Text style={styles.transactionType}>
                                    {item.transaction_type.replace('_', ' ')}
                                </Text>
                                {item.destination_group_detail && (
                                    <Text style={styles.destinationText}>To: {item.destination_group_detail.name}</Text>
                                )}
                                {item.recipient_wallet_detail && (
                                    <Text style={styles.destinationText}>To: {item.recipient_wallet_detail.full_name}</Text>
                                )}
                                {item.transaction_type === 'P2P_RECEIVED' && item.wallet_detail && (
                                    <Text style={styles.destinationText}>From: {item.wallet_detail.full_name || item.wallet_detail.user_email}</Text>
                                )}
                                <Text style={styles.transactionDate}>{formatDate(item.timestamp)}</Text>
                            </View>
                            <View style={styles.amountContainer}>
                                <Text style={[
                                    styles.transactionAmount,
                                    (item.transaction_type === 'TRANSFER' || item.transaction_type === 'WITHDRAWAL' || item.transaction_type === 'P2P_SENT') ? styles.negativeAmount : styles.positiveAmount
                                ]}>
                                    {(item.transaction_type === 'TRANSFER' || item.transaction_type === 'WITHDRAWAL' || item.transaction_type === 'P2P_SENT') ? '-' : '+'}
                                    {formatCurrency(item.amount)}
                                </Text>
                                <View style={[
                                    styles.statusBadge,
                                    item.status === 'COMPLETED' ? styles.statusCOMPLETED :
                                        item.status === 'PENDING' ? styles.statusPENDING :
                                            styles.statusFAILED
                                ]}>
                                    <Text style={[
                                        styles.statusText,
                                        item.status === 'COMPLETED' ? styles.statusTextCOMPLETED : {}
                                    ]}>{item.status}</Text>
                                </View>
                            </View>
                        </View>
                    ))
                )}
            </ScrollView>

            <Modal
                visible={showTopUp}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowTopUp(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Top Up Wallet</Text>
                            <TouchableOpacity onPress={() => setShowTopUp(false)}>
                                <Text style={styles.closeButton}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.inputLabel}>Amount (USD)</Text>
                        <TextInput
                            style={styles.textInput}
                            placeholder="0.00"
                            keyboardType="decimal-pad"
                            value={topUpAmount}
                            onChangeText={setTopUpAmount}
                            placeholderTextColor="#9ca3af"
                        />

                        <View style={styles.presets}>
                            {['10', '25', '50', '100'].map((amt) => (
                                <TouchableOpacity
                                    key={amt}
                                    style={styles.presetBtn}
                                    onPress={() => setTopUpAmount(amt)}
                                >
                                    <Text style={styles.presetText}>${amt}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.inputLabel}>Voucher Reference (Optional)</Text>
                        <TextInput
                            style={styles.textInput}
                            placeholder="Enter voucher code"
                            value={voucherRef}
                            onChangeText={setVoucherRef}
                            placeholderTextColor="#9ca3af"
                        />

                        <TouchableOpacity
                            style={[styles.submitButton, isSubmitting && styles.disabledButton]}
                            onPress={handleTopUp}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator color="#ffffff" />
                            ) : (
                                <Text style={styles.submitButtonText}>Confirm Deposit</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            <Modal
                visible={showSendMoney}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowSendMoney(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Send Money</Text>
                            <TouchableOpacity onPress={() => {
                                setShowSendMoney(false);
                                setSelectedRecipient(null);
                                setSendAmount('');
                                setSearchQuery('');
                            }}>
                                <Text style={styles.closeButton}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        {!selectedRecipient ? (
                            <>
                                <Text style={styles.inputLabel}>Select Recipient</Text>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="Search members..."
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                    placeholderTextColor="#9ca3af"
                                />
                                <ScrollView style={styles.memberList}>
                                    {members
                                        .filter(m =>
                                            m.member_detail.full_name.toLowerCase().includes(searchQuery.toLowerCase())
                                        )
                                        .map((member) => (
                                            <TouchableOpacity
                                                key={member.id}
                                                style={styles.memberItem}
                                                onPress={() => setSelectedRecipient(member)}
                                            >
                                                <View style={styles.memberAvatar}>
                                                    {member.member_detail.profile_picture ? (
                                                        <Image
                                                            source={{ uri: member.member_detail.profile_picture }}
                                                            style={styles.avatarImg}
                                                        />
                                                    ) : (
                                                        <Text style={styles.avatarInitial}>
                                                            {member.member_detail.full_name[0].toUpperCase()}
                                                        </Text>
                                                    )}
                                                </View>
                                                <Text style={styles.memberName}>{member.member_detail.full_name}</Text>
                                            </TouchableOpacity>
                                        ))
                                    }
                                </ScrollView>
                            </>
                        ) : (
                            <>
                                <View style={styles.selectedRecipient}>
                                    <View style={styles.memberAvatar}>
                                        {selectedRecipient.member_detail.profile_picture ? (
                                            <Image
                                                source={{ uri: selectedRecipient.member_detail.profile_picture }}
                                                style={styles.avatarImg}
                                            />
                                        ) : (
                                            <Text style={styles.avatarInitial}>
                                                {selectedRecipient.member_detail.full_name[0].toUpperCase()}
                                            </Text>
                                        )}
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.recipientName}>{selectedRecipient.member_detail.full_name}</Text>
                                        <TouchableOpacity onPress={() => setSelectedRecipient(null)}>
                                            <Text style={styles.changeRecipient}>Change recipient</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                <Text style={styles.inputLabel}>Amount (USD)</Text>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="0.00"
                                    keyboardType="decimal-pad"
                                    value={sendAmount}
                                    onChangeText={setSendAmount}
                                    placeholderTextColor="#9ca3af"
                                />

                                <View style={styles.presets}>
                                    {['5', '10', '25', '50'].map((amt) => (
                                        <TouchableOpacity
                                            key={amt}
                                            style={styles.presetBtn}
                                            onPress={() => setSendAmount(amt)}
                                        >
                                            <Text style={styles.presetText}>${amt}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                <TouchableOpacity
                                    style={[styles.submitButton, isSending && styles.disabledButton]}
                                    onPress={handleSendMoney}
                                    disabled={isSending}
                                >
                                    {isSending ? (
                                        <ActivityIndicator color="#ffffff" />
                                    ) : (
                                        <Text style={styles.submitButtonText}>Send Money</Text>
                                    )}
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            <Modal
                visible={showContribute}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowContribute(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Contribute to Memorial Fund</Text>
                            <TouchableOpacity onPress={() => {
                                setShowContribute(false);
                                setSelectedDeceased(null);
                                setContributeAmount('');
                            }}>
                                <Text style={styles.closeButton}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        {!selectedDeceased ? (
                            <>
                                <Text style={styles.inputLabel}>Select Deceased Member</Text>
                                <ScrollView style={styles.memberList}>
                                    {deceasedMembers.map((deceased) => (
                                        <TouchableOpacity
                                            key={deceased.id}
                                            style={styles.deceasedItem}
                                            onPress={() => setSelectedDeceased(deceased)}
                                        >
                                            <View style={styles.memberAvatar}>
                                                {deceased.deceased_detail.profile_picture ? (
                                                    <Image
                                                        source={{ uri: deceased.deceased_detail.profile_picture }}
                                                        style={styles.avatarImg}
                                                    />
                                                ) : (
                                                    <Text style={styles.avatarInitial}>
                                                        {deceased.deceased_detail.full_name[0].toUpperCase()}
                                                    </Text>
                                                )}
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.memberName}>{deceased.deceased_detail.full_name}</Text>
                                                <Text style={styles.fundProgress}>
                                                    Raised: {formatCurrency(deceased.total_raised.toString())}
                                                </Text>
                                            </View>
                                            <Text style={styles.chevron}>›</Text>
                                        </TouchableOpacity>
                                    ))}
                                    {deceasedMembers.length === 0 && (
                                        <View style={styles.emptyState}>
                                            <Text style={styles.emptyStateText}>No active memorial funds at this time.</Text>
                                        </View>
                                    )}
                                </ScrollView>
                            </>
                        ) : (
                            <>
                                <View style={styles.selectedRecipient}>
                                    <View style={styles.memberAvatar}>
                                        {selectedDeceased.deceased_detail.profile_picture ? (
                                            <Image
                                                source={{ uri: selectedDeceased.deceased_detail.profile_picture }}
                                                style={styles.avatarImg}
                                            />
                                        ) : (
                                            <Text style={styles.avatarInitial}>
                                                {selectedDeceased.deceased_detail.full_name[0].toUpperCase()}
                                            </Text>
                                        )}
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.recipientName}>{selectedDeceased.deceased_detail.full_name}</Text>
                                        <Text style={styles.fundProgress}>
                                            Total raised: {formatCurrency(selectedDeceased.total_raised.toString())}
                                        </Text>
                                        <TouchableOpacity onPress={() => setSelectedDeceased(null)}>
                                            <Text style={styles.changeRecipient}>Change selection</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                <Text style={styles.inputLabel}>Contribution Amount (USD)</Text>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="0.00"
                                    keyboardType="decimal-pad"
                                    value={contributeAmount}
                                    onChangeText={setContributeAmount}
                                    placeholderTextColor="#9ca3af"
                                />

                                <View style={styles.presets}>
                                    {['10', '25', '50', '100'].map((amt) => (
                                        <TouchableOpacity
                                            key={amt}
                                            style={styles.presetBtn}
                                            onPress={() => setContributeAmount(amt)}
                                        >
                                            <Text style={styles.presetText}>${amt}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                <TouchableOpacity
                                    style={[styles.submitButton, isContributing && styles.disabledButton]}
                                    onPress={handleContributeToDeceased}
                                    disabled={isContributing}
                                >
                                    {isContributing ? (
                                        <ActivityIndicator color="#ffffff" />
                                    ) : (
                                        <Text style={styles.submitButtonText}>Contribute</Text>
                                    )}
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f3f4f6',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
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
    scrollContent: {
        padding: 16,
    },
    balanceCard: {
        backgroundColor: '#2563eb',
        borderRadius: 16,
        padding: 24,
        marginBottom: 24,
        alignItems: 'center',
        shadowColor: '#2563eb',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    balanceLabel: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    balanceAmount: {
        color: '#ffffff',
        fontSize: 36,
        fontWeight: 'bold',
        marginBottom: 24,
    },
    quickActions: {
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'space-around',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.2)',
        paddingTop: 20,
    },
    actionButton: {
        alignItems: 'center',
    },
    actionIcon: {
        fontSize: 24,
        marginBottom: 4,
    },
    actionText: {
        color: '#ffffff',
        fontSize: 12,
        fontWeight: '600',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 16,
    },
    transactionItem: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    transactionIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#f3f4f6',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    transactionIcon: {
        fontSize: 20,
    },
    transactionDetails: {
        flex: 1,
    },
    transactionType: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
        textTransform: 'capitalize',
    },
    destinationText: {
        fontSize: 13,
        color: '#6b7280',
        marginTop: 2,
    },
    transactionDate: {
        fontSize: 12,
        color: '#9ca3af',
        marginTop: 4,
    },
    amountContainer: {
        alignItems: 'flex-end',
    },
    transactionAmount: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    positiveAmount: {
        color: '#10b981',
    },
    negativeAmount: {
        color: '#ef4444',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    statusText: {
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    statusCOMPLETED: {
        backgroundColor: '#d1fae5',
    },
    statusTextCOMPLETED: {
        color: '#065f46',
    },
    statusPENDING: {
        backgroundColor: '#fef3c7',
    },
    statusFAILED: {
        backgroundColor: '#fee2e2',
    },
    emptyState: {
        padding: 40,
        alignItems: 'center',
    },
    emptyStateText: {
        color: '#6b7280',
        fontSize: 16,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#ffffff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111827',
    },
    closeButton: {
        fontSize: 20,
        color: '#9ca3af',
        padding: 4,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#4b5563',
        marginBottom: 8,
    },
    textInput: {
        backgroundColor: '#f9fafb',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 12,
        padding: 16,
        fontSize: 18,
        color: '#111827',
        marginBottom: 16,
    },
    presets: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    presetBtn: {
        backgroundColor: '#eff6ff',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#dbeafe',
    },
    presetText: {
        color: '#2563eb',
        fontWeight: '600',
    },
    submitButton: {
        backgroundColor: '#2563eb',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: '#2563eb',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    submitButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    disabledButton: {
        opacity: 0.5,
    },
    memberList: {
        maxHeight: 300,
        marginBottom: 16,
    },
    memberItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#f9fafb',
        borderRadius: 8,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    memberAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#eff6ff',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#dbeafe',
    },
    avatarImg: {
        width: '100%',
        height: '100%',
    },
    avatarInitial: {
        color: '#2563eb',
        fontWeight: 'bold',
        fontSize: 16,
    },
    memberName: {
        fontSize: 16,
        color: '#111827',
        fontWeight: '600',
    },
    selectedRecipient: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#eff6ff',
        borderRadius: 12,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#dbeafe',
    },
    recipientName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 4,
    },
    changeRecipient: {
        fontSize: 13,
        color: '#2563eb',
        fontWeight: '600',
    },
    deceasedItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#f9fafb',
        borderRadius: 8,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    fundProgress: {
        fontSize: 13,
        color: '#10b981',
        fontWeight: '600',
        marginTop: 2,
    },
    chevron: {
        fontSize: 20,
        color: '#9ca3af',
        marginLeft: 8,
    },
});

export default WalletScreen;
