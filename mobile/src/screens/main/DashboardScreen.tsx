import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { DashboardMetrics } from '../../types';

const { width } = Dimensions.get('window');

export default function DashboardScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      // Mock data for demo
      const mockMetrics: DashboardMetrics = {
        revenue: 125000,
        revenueChange: 12.5,
        expenses: 45000,
        expensesChange: -3.2,
        profit: 80000,
        profitChange: 18.7,
        invoicesPending: 8,
        invoicesPendingAmount: 24500,
        vatDue: 15750,
        vatDueDate: '2025-01-25',
        healthScore: 85,
      };
      setMetrics(mockMetrics);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  }, []);

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
      padding: 20,
      paddingTop: 10,
    },
    greeting: {
      fontSize: 16,
      color: theme.colors.muted,
    },
    userName: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginTop: 4,
    },
    metricsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      padding: 10,
    },
    metricCard: {
      width: (width - 48) / 2,
      backgroundColor: theme.colors.card,
      borderRadius: 16,
      padding: 16,
      margin: 6,
    },
    metricCardLarge: {
      width: width - 32,
      backgroundColor: theme.colors.card,
      borderRadius: 16,
      padding: 20,
      margin: 6,
    },
    metricIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 12,
    },
    metricLabel: {
      fontSize: 14,
      color: theme.colors.muted,
      marginBottom: 4,
    },
    metricValue: {
      fontSize: 22,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: 4,
    },
    metricChange: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    metricChangeText: {
      fontSize: 13,
      marginLeft: 4,
    },
    positive: {
      color: theme.colors.success,
    },
    negative: {
      color: theme.colors.error,
    },
    chartContainer: {
      marginHorizontal: 16,
      marginVertical: 12,
      backgroundColor: theme.colors.card,
      borderRadius: 16,
      padding: 16,
    },
    chartTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 16,
    },
    alertsSection: {
      marginHorizontal: 16,
      marginVertical: 12,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 12,
    },
    alertCard: {
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    alertIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    alertContent: {
      flex: 1,
    },
    alertTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.text,
    },
    alertSubtitle: {
      fontSize: 13,
      color: theme.colors.muted,
      marginTop: 2,
    },
    healthScore: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    healthScoreCircle: {
      width: 80,
      height: 80,
      borderRadius: 40,
      borderWidth: 6,
      justifyContent: 'center',
      alignItems: 'center',
    },
    healthScoreValue: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.colors.text,
    },
    healthScoreLabel: {
      fontSize: 14,
      color: theme.colors.muted,
    },
    healthScoreInfo: {
      flex: 1,
      marginLeft: 20,
    },
    healthScoreTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 4,
    },
    healthScoreDescription: {
      fontSize: 14,
      color: theme.colors.muted,
      lineHeight: 20,
    },
  });

  const chartConfig = {
    backgroundGradientFrom: theme.colors.card,
    backgroundGradientTo: theme.colors.card,
    color: (opacity = 1) => theme.colors.primary,
    labelColor: (opacity = 1) => theme.colors.muted,
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
    decimalPlaces: 0,
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: theme.colors.primary,
    },
  };

  const chartData = {
    labels: ['Ian', 'Feb', 'Mar', 'Apr', 'Mai', 'Iun'],
    datasets: [
      {
        data: [45000, 52000, 48000, 65000, 78000, 85000],
        color: (opacity = 1) => theme.colors.primary,
        strokeWidth: 2,
      },
    ],
  };

  if (!metrics) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: theme.colors.muted }}>Se incarca...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>Buna ziua,</Text>
        <Text style={styles.userName}>{user?.name || 'Utilizator'}</Text>
      </View>

      <View style={styles.metricsGrid}>
        <View style={styles.metricCard}>
          <View style={[styles.metricIcon, { backgroundColor: theme.colors.success + '20' }]}>
            <Ionicons name="trending-up" size={22} color={theme.colors.success} />
          </View>
          <Text style={styles.metricLabel}>Venituri</Text>
          <Text style={styles.metricValue}>{formatCurrency(metrics.revenue)}</Text>
          <View style={styles.metricChange}>
            <Ionicons
              name={metrics.revenueChange >= 0 ? 'arrow-up' : 'arrow-down'}
              size={14}
              color={metrics.revenueChange >= 0 ? theme.colors.success : theme.colors.error}
            />
            <Text
              style={[
                styles.metricChangeText,
                metrics.revenueChange >= 0 ? styles.positive : styles.negative,
              ]}
            >
              {Math.abs(metrics.revenueChange)}%
            </Text>
          </View>
        </View>

        <View style={styles.metricCard}>
          <View style={[styles.metricIcon, { backgroundColor: theme.colors.error + '20' }]}>
            <Ionicons name="trending-down" size={22} color={theme.colors.error} />
          </View>
          <Text style={styles.metricLabel}>Cheltuieli</Text>
          <Text style={styles.metricValue}>{formatCurrency(metrics.expenses)}</Text>
          <View style={styles.metricChange}>
            <Ionicons
              name={metrics.expensesChange >= 0 ? 'arrow-up' : 'arrow-down'}
              size={14}
              color={metrics.expensesChange >= 0 ? theme.colors.error : theme.colors.success}
            />
            <Text
              style={[
                styles.metricChangeText,
                metrics.expensesChange >= 0 ? styles.negative : styles.positive,
              ]}
            >
              {Math.abs(metrics.expensesChange)}%
            </Text>
          </View>
        </View>

        <View style={styles.metricCard}>
          <View style={[styles.metricIcon, { backgroundColor: theme.colors.primary + '20' }]}>
            <Ionicons name="wallet-outline" size={22} color={theme.colors.primary} />
          </View>
          <Text style={styles.metricLabel}>Profit Net</Text>
          <Text style={styles.metricValue}>{formatCurrency(metrics.profit)}</Text>
          <View style={styles.metricChange}>
            <Ionicons
              name={metrics.profitChange >= 0 ? 'arrow-up' : 'arrow-down'}
              size={14}
              color={metrics.profitChange >= 0 ? theme.colors.success : theme.colors.error}
            />
            <Text
              style={[
                styles.metricChangeText,
                metrics.profitChange >= 0 ? styles.positive : styles.negative,
              ]}
            >
              {Math.abs(metrics.profitChange)}%
            </Text>
          </View>
        </View>

        <View style={styles.metricCard}>
          <View style={[styles.metricIcon, { backgroundColor: theme.colors.warning + '20' }]}>
            <Ionicons name="receipt-outline" size={22} color={theme.colors.warning} />
          </View>
          <Text style={styles.metricLabel}>TVA de plata</Text>
          <Text style={styles.metricValue}>{formatCurrency(metrics.vatDue)}</Text>
          <Text style={[styles.metricChangeText, { color: theme.colors.muted }]}>
            Scadent: 25 Ian 2025
          </Text>
        </View>
      </View>

      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Evolutie Venituri (6 luni)</Text>
        <LineChart
          data={chartData}
          width={width - 64}
          height={180}
          chartConfig={chartConfig}
          bezier
          style={{ borderRadius: 8 }}
        />
      </View>

      <View style={[styles.metricCardLarge, { marginHorizontal: 10 }]}>
        <View style={styles.healthScore}>
          <View
            style={[
              styles.healthScoreCircle,
              { borderColor: metrics.healthScore >= 70 ? theme.colors.success : theme.colors.warning },
            ]}
          >
            <Text style={styles.healthScoreValue}>{metrics.healthScore}</Text>
          </View>
          <View style={styles.healthScoreInfo}>
            <Text style={styles.healthScoreTitle}>Scor Sanatate Financiara</Text>
            <Text style={styles.healthScoreDescription}>
              Compania ta are o situatie financiara{' '}
              {metrics.healthScore >= 70 ? 'buna' : 'satisfacatoare'}. Continua asa!
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.alertsSection}>
        <Text style={styles.sectionTitle}>Alerte & Termene</Text>

        <TouchableOpacity style={styles.alertCard}>
          <View style={[styles.alertIcon, { backgroundColor: theme.colors.warning + '20' }]}>
            <Ionicons name="document-text-outline" size={22} color={theme.colors.warning} />
          </View>
          <View style={styles.alertContent}>
            <Text style={styles.alertTitle}>{metrics.invoicesPending} facturi neplatite</Text>
            <Text style={styles.alertSubtitle}>
              Total: {formatCurrency(metrics.invoicesPendingAmount)}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.muted} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.alertCard}>
          <View style={[styles.alertIcon, { backgroundColor: theme.colors.error + '20' }]}>
            <Ionicons name="calendar-outline" size={22} color={theme.colors.error} />
          </View>
          <View style={styles.alertContent}>
            <Text style={styles.alertTitle}>Declaratie TVA</Text>
            <Text style={styles.alertSubtitle}>Termen: 25 Ianuarie 2025</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.muted} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.alertCard}>
          <View style={[styles.alertIcon, { backgroundColor: theme.colors.primary + '20' }]}>
            <Ionicons name="shield-checkmark-outline" size={22} color={theme.colors.primary} />
          </View>
          <View style={styles.alertContent}>
            <Text style={styles.alertTitle}>e-Factura B2B</Text>
            <Text style={styles.alertSubtitle}>Pregatire pentru iulie 2025</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.muted} />
        </TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}
