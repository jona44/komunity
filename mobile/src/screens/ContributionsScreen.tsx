import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    ActivityIndicator, RefreshControl, Image, ScrollView
} from 'react-native';
import client from '../api/client';

interface ContributionItem {
    id: number;
    group: number;
    deceased_member: number;
    deceased_member_detail: {
        id: number;
        deceased_detail: {
            id: number;
            full_name: string;
            profile_picture: string | null;
        };
        group_detail: {
            id: number;
            name: string;
        };
        total_raised: string;
        contributions_open: boolean;
        cont_is_active: boolean;
    };
    contributing_member: number;
    contributing_member_detail: {
        id: number;
        full_name: string;
        profile_picture: string | null;
    };
    amount: string;
    payment_method: string;
    contribution_date: string;
}

interface ContributionsScreenProps {
    onBack: () => void;
}

const ContributionsScreen = ({ onBack }: ContributionsScreenProps) => {
    const [contributions, setContributions] = useState<ContributionItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [nextPage, setNextPage] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const [selectedFilter, setSelectedFilter] = useState<number | null>(null); // deceased member id

    const fetchContributions = useCallback(async (page: number = 1) => {
        try {
            const response = await client.get(`contributions/?page=${page}`);
            const data = response.data;

            // Handle both paginated { results, next } and flat array responses
            const newItems = Array.isArray(data) ? data : data.results || [];
            const nextUrl = Array.isArray(data) ? null : data.next;

            if (page === 1) {
                setContributions(newItems);
            } else {
                setContributions(prev => [...prev, ...newItems]);
            }
            setNextPage(nextUrl);
            setHasMore(!!nextUrl);
        } catch (error) {
            console.error('Error fetching contributions:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
            setLoadingMore(false);
        }
    }, []);

    useEffect(() => {
        fetchContributions(1);
    }, [fetchContributions]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchContributions(1);
    };

    const loadMore = () => {
        if (!hasMore || loadingMore || !nextPage) return;
        setLoadingMore(true);
        const pageMatch = nextPage.match(/page=(\d+)/);
        const page = pageMatch ? parseInt(pageMatch[1]) : 2;
        fetchContributions(page);
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

    const getPaymentMethodLabel = (method: string) => {
        switch (method) {
            case 'cash': return 'Cash';
            case 'bank_transfer': return 'Bank Transfer';
            case 'mobile_money': return 'Mobile Money';
            case 'wallet': return 'Wallet';
            case 'other': return 'Other';
            default: return method;
        }
    };

    const getPaymentMethodIcon = (method: string) => {
        switch (method) {
            case 'cash': return '💵';
            case 'bank_transfer': return '🏦';
            case 'mobile_money': return '📱';
            case 'wallet': return '👛';
            default: return '💳';
        }
    };

    // Get unique deceased members for filter tabs
    const deceasedFilters = contributions.reduce<Array<{
        id: number;
        name: string;
        groupName: string;
        profilePicture: string | null;
        totalRaised: string;
    }>>((acc, contribution) => {
        if (!acc.find(d => d.id === contribution.deceased_member)) {
            acc.push({
                id: contribution.deceased_member,
                name: contribution.deceased_member_detail?.deceased_detail?.full_name || 'Unknown',
                groupName: contribution.deceased_member_detail?.group_detail?.name || '',
                profilePicture: contribution.deceased_member_detail?.deceased_detail?.profile_picture || null,
                totalRaised: contribution.deceased_member_detail?.total_raised || '0',
            });
        }
        return acc;
    }, []);

    // Filter contributions
    const filteredContributions = selectedFilter
        ? contributions.filter(c => c.deceased_member === selectedFilter)
        : contributions;

    // Calculate summary stats
    const totalContributed = filteredContributions.reduce(
        (sum, c) => sum + parseFloat(c.amount), 0
    );
    const totalCount = filteredContributions.length;

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#2563eb" />
                <Text style={styles.loadingText}>Loading contributions...</Text>
            </View>
        );
    }

    const renderContribution = ({ item }: { item: ContributionItem }) => (
        <View style={styles.contributionCard}>
            <View style={styles.cardLeft}>
                <View style={styles.iconContainer}>
                    <Text style={styles.cardIcon}>✝️</Text>
                </View>
                <View style={styles.cardInfo}>
                    <Text style={styles.deceasedName}>
                        {item.deceased_member_detail?.deceased_detail?.full_name || 'Unknown Member'}
                    </Text>
                    <Text style={styles.groupName}>
                        {item.deceased_member_detail?.group_detail?.name || 'Unknown Group'}
                    </Text>
                    <View style={styles.metaRow}>
                        <Text style={styles.paymentBadge}>
                            {getPaymentMethodIcon(item.payment_method)} {getPaymentMethodLabel(item.payment_method)}
                        </Text>
                        <Text style={styles.dateText}>{formatDate(item.contribution_date)}</Text>
                    </View>
                </View>
            </View>
            <View style={styles.cardRight}>
                <Text style={styles.amountText}>{formatCurrency(item.amount)}</Text>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <FlatList
                data={filteredContributions}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderContribution}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563eb']} />
                }
                contentContainerStyle={styles.listContent}
                ListHeaderComponent={
                    <>
                        {/* Summary Card */}
                        <View style={styles.summaryCard}>
                            <View style={styles.summaryRow}>
                                <View style={styles.summaryItem}>
                                    <Text style={styles.summaryLabel}>Total Contributed</Text>
                                    <Text style={styles.summaryValue}>{formatCurrency(totalContributed.toString())}</Text>
                                </View>
                                <View style={styles.summaryDivider} />
                                <View style={styles.summaryItem}>
                                    <Text style={styles.summaryLabel}>Contributions</Text>
                                    <Text style={styles.summaryValue}>{totalCount}</Text>
                                </View>
                                <View style={styles.summaryDivider} />
                                <View style={styles.summaryItem}>
                                    <Text style={styles.summaryLabel}>Funds</Text>
                                    <Text style={styles.summaryValue}>{deceasedFilters.length}</Text>
                                </View>
                            </View>
                        </View>

                        {/* Filter Tabs */}
                        {deceasedFilters.length > 0 && (
                            <View style={styles.filterSection}>
                                <Text style={styles.filterTitle}>FILTER BY FUND</Text>
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={styles.filterScroll}
                                >
                                    <TouchableOpacity
                                        style={[
                                            styles.filterChip,
                                            selectedFilter === null && styles.filterChipActive
                                        ]}
                                        onPress={() => setSelectedFilter(null)}
                                    >
                                        <Text style={[
                                            styles.filterChipText,
                                            selectedFilter === null && styles.filterChipTextActive
                                        ]}>All</Text>
                                    </TouchableOpacity>
                                    {deceasedFilters.map((filter) => (
                                        <TouchableOpacity
                                            key={filter.id}
                                            style={[
                                                styles.filterChip,
                                                selectedFilter === filter.id && styles.filterChipActive
                                            ]}
                                            onPress={() => setSelectedFilter(
                                                selectedFilter === filter.id ? null : filter.id
                                            )}
                                        >
                                            {filter.profilePicture ? (
                                                <Image
                                                    source={{ uri: filter.profilePicture }}
                                                    style={styles.filterAvatar}
                                                />
                                            ) : (
                                                <View style={[styles.filterAvatar, styles.filterAvatarPlaceholder]}>
                                                    <Text style={styles.filterAvatarText}>
                                                        {filter.name[0]?.toUpperCase()}
                                                    </Text>
                                                </View>
                                            )}
                                            <View>
                                                <Text style={[
                                                    styles.filterChipText,
                                                    selectedFilter === filter.id && styles.filterChipTextActive
                                                ]} numberOfLines={1}>
                                                    {filter.name}
                                                </Text>
                                                <Text style={[
                                                    styles.filterChipSubtext,
                                                    selectedFilter === filter.id && styles.filterChipSubtextActive
                                                ]}>
                                                    {filter.groupName}
                                                </Text>
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        )}

                        {/* List Header */}
                        <Text style={styles.sectionTitle}>
                            {selectedFilter ? 'Filtered Contributions' : 'All Contributions'}
                        </Text>
                    </>
                }
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyIcon}>🕊️</Text>
                        <Text style={styles.emptyTitle}>No Contributions Yet</Text>
                        <Text style={styles.emptySubtext}>
                            Your contribution history will appear here once you make a contribution to a memorial fund.
                        </Text>
                    </View>
                }
                onEndReached={loadMore}
                onEndReachedThreshold={0.3}
                ListFooterComponent={
                    loadingMore ? (
                        <View style={{ paddingVertical: 20 }}>
                            <ActivityIndicator size="small" color="#2563eb" />
                        </View>
                    ) : null
                }
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: '#6b7280',
    },
    listContent: {
        padding: 16,
        paddingBottom: 32,
    },
    // Summary Card
    summaryCard: {
        backgroundColor: '#2563eb',
        borderRadius: 20,
        padding: 24,
        marginBottom: 20,
        shadowColor: '#2563eb',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 8,
    },
    summaryRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    summaryItem: {
        flex: 1,
        alignItems: 'center',
    },
    summaryDivider: {
        width: 1,
        height: 40,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    summaryLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: 'rgba(255, 255, 255, 0.7)',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 6,
    },
    summaryValue: {
        fontSize: 20,
        fontWeight: '800',
        color: '#ffffff',
    },
    // Filter Section
    filterSection: {
        marginBottom: 16,
    },
    filterTitle: {
        fontSize: 11,
        fontWeight: '700',
        color: '#9ca3af',
        letterSpacing: 1.5,
        marginBottom: 10,
    },
    filterScroll: {
        gap: 8,
    },
    filterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        gap: 8,
    },
    filterChipActive: {
        backgroundColor: '#2563eb',
        borderColor: '#2563eb',
    },
    filterChipText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        maxWidth: 120,
    },
    filterChipTextActive: {
        color: '#ffffff',
    },
    filterChipSubtext: {
        fontSize: 11,
        color: '#9ca3af',
        marginTop: 1,
    },
    filterChipSubtextActive: {
        color: 'rgba(255, 255, 255, 0.7)',
    },
    filterAvatar: {
        width: 28,
        height: 28,
        borderRadius: 14,
    },
    filterAvatarPlaceholder: {
        backgroundColor: '#e5e7eb',
        justifyContent: 'center',
        alignItems: 'center',
    },
    filterAvatarText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#6b7280',
    },
    // Section Title
    sectionTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#9ca3af',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 12,
    },
    // Contribution Card
    contributionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#f3f4f6',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
    },
    cardLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#f0f4ff',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    cardIcon: {
        fontSize: 20,
    },
    cardInfo: {
        flex: 1,
    },
    deceasedName: {
        fontSize: 15,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 2,
    },
    groupName: {
        fontSize: 13,
        color: '#6b7280',
        marginBottom: 6,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    paymentBadge: {
        fontSize: 11,
        color: '#6b7280',
        backgroundColor: '#f3f4f6',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        overflow: 'hidden',
        fontWeight: '500',
    },
    dateText: {
        fontSize: 12,
        color: '#9ca3af',
    },
    cardRight: {
        marginLeft: 12,
        alignItems: 'flex-end',
    },
    amountText: {
        fontSize: 17,
        fontWeight: '800',
        color: '#059669',
    },
    // Empty State
    emptyState: {
        alignItems: 'center',
        paddingVertical: 60,
        paddingHorizontal: 32,
    },
    emptyIcon: {
        fontSize: 48,
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#374151',
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#9ca3af',
        textAlign: 'center',
        lineHeight: 20,
    },
});

export default ContributionsScreen;
