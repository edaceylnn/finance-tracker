import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, KeyboardAvoidingView, Platform,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { register } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import type { AppNavigation } from '../types/navigation';
import type { AppTheme } from '../theme';

export default function RegisterScreen({ navigation }: { navigation: AppNavigation }) {
  const { signIn }  = useAuth();
  const theme       = useTheme();
  const [name, setName]                       = useState('');
  const [email, setEmail]                     = useState('');
  const [password, setPassword]               = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword]       = useState(false);
  const [loading, setLoading]                 = useState(false);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim() || !passwordConfirm.trim()) {
      Alert.alert('Eksik Bilgi', 'Tüm alanları doldurun.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Geçersiz Şifre', 'Şifre en az 6 karakter olmalıdır.');
      return;
    }
    if (password !== passwordConfirm) {
      Alert.alert('Şifre Uyuşmuyor', 'Girdiğiniz şifreler eşleşmiyor.');
      return;
    }
    setLoading(true);
    try {
      const data = await register({ name: name.trim(), email: email.trim().toLowerCase(), password });
      await signIn(data.token, data.user);
    } catch (err: unknown) {
      Alert.alert('Kayıt Başarısız', err instanceof Error ? err.message : 'Kayıt oluşturulamadı.');
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

          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={theme.textSub} />
          </TouchableOpacity>

          <View style={styles.titleArea}>
            <View style={styles.logoCircle}>
              <Ionicons name="person-add" size={36} color={theme.primary} />
            </View>
            <Text style={styles.title}>Hesap Oluştur</Text>
            <Text style={styles.subtitle}>Ücretsiz hesabınızı oluşturun</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputWrapper}>
              <Ionicons name="person-outline" size={20} color={theme.textMuted} style={styles.inputIcon} />
              <TextInput style={styles.input} placeholder="Adınız" placeholderTextColor={theme.textFaint} value={name} onChangeText={setName} autoCapitalize="words" autoCorrect={false} />
            </View>

            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={20} color={theme.textMuted} style={styles.inputIcon} />
              <TextInput style={styles.input} placeholder="E-posta adresi" placeholderTextColor={theme.textFaint} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
            </View>

            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color={theme.textMuted} style={styles.inputIcon} />
              <TextInput style={[styles.input, { flex: 1 }]} placeholder="Şifre (en az 6 karakter)" placeholderTextColor={theme.textFaint} value={password} onChangeText={setPassword} secureTextEntry={!showPassword} autoCapitalize="none" autoCorrect={false} />
              <TouchableOpacity onPress={() => setShowPassword(p => !p)} style={styles.showPasswordBtn}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color={theme.textMuted} style={styles.inputIcon} />
              <TextInput style={styles.input} placeholder="Şifreyi tekrar girin" placeholderTextColor={theme.textFaint} value={passwordConfirm} onChangeText={setPasswordConfirm} secureTextEntry={!showPassword} autoCapitalize="none" autoCorrect={false} />
            </View>

            <TouchableOpacity style={[styles.registerBtn, loading && { opacity: 0.6 }]} onPress={handleRegister} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.registerBtnText}>Kayıt Ol</Text>}
            </TouchableOpacity>
          </View>

          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Zaten hesabınız var mı? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Giriş Yap</Text>
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
    scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40 },

    backBtn:    { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.surfaceAlt, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
    titleArea:  { alignItems: 'center', marginBottom: 36 },
    logoCircle: { width: 72, height: 72, borderRadius: 22, backgroundColor: theme.surfaceAlt, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    title:      { fontSize: 26, fontWeight: 'bold', color: theme.text, marginBottom: 6 },
    subtitle:   { fontSize: 14, color: theme.textSub },

    form:            { gap: 14, marginBottom: 24 },
    inputWrapper:    { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surface, borderRadius: 14, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 14, height: 54 },
    inputIcon:       { marginRight: 10 },
    input:           { flex: 1, fontSize: 15, color: theme.text },
    showPasswordBtn: { padding: 4 },

    registerBtn:     { backgroundColor: theme.primary, borderRadius: 14, height: 54, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
    registerBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },

    loginRow:  { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
    loginText: { fontSize: 14, color: theme.textSub },
    loginLink: { fontSize: 14, fontWeight: '700', color: theme.primary },
  });
}
