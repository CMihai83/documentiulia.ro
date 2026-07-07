import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BarChart, PieChart } from 'react-native-chart-kit';
import { useTheme } from '../../context/ThemeContext';

const { width } = Dimensions.get('window');

type ReportType = 'financiar' | 'tva' | 'facturi' | 'anaf';

export default function ReportsScreen() {
  const { theme } = useTheme();
  const [activeReport, setActiveReport] = useState<ReportType>('financiar');

  const reportTypes = [
    { key: 'financiar' as ReportType, label: 'Financiar', icon: 'wallet-outline' },
    { key: 'tva' as ReportType, label: 'TVA', icon: 'calculator-outline' },
    { key: 'facturi' as ReportType, label: 'Facturi', icon: 'document-text-outline' },
    { key: 'anaf' as ReportType, label: 'ANAF', icon: 'shield-checkmark-outline' },
  ];

  const chartConfig = {
    backgroundGradientFrom: theme.colors.card,
    backgroundGradientTo: theme.colors.card,
    color: (opacity = 1) => theme.colors.primary,
    labelColor: (opacity = 1) => theme.colors.muted,
    strokeWidth: 2,
    barPercentage: 0.6,
    decimalPlaces: 0,
  };

  const barChartData = {
    labels: ['Ian', 'Feb', 'Mar', 'Apr', 'Mai', 'Iun'],
    datasets: [
      {
        data: [45000, 52000, 48000, 65000, 78000, 85000],
      },
    ],
  };

  const pieChartData = [
    {
      name: 'Salarii',
      amount: 45000,
      color: theme.colors.primary,
      legendFontColor: theme.colors.text,
      legendFontSize: 12,
    },
    {
      name: 'Chirie',
      amount: 12000,
      color: theme.colors.success,
      legendFontColor: theme.colors.text,
      legendFontSize: 12,
    },
    {
      name: 'Utilitati',
      amount: 8000,
      color: theme.colors.warning,
      legendFontColor: theme.colors.text,
      legendFontSize: 12,
    },
    {
      name: 'Alte',
      amount: 15000,
      color: theme.colors.error,
      legendFontColor: theme.colors.text,
      legendFontSize: 12,
    },
  ];

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    tabsContainer: {
      flexDirection: 'row',
      padding: 16,
      paddingBottom: 8,
    },
    tabButton: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 8,
      borderRadius: 12,
      marginHorizontal: 4,
    },
    tabButtonActive: {
      backgroundColor: theme.colors.primary,
    },
    tabIcon: {
      marginBottom: 4,
    },
    tabLabel: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.colors.muted,
    },
    tabLabelActive: {
      color: '#FFFFFF',
    },
    content: {
      flex: 1,
    },
    section: {
      marginBottom: 16,
      paddingHorizontal: 16,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 12,
    },
    card: {
      backgroundColor: theme.colors.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 16,
    },
    metricsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    metricItem: {
      alignItems: 'center',
    },
    metricValue: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.colors.text,
    },
    metricLabel: {
      fontSize: 12,
      color: theme.colors.muted,
      marginTop: 4,
    },
    reportItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    reportItemLast: {
      borderBottomWidth: 0,
    },
    reportItemContent: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    reportItemIcon: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: theme.colors.primary + '20',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    reportItemText: {
      flex: 1,
    },
    reportItemTitle: {
      fontSize: 15,
      fontWeight: '500',
      color: theme.colors.text,
    },
    reportItemSubtitle: {
      fontSize: 13,
      color: theme.colors.muted,
      marginTop: 2,
    },
    downloadButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.colors.card,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    anafSection: {
      paddingHorizontal: 16,
    },
    anafCard: {
      backgroundColor: theme.colors.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
    },
    anafHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    anafIcon: {
      width: 48,
      height: 48,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    anafTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
    },
    anafSubtitle: {
      fontSize: 13,
      color: theme.colors.muted,
      marginTop: 2,
    },
    anafButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: 8,
      paddingVertical: 10,
      alignItems: 'center',
    },
    anafButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600',
    },
    anafStatusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.success + '20',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
    },
    anafStatusText: {
      fontSize: 12,
      color: theme.colors.success,
      fontWeight: '500',
      marginLeft: 4,
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: 'RON',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const renderFinancialReport = () => (
    <ScrollView style={styles.content}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sumar Financiar</Text>
        <View style={styles.card}>
          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>{formatCurrency(125000)}</Text>
              <Text style={styles.metricLabel}>Venituri</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>{formatCurrency(45000)}</Text>
              <Text style={styles.metricLabel}>Cheltuieli</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={[styles.metricValue, { color: theme.colors.success }]}>
                {formatCurrency(80000)}
              </Text>
              <Text style={styles.metricLabel}>Profit</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Evolutie Venituri</Text>
        <View style={styles.card}>
          <BarChart
            data={barChartData}
            width={width - 64}
            height={200}
            chartConfig={chartConfig}
            style={{ borderRadius: 8 }}
            showValuesOnTopOfBars
            fromZero
            yAxisLabel=""
            yAxisSuffix=""
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Distributie Cheltuieli</Text>
        <View style={styles.card}>
          <PieChart
            data={pieChartData}
            width={width - 64}
            height={180}
            chartConfig={chartConfig}
            accessor="amount"
            backgroundColor="transparent"
            paddingLeft="15"
          />
        </View>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );

  const renderVATReport = () => (
    <ScrollView style={styles.content}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sumar TVA</Text>
        <View style={styles.card}>
          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>{formatCurrency(23750)}</Text>
              <Text style={styles.metricLabel}>TVA Colectat</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>{formatCurrency(8000)}</Text>
              <Text style={styles.metricLabel}>TVA Deductibil</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={[styles.metricValue, { color: theme.colors.warning }]}>
                {formatCurrency(15750)}
              </Text>
              <Text style={styles.metricLabel}>De plata</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Rapoarte Disponibile</Text>
        <View style={styles.card}>
          {[
            { title: 'Declaratie TVA - D300', subtitle: 'Ianuarie 2025' },
            { title: 'Jurnal Cumparari', subtitle: 'Ultima actualizare: ieri' },
            { title: 'Jurnal Vanzari', subtitle: 'Ultima actualizare: ieri' },
          ].map((item, index, arr) => (
            <View
              key={index}
              style={[styles.reportItem, index === arr.length - 1 && styles.reportItemLast]}
            >
              <View style={styles.reportItemContent}>
                <View style={styles.reportItemIcon}>
                  <Ionicons name="document-text" size={20} color={theme.colors.primary} />
                </View>
                <View style={styles.reportItemText}>
                  <Text style={styles.reportItemTitle}>{item.title}</Text>
                  <Text style={styles.reportItemSubtitle}>{item.subtitle}</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.downloadButton}>
                <Ionicons name="download-outline" size={18} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );

  const renderANAFReport = () => (
    <ScrollView style={styles.anafSection}>
      <View style={styles.anafCard}>
        <View style={styles.anafHeader}>
          <View style={[styles.anafIcon, { backgroundColor: theme.colors.primary + '20' }]}>
            <Ionicons name="document-text" size={24} color={theme.colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.anafTitle}>SAF-T D406</Text>
            <Text style={styles.anafSubtitle}>Declaratie lunara XML</Text>
          </View>
          <View style={styles.anafStatusBadge}>
            <Ionicons name="checkmark-circle" size={14} color={theme.colors.success} />
            <Text style={styles.anafStatusText}>Trimis</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.anafButton}>
          <Text style={styles.anafButtonText}>Genereaza Declaratie</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.anafCard}>
        <View style={styles.anafHeader}>
          <View style={[styles.anafIcon, { backgroundColor: theme.colors.success + '20' }]}>
            <Ionicons name="receipt" size={24} color={theme.colors.success} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.anafTitle}>e-Factura SPV</Text>
            <Text style={styles.anafSubtitle}>Transmitere facturi B2B</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.anafButton}>
          <Text style={styles.anafButtonText}>Trimite Facturi</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.anafCard}>
        <View style={styles.anafHeader}>
          <View style={[styles.anafIcon, { backgroundColor: theme.colors.warning + '20' }]}>
            <Ionicons name="car" size={24} color={theme.colors.warning} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.anafTitle}>e-Transport</Text>
            <Text style={styles.anafSubtitle}>Monitorizare transport bunuri</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.anafButton}>
          <Text style={styles.anafButtonText}>Declara Transport</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );

  const renderContent = () => {
    switch (activeReport) {
      case 'financiar':
        return renderFinancialReport();
      case 'tva':
        return renderVATReport();
      case 'facturi':
        return renderFinancialReport();
      case 'anaf':
        return renderANAFReport();
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabsContainer}>
        {reportTypes.map((report) => (
          <TouchableOpacity
            key={report.key}
            style={[
              styles.tabButton,
              activeReport === report.key && styles.tabButtonActive,
            ]}
            onPress={() => setActiveReport(report.key)}
          >
            <Ionicons
              name={report.icon as any}
              size={22}
              color={activeReport === report.key ? '#FFFFFF' : theme.colors.muted}
              style={styles.tabIcon}
            />
            <Text
              style={[
                styles.tabLabel,
                activeReport === report.key && styles.tabLabelActive,
              ]}
            >
              {report.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {renderContent()}
    </View>
  );
}
