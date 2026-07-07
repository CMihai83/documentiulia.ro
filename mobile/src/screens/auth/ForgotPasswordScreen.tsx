import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';

export default function ForgotPasswordScreen() {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();

  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleResetPassword = async () => {
    if (!email) {
      Alert.alert('Eroare', 'Va rugam introduceti adresa de email');
      return;
    }

    setIsLoading(true);
    try {
      // TODO: Implement password reset API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      setEmailSent(true);
    } catch (error) {
      Alert.alert('Eroare', 'A aparut o eroare. Va rugam incercati din nou.');
    } finally {
      setIsLoading(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      flex: 1,
      padding: 24,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 32,
    },
    backButton: {
      marginRight: 16,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.colors.text,
    },
    iconContainer: {
      alignItems: 'center',
      marginBottom: 32,
    },
    iconCircle: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: emailSent ? theme.colors.success + '20' : theme.colors.primary + '20',
      justifyContent: 'center',
      alignItems: 'center',
    },
    description: {
      fontSize: 16,
      color: theme.colors.muted,
      textAlign: 'center',
      marginBottom: 32,
      lineHeight: 24,
    },
    inputContainer: {
      marginBottom: 24,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 8,
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: 16,
    },
    input: {
      flex: 1,
      height: 50,
      fontSize: 16,
      color: theme.colors.text,
    },
    inputIcon: {
      marginRight: 12,
    },
    submitButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: 12,
      height: 50,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    submitButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
    backToLoginButton: {
      alignItems: 'center',
    },
    backToLoginText: {
      color: theme.colors.primary,
      fontSize: 14,
      fontWeight: '500',
    },
    successContainer: {
      alignItems: 'center',
    },
    successTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: 12,
    },
    successText: {
      fontSize: 16,
      color: theme.colors.muted,
      textAlign: 'center',
      lineHeight: 24,
      marginBottom: 32,
    },
    successEmail: {
      fontWeight: '600',
      color: theme.colors.text,
    },
  });

  if (emailSent) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Resetare parola</Text>
          </View>

          <View style={styles.successContainer}>
            <View style={styles.iconContainer}>
              <View style={styles.iconCircle}>
                <Ionicons name="checkmark-circle" size={40} color={theme.colors.success} />
              </View>
            </View>

            <Text style={styles.successTitle}>Email trimis!</Text>
            <Text style={styles.successText}>
              Am trimis instructiunile de resetare a parolei la{' '}
              <Text style={styles.successEmail}>{email}</Text>. Verifica inbox-ul si
              folder-ul de spam.
            </Text>

            <TouchableOpacity
              style={styles.submitButton}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.submitButtonText}>Inapoi la autentificare</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Resetare parola</Text>
        </View>

        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="lock-open-outline" size={40} color={theme.colors.primary} />
          </View>
        </View>

        <Text style={styles.description}>
          Introduceti adresa de email asociata contului si va vom trimite un link pentru
          resetarea parolei.
        </Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email</Text>
          <View style={styles.inputWrapper}>
            <Ionicons
              name="mail-outline"
              size={20}
              color={theme.colors.muted}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="exemplu@email.com"
              placeholderTextColor={theme.colors.muted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>

        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleResetPassword}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>Trimite link de resetare</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backToLoginButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backToLoginText}>Inapoi la autentificare</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
