import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { Invoice } from '../../types';

type FilterType = 'all' | 'draft' | 'sent' | 'paid' | 'overdue';

export default function InvoicesScreen() {
  const { theme } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    // Mock data for demo
    const mockInvoices: Invoice[] = [
      {
        id: '1',
        number: 'FACT-2025-0042',
        clientName: 'SC Tech Solutions SRL',
        clientCUI: 'RO12345678',
        amount: 5000,
        vatAmount: 950,
        totalAmount: 5950,
        currency: 'RON',
        status: 'paid',
        issueDate: '2025-01-08',
        dueDate: '2025-02-08',
        items: [],
      },
      {
        id: '2',
        number: 'FACT-2025-0041',
        clientName: 'Gamma Design Studio',
        clientCUI: 'RO87654321',
        amount: 3200,
        vatAmount: 608,
        totalAmount: 3808,
        currency: 'RON',
        status: 'sent',
        issueDate: '2025-01-05',
        dueDate: '2025-02-05',
        items: [],
      },
      {
        id: '3',
        number: 'FACT-2025-0040',
        clientName: 'Alpha Consulting',
        clientCUI: 'RO11223344',
        amount: 8500,
        vatAmount: 1615,
        totalAmount: 10115,
        currency: 'RON',
        status: 'overdue',
        issueDate: '2024-12-10',
        dueDate: '2025-01-10',
        items: [],
      },
      {
        id: '4',
        number: 'FACT-2025-0039',
        clientName: 'Beta Industries',
        clientCUI: 'RO55667788',
        amount: 12000,
        vatAmount: 2280,
        totalAmount: 14280,
        currency: 'RON',
        status: 'draft',
        issueDate: '2025-01-10',
        dueDate: '2025-02-10',
        items: [],
      },
      {
        id: '5',
        number: 'FACT-2025-0038',
        clientName: 'Omega Services',
        clientCUI: 'RO99887766',
        amount: 4500,
        vatAmount: 855,
        totalAmount: 5355,
        currency: 'RON',
        status: 'paid',
        issueDate: '2025-01-02',
        dueDate: '2025-02-02',
        items: [],
      },
    ];
    setInvoices(mockInvoices);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadInvoices();
    setRefreshing(false);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return theme.colors.success;
      case 'sent':
        return theme.colors.primary;
      case 'overdue':
        return theme.colors.error;
      case 'draft':
        return theme.colors.muted;
      default:
        return theme.colors.muted;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Platita';
      case 'sent':
        return 'Trimisa';
      case 'overdue':
        return 'Restanta';
      case 'draft':
        return 'Ciorna';
      case 'cancelled':
        return 'Anulata';
      default:
        return status;
    }
  };

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch =
      invoice.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.clientName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = activeFilter === 'all' || invoice.status === activeFilter;
    return matchesSearch && matchesFilter;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: 'RON',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      padding: 16,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      paddingHorizontal: 12,
      marginBottom: 12,
    },
    searchInput: {
      flex: 1,
      height: 44,
      fontSize: 16,
      color: theme.colors.text,
      marginLeft: 8,
    },
    filtersContainer: {
      flexDirection: 'row',
    },
    filterChip: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: theme.colors.card,
      marginRight: 8,
    },
    filterChipActive: {
      backgroundColor: theme.colors.primary,
    },
    filterText: {
      fontSize: 14,
      color: theme.colors.muted,
    },
    filterTextActive: {
      color: '#FFFFFF',
    },
    listContent: {
      padding: 16,
      paddingTop: 0,
    },
    invoiceCard: {
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
    },
    invoiceHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    invoiceNumber: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
    },
    invoiceDate: {
      fontSize: 13,
      color: theme.colors.muted,
      marginTop: 2,
    },
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
    },
    statusText: {
      fontSize: 12,
      fontWeight: '600',
    },
    clientRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    clientName: {
      fontSize: 15,
      color: theme.colors.text,
      marginLeft: 8,
    },
    amountRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    amountLabel: {
      fontSize: 13,
      color: theme.colors.muted,
    },
    amountValue: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.colors.text,
    },
    fab: {
      position: 'absolute',
      right: 16,
      bottom: 16,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
    },
    emptyText: {
      fontSize: 16,
      color: theme.colors.muted,
      marginTop: 16,
      textAlign: 'center',
    },
  });

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'Toate' },
    { key: 'draft', label: 'Ciorne' },
    { key: 'sent', label: 'Trimise' },
    { key: 'paid', label: 'Platite' },
    { key: 'overdue', label: 'Restante' },
  ];

  const renderInvoice = ({ item }: { item: Invoice }) => (
    <TouchableOpacity style={styles.invoiceCard}>
      <View style={styles.invoiceHeader}>
        <View>
          <Text style={styles.invoiceNumber}>{item.number}</Text>
          <Text style={styles.invoiceDate}>Data: {item.issueDate}</Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status) + '20' },
          ]}
        >
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {getStatusLabel(item.status)}
          </Text>
        </View>
      </View>

      <View style={styles.clientRow}>
        <Ionicons name="business-outline" size={18} color={theme.colors.muted} />
        <Text style={styles.clientName}>{item.clientName}</Text>
      </View>

      <View style={styles.amountRow}>
        <Text style={styles.amountLabel}>Total (incl. TVA)</Text>
        <Text style={styles.amountValue}>{formatCurrency(item.totalAmount)}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={theme.colors.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cauta facturi..."
            placeholderTextColor={theme.colors.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={filters}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterChip,
                activeFilter === item.key && styles.filterChipActive,
              ]}
              onPress={() => setActiveFilter(item.key)}
            >
              <Text
                style={[
                  styles.filterText,
                  activeFilter === item.key && styles.filterTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.filtersContainer}
        />
      </View>

      {filteredInvoices.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={64} color={theme.colors.muted} />
          <Text style={styles.emptyText}>Nu au fost gasite facturi</Text>
        </View>
      ) : (
        <FlatList
          data={filteredInvoices}
          keyExtractor={(item) => item.id}
          renderItem={renderInvoice}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}

      <TouchableOpacity style={styles.fab}>
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}
