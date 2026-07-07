import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export default function LoginScreen() {
  const navigation = useNavigation<any>();
  const { login, loginWithBiometrics, checkBiometricsAvailable, isLoading } = useAuth();
  const { theme } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);

  useEffect(() => {
    checkBiometrics();
  }, []);

  const checkBiometrics = async () => {
    const available = await checkBiometricsAvailable();
    setBiometricsAvailable(available);
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Eroare', 'Va rugam completati toate campurile');
      return;
    }

    const success = await login(email, password);
    if (!success) {
      Alert.alert('Eroare', 'Email sau parola incorecta');
    }
  };

  const handleBiometricLogin = async () => {
    const success = await loginWithBiometrics();
    if (!success) {
      Alert.alert('Eroare', 'Autentificarea biometrica a esuat');
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
      padding: 24,
    },
    logoContainer: {
      alignItems: 'center',
      marginBottom: 40,
    },
    logo: {
      width: 100,
      height: 100,
      backgroundColor: theme.colors.primary,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      color: theme.colors.muted,
    },
    form: {
      marginBottom: 24,
    },
    inputContainer: {
      marginBottom: 16,
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
    eyeButton: {
      padding: 8,
    },
    forgotPassword: {
      alignSelf: 'flex-end',
      marginBottom: 24,
    },
    forgotPasswordText: {
      color: theme.colors.primary,
      fontSize: 14,
    },
    loginButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: 12,
      height: 50,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    loginButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
    biometricButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      height: 50,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: 24,
    },
    biometricButtonText: {
      color: theme.colors.text,
      fontSize: 16,
      fontWeight: '500',
      marginLeft: 8,
    },
    divider: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 24,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: theme.colors.border,
    },
    dividerText: {
      marginHorizontal: 16,
      color: theme.colors.muted,
      fontSize: 14,
    },
    registerContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
    },
    registerText: {
      color: theme.colors.muted,
      fontSize: 14,
    },
    registerLink: {
      color: theme.colors.primary,
      fontSize: 14,
      fontWeight: '600',
    },
  });

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoContainer}>
          <View style={styles.logo}>
            <Ionicons name="document-text" size={48} color="#FFFFFF" />
          </View>
          <Text style={styles.title}>DocumentIulia</Text>
          <Text style={styles.subtitle}>Contabilitate cu Inteligenta Artificiala</Text>
        </View>

        <View style={styles.form}>
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

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Parola</Text>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={theme.colors.muted}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Introduceti parola"
                placeholderTextColor={theme.colors.muted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={theme.colors.muted}
                />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={styles.forgotPassword}
            onPress={() => navigation.navigate('ForgotPassword')}
          >
            <Text style={styles.forgotPasswordText}>Ai uitat parola?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.loginButtonText}>Autentificare</Text>
            )}
          </TouchableOpacity>

          {biometricsAvailable && (
            <TouchableOpacity
              style={styles.biometricButton}
              onPress={handleBiometricLogin}
            >
              <Ionicons
                name={Platform.OS === 'ios' ? 'scan' : 'finger-print'}
                size={24}
                color={theme.colors.primary}
              />
              <Text style={styles.biometricButtonText}>
                {Platform.OS === 'ios' ? 'Face ID' : 'Amprenta'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>sau</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.registerContainer}>
          <Text style={styles.registerText}>Nu ai cont? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.registerLink}>Inregistreaza-te</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
