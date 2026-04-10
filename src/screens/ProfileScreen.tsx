import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, StatusBar,
  TouchableOpacity, Alert, Share, ActivityIndicator,
  TextInput, ScrollView, Switch,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../context/AuthContext';
import { useTheme, useThemeToggle } from '../context/ThemeContext';
import { getRecords } from '../services/api';
import { formatRecordDateDisplay, parseUserDateInput } from '../utils/recordDate';
import type { AppNavigation } from '../types/navigation';
import type { FinanceRecord } from '../types/record';
import type { AppTheme } from '../theme';

function escapeCsvCell(value: unknown) {
  const s = String(value ?? '');
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const TYPE_OPTIONS = [
  { key: 'all',        label: 'Tümü'    },
  { key: 'expense',    label: 'Gider'   },
  { key: 'income',     label: 'Gelir'   },
  { key: 'investment', label: 'Yatırım' },
];

export default function ProfileScreen({ navigation }: { navigation: AppNavigation }) {
  const { user, signOut } = useAuth();
  const theme             = useTheme();
  const toggleTheme       = useThemeToggle();

  const [exporting, setExporting]         = useState(false);
  const [showExportPanel, setShowExportPanel] = useState(false);
  const [exportFromDate, setExportFromDate]   = useState('');
  const [exportToDate, setExportToDate]       = useState('');
  const [exportType, setExportType]           = useState('all');

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      let rows: FinanceRecord[] = await getRecords();

      const fromDate = exportFromDate.trim() ? parseUserDateInput(exportFromDate.trim()) : null;
      const toDate   = exportToDate.trim()   ? parseUserDateInput(exportToDate.trim())   : null;

      if (fromDate) {
        rows = rows.filter(r => new Date(r.date as string | number | Date) >= fromDate);
      }
      if (toDate) {
        const toEnd = new Date(toDate); toEnd.setHours(23, 59, 59, 999);
        rows = rows.filter(r => new Date(r.date as string | number | Date) <= toEnd);
      }
      if (exportType !== 'all') {
        rows = rows.filter(r => r.type === exportType);
      }

      if (rows.length === 0) {
        Alert.alert('Kayıt Bulunamadı', 'Seçilen kriterlere uyan kayıt yok.');
        return;
      }

      // Summary header
      const expenseSum    = rows.filter(r => r.type === 'expense').reduce((s, r) => s + r.amount, 0);
      const incomeSum     = rows.filter(r => r.type === 'income').reduce((s, r) => s + r.amount, 0);
      const investmentSum = rows.filter(r => r.type === 'investment').reduce((s, r) => s + r.amount, 0);

      const summaryLines = [
        `# Gider Takip — Dışa Aktarım`,
        `# Tarih: ${new Date().toLocaleDateString('tr-TR')}`,
        `# Kayıt Sayısı: ${rows.length}`,
        `# Gelir Toplamı: ${incomeSum.toFixed(2)} TRY`,
        `# Gider Toplamı: ${expenseSum.toFixed(2)} TRY`,
        `# Yatırım Toplamı: ${investmentSum.toFixed(2)} TRY`,
        `# Net Bakiye: ${(incomeSum - expenseSum - investmentSum).toFixed(2)} TRY`,
        '',
      ];

      const header = ['type', 'title', 'amount', 'currency', 'category', 'date'];
      const dataLines = rows.map(r =>
        [r.type, r.title, r.amount, r.currency || 'TRY', r.category, formatRecordDateDisplay(r.date)]
          .map(escapeCsvCell).join(',')
      );

      const csv = '\uFEFF' + [...summaryLines, header.map(escapeCsvCell).join(','), ...dataLines].join('\n');
      await Share.share({ message: csv, title: 'kayitlar.csv' });
    } catch {
      Alert.alert('Hata', 'Dışa aktarma başarısız oldu.');
    } finally {
      setExporting(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Çıkış Yap', 'Hesabınızdan çıkmak istediğinize emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      { text: 'Çıkış Yap', style: 'destructive', onPress: signOut },
    ]);
  };

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  const styles = makeStyles(theme);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={theme.statusBar} backgroundColor={theme.bg} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profil</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Avatar */}
        <View style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarLetter}>{initials}</Text>
          </View>
          <Text style={styles.userName}>{user?.name || 'Kullanıcı'}</Text>
          <Text style={styles.userEmail}>{user?.email || ''}</Text>
        </View>

        {/* Ayarlar */}
        <View style={styles.section}>

          {/* Karanlık Mod */}
          <View style={styles.rowWrapper}>
            <View style={styles.row}>
              <View style={[styles.rowIconBox, { backgroundColor: theme.dark ? '#1E293B' : '#E2E8F0' }]}>
                <Ionicons name={theme.dark ? 'moon' : 'sunny'} size={20} color={theme.dark ? '#94A3B8' : '#F59E0B'} />
              </View>
              <Text style={styles.rowText}>Karanlık Mod</Text>
              <Switch
                value={theme.dark}
                onValueChange={toggleTheme}
                trackColor={{ false: theme.surfaceAlt2, true: theme.primary }}
                thumbColor="#fff"
              />
            </View>
          </View>

          <View style={styles.rowSeparator} />

          {/* Tekrarlayan Kayıtlar */}
          <View style={styles.rowWrapper}>
            <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('RecurringRecords')}>
              <View style={[styles.rowIconBox, { backgroundColor: '#EFF9FA' }]}>
                <Ionicons name="repeat" size={20} color={theme.primary} />
              </View>
              <Text style={styles.rowText}>Tekrarlayan Kayıtlar</Text>
              <Ionicons name="chevron-forward" size={18} color={theme.textFaint} />
            </TouchableOpacity>
          </View>

          <View style={styles.rowSeparator} />

          {/* CSV Export */}
          <View style={styles.rowWrapper}>
            <TouchableOpacity style={styles.row} onPress={() => setShowExportPanel(v => !v)}>
              <View style={[styles.rowIconBox, { backgroundColor: '#EFF9FA' }]}>
                <Ionicons name="download-outline" size={20} color={theme.primary} />
              </View>
              <Text style={styles.rowText}>Dışa Aktar (CSV)</Text>
              <Ionicons name={showExportPanel ? 'chevron-up' : 'chevron-down'} size={18} color={theme.textFaint} />
            </TouchableOpacity>

            {showExportPanel && (
              <View style={styles.exportPanel}>
                <Text style={styles.exportLabel}>Başlangıç tarihi (GG.AA.YYYY)</Text>
                <TextInput
                  style={styles.exportInput}
                  value={exportFromDate}
                  onChangeText={setExportFromDate}
                  placeholder="ör. 01.01.2025"
                  placeholderTextColor={theme.textFaint}
                  keyboardType="numbers-and-punctuation"
                />
                <Text style={styles.exportLabel}>Bitiş tarihi (GG.AA.YYYY)</Text>
                <TextInput
                  style={styles.exportInput}
                  value={exportToDate}
                  onChangeText={setExportToDate}
                  placeholder="ör. 31.12.2025"
                  placeholderTextColor={theme.textFaint}
                  keyboardType="numbers-and-punctuation"
                />
                <Text style={styles.exportLabel}>Kayıt Tipi</Text>
                <View style={styles.typeRow}>
                  {TYPE_OPTIONS.map(opt => (
                    <TouchableOpacity
                      key={opt.key}
                      style={[styles.typeBtn, exportType === opt.key && { backgroundColor: theme.primary }]}
                      onPress={() => setExportType(opt.key)}
                    >
                      <Text style={[styles.typeBtnText, exportType === opt.key && { color: '#fff' }]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity
                  style={[styles.exportBtn, exporting && { opacity: 0.7 }]}
                  onPress={handleExportCsv}
                  disabled={exporting}
                >
                  {exporting
                    ? <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
                    : <Ionicons name="share-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                  }
                  <Text style={styles.exportBtnText}>CSV Paylaş</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.rowSeparator} />

          {/* Çıkış */}
          <View style={styles.rowWrapper}>
            <TouchableOpacity style={styles.row} onPress={handleLogout}>
              <View style={[styles.rowIconBox, { backgroundColor: theme.expenseBg }]}>
                <Ionicons name="log-out-outline" size={20} color={theme.expense} />
              </View>
              <Text style={[styles.rowText, { color: theme.expense }]}>Çıkış Yap</Text>
              <Ionicons name="chevron-forward" size={18} color={theme.textFaint} />
            </TouchableOpacity>
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(theme: AppTheme) {
  return StyleSheet.create({
    safeArea:    { flex: 1, backgroundColor: theme.bg },
    header:      { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: theme.border, backgroundColor: theme.bg },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: theme.text },

    profileCard:  { alignItems: 'center', paddingVertical: 36, paddingHorizontal: 24 },
    avatarCircle: { width: 88, height: 88, borderRadius: 44, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    avatarLetter: { fontSize: 32, fontWeight: 'bold', color: '#fff' },
    userName:     { fontSize: 22, fontWeight: 'bold', color: theme.text, marginBottom: 6 },
    userEmail:    { fontSize: 14, color: theme.textSub },

    section:      { marginHorizontal: 16, borderRadius: 16, backgroundColor: theme.surface, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1, marginBottom: 32 },
    rowWrapper:   {},
    rowSeparator: { height: StyleSheet.hairlineWidth, backgroundColor: theme.border, marginLeft: 68 },
    row:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, gap: 14 },
    rowIconBox:   { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    rowText:      { flex: 1, fontSize: 15, fontWeight: '600', color: theme.text },

    exportPanel:  { paddingHorizontal: 16, paddingBottom: 16, gap: 8 },
    exportLabel:  { fontSize: 12, fontWeight: '600', color: theme.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 8 },
    exportInput:  { backgroundColor: theme.surfaceAlt, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: theme.text },
    typeRow:      { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    typeBtn:      { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: theme.surfaceAlt },
    typeBtnText:  { fontSize: 13, fontWeight: '600', color: theme.textSub },
    exportBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.primary, borderRadius: 12, paddingVertical: 12, marginTop: 8 },
    exportBtnText:{ fontSize: 15, fontWeight: '700', color: '#fff' },
  });
}
