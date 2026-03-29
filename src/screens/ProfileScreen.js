import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Alert,
  Share,
  ActivityIndicator,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../context/AuthContext';
import { getRecords } from '../services/api';
import { formatRecordDateDisplay } from '../utils/recordDate';

function escapeCsvCell(value) {
  const s = String(value ?? '');
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const [exporting, setExporting] = useState(false);

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const rows = await getRecords();
      const header = ['type', 'title', 'amount', 'currency', 'category', 'date'];
      const lines = [header.map(escapeCsvCell).join(',')];
      for (const r of rows) {
        const line = [
          r.type,
          r.title,
          r.amount,
          'TRY',
          r.category,
          formatRecordDateDisplay(r.date),
        ].map(escapeCsvCell).join(',');
        lines.push(line);
      }
      const csv = '\uFEFF' + lines.join('\n');
      await Share.share({ message: csv, title: 'records.csv' });
    } catch {
      Alert.alert('Hata', 'Dışa aktarma başarısız oldu.');
    } finally {
      setExporting(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Çıkış Yap',
      'Hesabınızdan çıkmak istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Çıkış Yap',
          style: 'destructive',
          onPress: signOut,
        },
      ],
    );
  };

  const initials = user?.name
    ? user.name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F6F8F8" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profil</Text>
      </View>

      {/* Avatar & Kullanıcı Bilgisi */}
      <View style={styles.profileCard}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarLetter}>{initials}</Text>
        </View>
        <Text style={styles.userName}>{user?.name || 'Kullanıcı'}</Text>
        <Text style={styles.userEmail}>{user?.email || ''}</Text>
      </View>

      {/* Ayarlar Satırları */}
      <View style={styles.section}>
        <View style={styles.rowWrapper}>
          <TouchableOpacity
            style={styles.row}
            onPress={handleExportCsv}
            disabled={exporting}
          >
            <View style={[styles.rowIconBox, { backgroundColor: '#E0F7FA' }]}>
              {exporting ? (
                <ActivityIndicator size="small" color="#11c4d4" />
              ) : (
                <Ionicons name="download-outline" size={20} color="#11c4d4" />
              )}
            </View>
            <Text style={styles.rowText}>Dışa Aktar (CSV)</Text>
            <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
          </TouchableOpacity>
        </View>
        <View style={styles.rowSeparator} />
        <View style={styles.rowWrapper}>
          <TouchableOpacity style={styles.row} onPress={handleLogout}>
            <View style={[styles.rowIconBox, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="log-out-outline" size={20} color="#EF4444" />
            </View>
            <Text style={[styles.rowText, { color: '#EF4444' }]}>Çıkış Yap</Text>
            <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F6F8F8' },

  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#F6F8F8',
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#0F172A' },

  profileCard: {
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: 24,
  },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#11c4d4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarLetter: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 6,
  },
  userEmail: {
    fontSize: 14,
    color: '#64748B',
  },

  section: {
    marginHorizontal: 16,
    borderRadius: 16,
    backgroundColor: '#fff',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  rowWrapper: {},
  rowSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E2E8F0',
    marginLeft: 68,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 14,
  },
  rowIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
});
