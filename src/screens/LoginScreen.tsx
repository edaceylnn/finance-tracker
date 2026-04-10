import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, KeyboardAvoidingView, Platform,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { login } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import type { AppNavigation } from '../types/navigation';
import type { AppTheme } from '../theme';

export default function LoginScreen({ navigation }: { navigation: AppNavigation }) {
  const { signIn }  = useAuth();
  const theme       = useTheme();
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]       = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Eksik Bilgi', 'E-posta ve şifre alanlarını doldurun.');
      return;
    }
    setLoading(true);
    try {
      const data = await login({ email: email.trim().toLowerCase(), password });
      await signIn(data.token, data.user);
    } catch (err: unknown) {
      Alert.alert('Giriş Başarısız', err instanceof Error ? err.message : 'E-posta veya şifre hatalı.');
    } finally {
      setLoading(false);
    }
  };

  const styles = makeStyles(theme);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={theme.statusBar} backgroundColor={theme.bg} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          <View style={styles.logoArea}>
            <View style={styles.logoCircle}>
              <Ionicons name="wallet" size={40} color={theme.primary} />
            </View>
            <Text style={styles.appName}>Gider Takip</Text>
            <Text style={styles.subtitle}>Hesabınıza giriş yapın</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={20} color={theme.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="E-posta adresi"
                placeholderTextColor={theme.textFaint}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color={theme.textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Şifre"
                placeholderTextColor={theme.textFaint}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity onPress={() => setShowPassword(p => !p)} style={styles.showPasswordBtn}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={[styles.loginBtn, loading && { opacity: 0.6 }]} onPress={handleLogin} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginBtnText}>Giriş Yap</Text>}
            </TouchableOpacity>
          </View>

          <View style={styles.registerRow}>
            <Text style={styles.registerText}>Hesabınız yok mu? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.registerLink}>Kayıt Ol</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(theme: AppTheme) {
  return StyleSheet.create({
    safeArea:      { flex: 1, backgroundColor: theme.bg },
    scrollContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 40 },

    logoArea:   { alignItems: 'center', marginBottom: 40 },
    logoCircle: { width: 80, height: 80, borderRadius: 24, backgroundColor: theme.surfaceAlt, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    appName:    { fontSize: 28, fontWeight: 'bold', color: theme.text, marginBottom: 8 },
    subtitle:   { fontSize: 15, color: theme.textSub },

    form:         { gap: 14, marginBottom: 24 },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surface, borderRadius: 14, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 14, height: 54 },
    inputIcon:    { marginRight: 10 },
    input:        { flex: 1, fontSize: 15, color: theme.text },
    showPasswordBtn: { padding: 4 },

    loginBtn:     { backgroundColor: theme.primary, borderRadius: 14, height: 54, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
    loginBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },

    registerRow:  { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
    registerText: { fontSize: 14, color: theme.textSub },
    registerLink: { fontSize: 14, fontWeight: '700', color: theme.primary },
  });
}
