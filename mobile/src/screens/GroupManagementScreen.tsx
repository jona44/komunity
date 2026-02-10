import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    ActivityIndicator, Image, Alert, ScrollView
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import client from '../api/client';

interface Member {
    id: number;
    member_detail: {
        id: number;
        full_name: string;
        profile_picture: string | null;
    };
    status: string;
    role: string;
    date_joined: string;
    is_deceased: boolean;
}

interface DeceasedMember {
    id: number;
    deceased_detail: {
        id: number;
        full_name: string;
        profile_picture: string | null;
    };
    total_raised: string;
    total_disbursed: string;
    balance: string;
    beneficiary_detail: {
        id: number;
        full_name: string;
    } | null;
    funds_disbursed: boolean;
}

type ManagementItem = Member | DeceasedMember;

interface GroupManagementProps {
    group: { id: number; name: string };
    onBack: () => void;
    onSelectMember: (membership: any) => void;
    onViewWallet: () => void;
}

const GroupManagementScreen = ({ group, onBack, onSelectMember, onViewWallet }: GroupManagementProps) => {
    const insets = useSafeAreaInsets();
    const [pendingMembers, setPendingMembers] = useState<Member[]>([]);
    const [activeMembers, setActiveMembers] = useState<Member[]>([]);
    const [deceasedMembers, setDeceasedMembers] = useState<DeceasedMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState<'pending' | 'members' | 'payouts'>('pending');

    // Beneficiary selection state
    const [isAssigningBeneficiary, setIsAssigningBeneficiary] = useState<number | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [pendingRes, activeRes, deceasedRes] = await Promise.all([
                client.get(`groups/${group.id}/pending_members/`),
                client.get(`groups/${group.id}/members/`),
                client.get(`deceased/?group=${group.id}`)
            ]);
            setPendingMembers(pendingRes.data);
            setActiveMembers(activeRes.data);
            setDeceasedMembers(deceasedRes.data);
        } catch (error) {
            console.error('Error fetching data:', error);
            Alert.alert('Error', 'Failed to load group information.');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (membershipId: number) => {
        setProcessingId(membershipId);
        try {
            await client.post(`memberships/${membershipId}/approve/`);
            fetchData();
            Alert.alert('Approved', 'Member has been added to the community.');
        } catch (error) {
            console.error('Error approving member:', error);
            Alert.alert('Error', 'Failed to approve member.');
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (membershipId: number) => {
        setProcessingId(membershipId);
        try {
            await client.post(`memberships/${membershipId}/reject/`);
            fetchData();
            Alert.alert('Rejected', 'The membership request was declined.');
        } catch (error) {
            console.error('Error rejecting member:', error);
            Alert.alert('Error', 'Failed to reject member.');
        } finally {
            setProcessingId(null);
        }
    };

    const handleDisburse = async (deceasedId: number) => {
        const deceased = deceasedMembers.find(d => d.id === deceasedId);
        if (!deceased) return;

        if (!deceased.beneficiary_detail) {
            Alert.alert('Incomplete Profile', 'Please assign a beneficiary to this deceased member before disbursing funds.');
            return;
        }

        Alert.alert(
            'Confirm Payout',
            `Disburse $${deceased.balance} to ${deceased.beneficiary_detail.full_name}? This action is irreversible.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Disburse',
                    style: 'destructive',
                    onPress: async () => {
                        setProcessingId(deceasedId);
                        try {
                            await client.post(`deceased/${deceasedId}/disburse_funds/`);
                            Alert.alert('Success', 'Funds have been disbursed to the beneficiary.');
                            fetchData();
                        } catch (error: any) {
                            console.error('Disbursement error:', error);
                            const msg = error.response?.data?.error || 'Failed to disburse funds.';
                            Alert.alert('Error', msg);
                        } finally {
                            setProcessingId(null);
                        }
                    }
                }
            ]
        );
    };

    const handleAssignBeneficiary = async (deceasedId: number, profileId: number) => {
        setProcessingId(deceasedId);
        try {
            await client.patch(`deceased/${deceasedId}/`, {
                beneficiary: profileId
            });
            Alert.alert('Success', 'Beneficiary assigned successfully.');
            setIsAssigningBeneficiary(null);
            fetchData();
        } catch (error) {
            console.error('Error assigning beneficiary:', error);
            Alert.alert('Error', 'Failed to assign beneficiary.');
        } finally {
            setProcessingId(null);
        }
    };

    const renderMemberItem = ({ item }: { item: Member }) => (
        <TouchableOpacity
            style={styles.requestCard}
            onPress={() => onSelectMember(item)}
            activeOpacity={0.7}
        >
            <View style={styles.memberInfo}>
                <View style={styles.avatarCircle}>
                    {item.member_detail.profile_picture ? (
                        <Image
                            source={{ uri: item.member_detail.profile_picture }}
                            style={styles.avatarImg}
                        />
                    ) : (
                        <Text style={styles.avatarInitial}>
                            {item.member_detail.full_name[0].toUpperCase()}
                        </Text>
                    )}
                </View>
                <View style={styles.memberMeta}>
                    <Text style={styles.memberName}>{item.member_detail.full_name}</Text>
                    <Text style={styles.requestDate}>
                        Joined {new Date(item.date_joined).toLocaleDateString()}
                    </Text>
                </View>
                {item.is_deceased && (
                    <View style={styles.deceasedBadge}>
                        <Text style={styles.deceasedBadgeText}>DECEASED</Text>
                    </View>
                )}
            </View>

            {activeTab === 'pending' && (
                <View style={styles.actions}>
                    <TouchableOpacity
                        style={[styles.actionButton, styles.approveButton, processingId === item.id && styles.disabledButton]}
                        onPress={() => handleApprove(item.id)}
                        disabled={processingId !== null}
                    >
                        <Text style={styles.approveButtonText}>Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionButton, styles.rejectButton, processingId === item.id && styles.disabledButton]}
                        onPress={() => handleReject(item.id)}
                        disabled={processingId !== null}
                    >
                        <Text style={styles.rejectButtonText}>Reject</Text>
                    </TouchableOpacity>
                </View>
            )}
        </TouchableOpacity>
    );

    const renderDeceasedItem = ({ item }: { item: DeceasedMember }) => (
        <View style={styles.requestCard}>
            <View style={styles.memberInfo}>
                <View style={styles.avatarCircle}>
                    {item.deceased_detail.profile_picture ? (
                        <Image
                            source={{ uri: item.deceased_detail.profile_picture }}
                            style={styles.avatarImg}
                        />
                    ) : (
                        <Text style={styles.avatarInitial}>
                            {item.deceased_detail.full_name[0].toUpperCase()}
                        </Text>
                    )}
                </View>
                <View style={styles.memberMeta}>
                    <Text style={styles.memberName}>{item.deceased_detail.full_name}</Text>
                    <Text style={styles.requestDate}>Fund Management</Text>
                </View>
                {parseFloat(item.total_disbursed) > 0 ? (
                    <TouchableOpacity
                        style={[styles.deceasedBadge, { backgroundColor: '#d1fae5', borderColor: '#6ee7b7' }]}
                        onPress={onViewWallet}
                    >
                        <Text style={[styles.deceasedBadgeText, { color: '#065f46' }]}>
                            {parseFloat(item.balance) === 0 ? 'PAID' : 'PARTIALLY PAID'} 🔗
                        </Text>
                    </TouchableOpacity>
                ) : (
                    <View style={styles.deceasedBadge}>
                        <Text style={styles.deceasedBadgeText}>ACTIVE</Text>
                    </View>
                )}
            </View>

            {/* Comprehensive Stats Section */}
            <View style={styles.statsGrid}>
                <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Raised</Text>
                    <Text style={styles.statValue}>${item.total_raised}</Text>
                </View>
                <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Disbursed</Text>
                    <Text style={[styles.statValue, { color: '#ef4444' }]}>${item.total_disbursed}</Text>
                </View>
                <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Wallet Balance</Text>
                    <Text style={[styles.statValue, { color: '#10b981' }]}>${item.balance}</Text>
                </View>
            </View>

            <View style={styles.beneficiarySection}>
                <View style={styles.beneficiaryHeader}>
                    <Text style={styles.beneficiaryTitle}>Beneficiary Details</Text>
                    {!item.funds_disbursed && (
                        <TouchableOpacity onPress={() => setIsAssigningBeneficiary(item.id)}>
                            <Text style={styles.assignLink}>
                                {item.beneficiary_detail ? 'Change' : 'Assign Beneficiary'}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
                {item.beneficiary_detail ? (
                    <View style={styles.beneficiaryNameContainer}>
                        <Text style={styles.beneficiaryEmoji}>👤</Text>
                        <Text style={styles.beneficiaryName}>{item.beneficiary_detail.full_name}</Text>
                    </View>
                ) : (
                    <View style={styles.emptyBeneficiary}>
                        <Text style={styles.emptyBeneficiaryText}>No beneficiary assigned yet.</Text>
                    </View>
                )}
            </View>

            {parseFloat(item.balance) > 0 && (
                <TouchableOpacity
                    style={[styles.disburseButton, processingId === item.id && styles.disabledButton]}
                    onPress={() => handleDisburse(item.id)}
                    disabled={processingId !== null}
                >
                    {processingId === item.id ? (
                        <ActivityIndicator color="#ffffff" size="small" />
                    ) : (
                        <Text style={styles.disburseButtonText}>Disburse ${item.balance}</Text>
                    )}
                </TouchableOpacity>
            )}
        </View>
    );

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.subHeader}>
                <Text style={styles.groupName}>{group.name}</Text>

                <View style={styles.tabs}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'pending' && styles.activeTab]}
                        onPress={() => setActiveTab('pending')}
                    >
                        <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>
                            Pending ({pendingMembers.length})
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'members' && styles.activeTab]}
                        onPress={() => setActiveTab('members')}
                    >
                        <Text style={[styles.tabText, activeTab === 'members' && styles.activeTabText]}>
                            Members ({activeMembers.length})
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'payouts' && styles.activeTab]}
                        onPress={() => setActiveTab('payouts')}
                    >
                        <Text style={[styles.tabText, activeTab === 'payouts' && styles.activeTabText]}>
                            Payouts ({deceasedMembers.length})
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color="#2563eb" />
                </View>
            ) : (
                <FlatList
                    data={
                        (activeTab === 'pending' ? pendingMembers :
                            activeTab === 'members' ? activeMembers :
                                deceasedMembers) as ManagementItem[]
                    }
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={styles.listContent}
                    renderItem={({ item }) => {
                        if (activeTab === 'payouts') {
                            return renderDeceasedItem({ item: item as DeceasedMember });
                        }
                        return renderMemberItem({ item: item as Member });
                    }}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>
                                {activeTab === 'pending' ? 'No pending requests.' :
                                    activeTab === 'members' ? 'No active members.' :
                                        'No funeral funds recorded.'}
                            </Text>
                        </View>
                    }
                />
            )}

            {/* Beneficiary Selection Modal */}
            {isAssigningBeneficiary && (
                <View style={[styles.modalOverlay, { paddingTop: insets.top }]}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Select Beneficiary</Text>
                        <Text style={styles.modalSubtitle}>Assign a community member to receive the funds.</Text>
                        <ScrollView style={styles.memberScrollView}>
                            {activeMembers.map((member) => (
                                <TouchableOpacity
                                    key={member.id}
                                    style={styles.modalMemberItem}
                                    onPress={() => handleAssignBeneficiary(isAssigningBeneficiary, member.member_detail.id)}
                                >
                                    <View style={styles.modalMemberAvatar}>
                                        <Text style={styles.modalAvatarText}>{member.member_detail.full_name[0]}</Text>
                                    </View>
                                    <Text style={styles.modalMemberName}>{member.member_detail.full_name}</Text>
                                    <Text style={styles.modalSelectText}>Select</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                        <TouchableOpacity
                            style={styles.modalCloseButton}
                            onPress={() => setIsAssigningBeneficiary(null)}
                        >
                            <Text style={styles.modalCloseButtonText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
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
    subHeader: {
        padding: 16,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    groupName: {
        fontSize: 14,
        color: '#2563eb',
        fontWeight: 'bold',
        marginBottom: 12,
    },
    tabs: {
        flexDirection: 'row',
        backgroundColor: '#f3f4f6',
        borderRadius: 8,
        padding: 4,
    },
    tab: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 6,
    },
    activeTab: {
        backgroundColor: '#ffffff',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    tabText: {
        fontSize: 14,
        color: '#6b7280',
        fontWeight: '600',
    },
    activeTabText: {
        color: '#2563eb',
    },
    listContent: {
        padding: 16,
    },
    requestCard: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    memberInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    avatarCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
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
        fontSize: 18,
    },
    memberMeta: {
        flex: 1,
    },
    memberName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    requestDate: {
        fontSize: 13,
        color: '#6b7280',
    },
    deceasedBadge: {
        backgroundColor: '#fee2e2',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#fecaca',
    },
    deceasedBadgeText: {
        color: '#b91c1c',
        fontSize: 10,
        fontWeight: 'bold',
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    actionButton: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
    },
    approveButton: {
        backgroundColor: '#2563eb',
        marginRight: 8,
    },
    rejectButton: {
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        marginLeft: 8,
    },
    approveButtonText: {
        color: '#ffffff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    rejectButtonText: {
        color: '#4b5563',
        fontWeight: 'bold',
        fontSize: 14,
    },
    disabledButton: {
        opacity: 0.5,
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        color: '#9ca3af',
        fontSize: 16,
        textAlign: 'center',
    },
    // Payout Stats styles
    statsGrid: {
        flexDirection: 'row',
        backgroundColor: '#f9fafb',
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
    },
    statBox: {
        flex: 1,
        alignItems: 'center',
    },
    statLabel: {
        fontSize: 10,
        color: '#6b7280',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    statValue: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#111827',
    },
    beneficiarySection: {
        marginBottom: 16,
    },
    beneficiaryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    beneficiaryTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#6b7280',
        textTransform: 'uppercase',
    },
    assignLink: {
        fontSize: 12,
        color: '#2563eb',
        fontWeight: 'bold',
    },
    beneficiaryNameContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#eff6ff',
        padding: 8,
        borderRadius: 6,
    },
    beneficiaryEmoji: {
        marginRight: 6,
    },
    beneficiaryName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#2563eb',
    },
    emptyBeneficiary: {
        padding: 8,
        borderWidth: 1,
        borderColor: '#f3f4f6',
        borderStyle: 'dashed',
        borderRadius: 6,
    },
    emptyBeneficiaryText: {
        fontSize: 12,
        color: '#9ca3af',
        fontStyle: 'italic',
    },
    disburseButton: {
        backgroundColor: '#10b981',
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: 'center',
        marginTop: 8,
    },
    disburseButtonText: {
        color: '#ffffff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    // Modal styles
    modalOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        width: '100%',
        maxHeight: '80%',
        padding: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 4,
    },
    modalSubtitle: {
        fontSize: 14,
        color: '#6b7280',
        marginBottom: 20,
    },
    memberScrollView: {
        marginBottom: 20,
    },
    modalMemberItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    modalMemberAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#2563eb',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    modalAvatarText: {
        color: '#ffffff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    modalMemberName: {
        flex: 1,
        fontSize: 15,
        color: '#1f2937',
        fontWeight: '600',
    },
    modalSelectText: {
        fontSize: 12,
        color: '#2563eb',
        fontWeight: 'bold',
    },
    modalCloseButton: {
        paddingVertical: 12,
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
    },
    modalCloseButtonText: {
        fontSize: 16,
        color: '#ef4444',
        fontWeight: 'bold',
    },
});

export default GroupManagementScreen;
