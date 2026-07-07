import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export default function SettingsScreen() {
  const { user, logout, checkBiometricsAvailable, enableBiometrics } = useAuth();
  const { theme, isDark, toggleTheme } = useTheme();

  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  useEffect(() => {
    checkBiometrics();
  }, []);

  const checkBiometrics = async () => {
    const available = await checkBiometricsAvailable();
    setBiometricsAvailable(available);
  };

  const handleBiometricsToggle = async () => {
    if (biometricsEnabled) {
      setBiometricsEnabled(false);
    } else {
      const success = await enableBiometrics();
      if (success) {
        setBiometricsEnabled(true);
      } else {
        Alert.alert('Eroare', 'Nu s-a putut activa autentificarea biometrica');
      }
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Deconectare',
      'Esti sigur ca vrei sa te deconectezi?',
      [
        { text: 'Anuleaza', style: 'cancel' },
        { text: 'Da', onPress: logout, style: 'destructive' },
      ]
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      padding: 16,
    },
    profileCard: {
      backgroundColor: theme.colors.card,
      borderRadius: 16,
      padding: 20,
      marginBottom: 24,
      alignItems: 'center',
    },
    avatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 12,
    },
    avatarText: {
      fontSize: 32,
      fontWeight: 'bold',
      color: '#FFFFFF',
    },
    userName: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.colors.text,
    },
    userEmail: {
      fontSize: 14,
      color: theme.colors.muted,
      marginTop: 4,
    },
    tierBadge: {
      marginTop: 12,
      paddingHorizontal: 16,
      paddingVertical: 6,
      borderRadius: 12,
      backgroundColor: theme.colors.primary + '20',
    },
    tierText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.primary,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.muted,
      marginBottom: 8,
      paddingHorizontal: 4,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    settingsCard: {
      backgroundColor: theme.colors.card,
      borderRadius: 16,
      overflow: 'hidden',
    },
    settingItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    settingItemLast: {
      borderBottomWidth: 0,
    },
    settingIcon: {
      width: 40,
      height: 40,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    settingContent: {
      flex: 1,
    },
    settingTitle: {
      fontSize: 16,
      color: theme.colors.text,
    },
    settingSubtitle: {
      fontSize: 13,
      color: theme.colors.muted,
      marginTop: 2,
    },
    logoutButton: {
      backgroundColor: theme.colors.error + '15',
      borderRadius: 12,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    logoutText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.error,
      marginLeft: 8,
    },
    versionText: {
      textAlign: 'center',
      color: theme.colors.muted,
      fontSize: 13,
      marginTop: 24,
      marginBottom: 40,
    },
  });

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getTierLabel = (tier: string) => {
    switch (tier) {
      case 'FREE':
        return 'Gratuit';
      case 'PRO':
        return 'Pro - 49 RON/luna';
      case 'BUSINESS':
        return 'Business - 149 RON/luna';
      default:
        return tier;
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.name ? getInitials(user.name) : 'U'}
          </Text>
        </View>
        <Text style={styles.userName}>{user?.name || 'Utilizator'}</Text>
        <Text style={styles.userEmail}>{user?.email || 'email@example.com'}</Text>
        <View style={styles.tierBadge}>
          <Text style={styles.tierText}>
            {getTierLabel(user?.subscriptionTier || 'FREE')}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cont</Text>
        <View style={styles.settingsCard}>
          <TouchableOpacity style={styles.settingItem}>
            <View style={[styles.settingIcon, { backgroundColor: theme.colors.primary + '20' }]}>
              <Ionicons name="person-outline" size={20} color={theme.colors.primary} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Profil</Text>
              <Text style={styles.settingSubtitle}>Modifica informatiile personale</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.muted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <View style={[styles.settingIcon, { backgroundColor: theme.colors.success + '20' }]}>
              <Ionicons name="business-outline" size={20} color={theme.colors.success} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Firma</Text>
              <Text style={styles.settingSubtitle}>Date companie, CUI, adresa</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.muted} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.settingItem, styles.settingItemLast]}>
            <View style={[styles.settingIcon, { backgroundColor: theme.colors.warning + '20' }]}>
              <Ionicons name="card-outline" size={20} color={theme.colors.warning} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Abonament</Text>
              <Text style={styles.settingSubtitle}>Upgrade la Pro sau Business</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.muted} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Securitate</Text>
        <View style={styles.settingsCard}>
          {biometricsAvailable && (
            <View style={styles.settingItem}>
              <View style={[styles.settingIcon, { backgroundColor: theme.colors.primary + '20' }]}>
                <Ionicons name="finger-print-outline" size={20} color={theme.colors.primary} />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Autentificare biometrica</Text>
                <Text style={styles.settingSubtitle}>Face ID / Touch ID</Text>
              </View>
              <Switch
                value={biometricsEnabled}
                onValueChange={handleBiometricsToggle}
                trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              />
            </View>
          )}

          <TouchableOpacity style={[styles.settingItem, styles.settingItemLast]}>
            <View style={[styles.settingIcon, { backgroundColor: theme.colors.error + '20' }]}>
              <Ionicons name="lock-closed-outline" size={20} color={theme.colors.error} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Schimba parola</Text>
              <Text style={styles.settingSubtitle}>Actualizeaza parola contului</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.muted} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Aplicatie</Text>
        <View style={styles.settingsCard}>
          <View style={styles.settingItem}>
            <View style={[styles.settingIcon, { backgroundColor: isDark ? '#374151' : '#FEF3C7' }]}>
              <Ionicons
                name={isDark ? 'moon' : 'sunny'}
                size={20}
                color={isDark ? '#FCD34D' : '#F59E0B'}
              />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Mod intunecat</Text>
              <Text style={styles.settingSubtitle}>
                {isDark ? 'Activat' : 'Dezactivat'}
              </Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={[styles.settingIcon, { backgroundColor: theme.colors.success + '20' }]}>
              <Ionicons name="notifications-outline" size={20} color={theme.colors.success} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Notificari</Text>
              <Text style={styles.settingSubtitle}>Alerte si memento-uri</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            />
          </View>

          <TouchableOpacity style={[styles.settingItem, styles.settingItemLast]}>
            <View style={[styles.settingIcon, { backgroundColor: theme.colors.primary + '20' }]}>
              <Ionicons name="globe-outline" size={20} color={theme.colors.primary} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Limba</Text>
              <Text style={styles.settingSubtitle}>Romana</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.muted} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Suport</Text>
        <View style={styles.settingsCard}>
          <TouchableOpacity style={styles.settingItem}>
            <View style={[styles.settingIcon, { backgroundColor: theme.colors.primary + '20' }]}>
              <Ionicons name="help-circle-outline" size={20} color={theme.colors.primary} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Centru de ajutor</Text>
              <Text style={styles.settingSubtitle}>Intrebari frecvente</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.muted} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.settingItem, styles.settingItemLast]}>
            <View style={[styles.settingIcon, { backgroundColor: theme.colors.success + '20' }]}>
              <Ionicons name="chatbubble-outline" size={20} color={theme.colors.success} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Contacteaza-ne</Text>
              <Text style={styles.settingSubtitle}>support@documentiulia.ro</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.muted} />
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color={theme.colors.error} />
        <Text style={styles.logoutText}>Deconectare</Text>
      </TouchableOpacity>

      <Text style={styles.versionText}>DocumentIulia v1.0.0</Text>
    </ScrollView>
  );
}
