import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  SafeAreaView, StatusBar, ActivityIndicator, Alert, Switch,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { getRecurringRecords, deleteRecurringRecord, updateRecurringRecord } from '../services/api';
import { getCategoryStyle } from '../constants/categories';
import { useTheme } from '../context/ThemeContext';
import type { AppNavigation } from '../types/navigation';
import type { RecurringRecordItem } from '../types/record';
import type { AppTheme } from '../theme';

const FREQ_LABELS = {
  daily:   'Günlük',
  weekly:  'Haftalık',
  monthly: 'Aylık',
  yearly:  'Yıllık',
};

function nextDateLabel(dateStr: string | Date | undefined) {
  if (dateStr == null) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('tr-TR');
}

export default function RecurringRecordsScreen({ navigation }: { navigation: AppNavigation }) {
  const theme   = useTheme();
  const [records, setRecords] = useState<RecurringRecordItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getRecurringRecords();
      setRecords((Array.isArray(data) ? data : []) as RecurringRecordItem[]);
    } catch {
      Alert.alert('Hata', 'Tekrarlayan kayıtlar yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const handleToggleActive = async (item: RecurringRecordItem) => {
    try {
      const updated = (await updateRecurringRecord(item._id, { isActive: !item.isActive })) as RecurringRecordItem;
      setRecords(prev => prev.map(r => r._id === item._id ? updated : r));
    } catch {
      Alert.alert('Hata', 'Güncelleme başarısız.');
    }
  };

  const handleDelete = (item: RecurringRecordItem) => {
    Alert.alert(
      'Kaydı Sil',
      `"${item.title}" tekrarlayan kaydını silmek istediğinize emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil', style: 'destructive', onPress: async () => {
            try {
              await deleteRecurringRecord(item._id);
              setRecords(prev => prev.filter(r => r._id !== item._id));
            } catch {
              Alert.alert('Hata', 'Silme işlemi başarısız.');
            }
          },
        },
      ],
    );
  };

  const styles = makeStyles(theme);

  const renderItem = ({ item }: { item: RecurringRecordItem }) => {
    const categoryStyle = getCategoryStyle(item.category);
    const isIncome      = item.type === 'income';
    const isInvestment  = item.type === 'investment';
    const accentColor   = isIncome ? theme.income : isInvestment ? theme.investment : theme.expense;
    const typeLabel     = isIncome ? 'Gelir' : isInvestment ? 'Yatırım' : 'Gider';
    const badgeBg       = isIncome ? theme.incomeBg : isInvestment ? theme.investmentBg : theme.expenseBg;

    return (
      <View style={[styles.card, theme.shadow, !item.isActive && styles.cardInactive]}>
        <View style={[styles.cardIcon, { backgroundColor: categoryStyle.bg }]}>
          <Ionicons name={categoryStyle.icon} size={24} color={categoryStyle.color} />
        </View>

        <View style={styles.cardInfo}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
            <View style={[styles.badge, { backgroundColor: badgeBg }]}>
              <Text style={[styles.badgeText, { color: accentColor }]}>{typeLabel}</Text>
            </View>
          </View>
          <Text style={styles.cardAmount}>
            {item.currency || 'TRY'} {Number(item.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
          </Text>
          <View style={styles.cardMeta}>
            <Ionicons name="repeat" size={12} color={theme.textMuted} />
            <Text style={styles.cardMetaText}>{FREQ_LABELS[item.frequency as keyof typeof FREQ_LABELS] || item.frequency}</Text>
            <Ionicons name="calendar-outline" size={12} color={theme.textMuted} style={{ marginLeft: 8 }} />
            <Text style={styles.cardMetaText}>Sonraki: {nextDateLabel(item.nextDate)}</Text>
          </View>
        </View>

        <View style={styles.cardActions}>
          <Switch
            value={item.isActive}
            onValueChange={() => handleToggleActive(item)}
            trackColor={{ false: theme.surfaceAlt2, true: accentColor }}
            thumbColor="#fff"
            style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
          />
          <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
            <Ionicons name="trash-outline" size={18} color={theme.textFaint} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={theme.statusBar} backgroundColor={theme.bg} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={theme.textSub} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tekrarlayan Kayıtlar</Text>
        <View style={styles.backBtn} />
      </View>

      {loading ? (
        <ActivityIndicator color={theme.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={records}
          keyExtractor={item => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="repeat-outline" size={64} color={theme.surfaceAlt2} />
              <Text style={styles.emptyText}>Tekrarlayan kayıt yok</Text>
              <Text style={styles.emptySubText}>
                Kayıt eklerken "Tekrarlayan Kayıt" seçeneğini aktif et
              </Text>
            </View>
          }
          ListHeaderComponent={
            records.length > 0 ? (
              <View style={styles.infoBox}>
                <Ionicons name="information-circle-outline" size={16} color={theme.primary} />
                <Text style={styles.infoText}>
                  Aktif kayıtlar uygulama açılışında otomatik oluşturulur. Toggle ile duraklatabilirsin.
                </Text>
              </View>
            ) : null
          }
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('AddExpense')}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function makeStyles(theme: AppTheme) {
  return StyleSheet.create({
    safeArea:    { flex: 1, backgroundColor: theme.bg },
    header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.border },
    backBtn:     { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.surfaceAlt, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 17, fontWeight: 'bold', color: theme.text },

    list: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 100 },

    infoBox:  { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: theme.surfaceAlt, borderRadius: 12, padding: 12, marginBottom: 16 },
    infoText: { flex: 1, fontSize: 13, color: theme.textSub, lineHeight: 18 },

    card:         { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surface, borderRadius: 16, padding: 16, marginBottom: 12 },
    cardInactive: { opacity: 0.5 },
    cardIcon:     { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    cardInfo:     { flex: 1, gap: 4 },
    cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    cardTitle:    { fontSize: 14, fontWeight: 'bold', color: theme.text, flex: 1 },
    badge:        { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    badgeText:    { fontSize: 10, fontWeight: '700' },
    cardAmount:   { fontSize: 15, fontWeight: 'bold', color: theme.text },
    cardMeta:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
    cardMetaText: { fontSize: 11, color: theme.textMuted },
    cardActions:  { alignItems: 'center', gap: 8 },
    deleteBtn:    { padding: 4 },

    fab: { position: 'absolute', right: 24, bottom: 40, width: 52, height: 52, borderRadius: 26, backgroundColor: theme.primary, justifyContent: 'center', alignItems: 'center', shadowColor: theme.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },

    emptyState:   { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32 },
    emptyText:    { fontSize: 16, fontWeight: '600', color: theme.textMuted, marginTop: 16, marginBottom: 8 },
    emptySubText: { fontSize: 13, color: theme.textFaint, textAlign: 'center', lineHeight: 20 },
  });
}
