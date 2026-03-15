import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { getRecords, deleteRecord } from '../services/api';
import { getCategoryStyle } from '../constants/categories';

const PERIOD_TABS = ['Tümü', 'Bu Ay', 'Bu Hafta', 'Bugün'];
const TYPE_TABS = ['Tümü', 'Gider', 'Yatırım'];

function parseDate(dateStr) {
  if (!dateStr) return new Date(0);
  const parts = dateStr.split('.');
  if (parts.length === 3) {
    return new Date(
      parseInt(parts[2], 10),
      parseInt(parts[1], 10) - 1,
      parseInt(parts[0], 10),
    );
  }
  return new Date(dateStr);
}

export default function RecordDetailScreen({ navigation, route }) {
  const { category, type, title, icon, bg, color } = route.params || {};

  const [allRecords, setAllRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activePeriod, setActivePeriod] = useState('Tümü');
  const [activeType, setActiveType] = useState('Tümü');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getRecords();
      setAllRecords(Array.isArray(data) ? data : []);
    } catch {
      // backend unavailable
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData]),
  );

  const filteredRecords = allRecords.filter(k => {
    if (category && k.category !== category) return false;

    if (type) {
      if (k.type !== type) return false;
    } else if (activeType !== 'Tümü') {
      if (activeType === 'Gider' && k.type !== 'expense') return false;
      if (activeType === 'Yatırım' && k.type !== 'investment') return false;
    }

    if (activePeriod !== 'Tümü') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 6);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const parsedDate = parseDate(k.date);
      if (activePeriod === 'Bugün' && parsedDate < today) return false;
      if (activePeriod === 'Bu Hafta' && parsedDate < weekAgo) return false;
      if (activePeriod === 'Bu Ay' && parsedDate < monthStart) return false;
    }

    return true;
  });

  const totalAmount = filteredRecords.reduce((s, k) => s + Number(k.amount), 0);
  const transactionCount = filteredRecords.length;

  const handleDelete = (id, itemTitle) => {
    Alert.alert(
      'Kaydı Sil',
      `"${itemTitle}" kaydını silmek istediğinize emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteRecord(id);
              setAllRecords(prev => prev.filter(k => k._id !== id));
            } catch {
              Alert.alert('Hata', 'Kayıt silinemedi. Bağlantıyı kontrol edin.');
            }
          },
        },
      ],
    );
  };

  const bannerColor = color || (type === 'investment' ? '#11c4d4' : '#EF4444');
  const bannerBackground =
    bg || (type === 'investment' ? '#E0F7FA' : '#FEE2E2');

  const renderRecord = ({ item }) => {
    const categoryStyle = getCategoryStyle(item.category);
    const isInvestment = item.type === 'investment';
    return (
      <View style={styles.recordItem}>
        <View
          style={[styles.recordIcon, { backgroundColor: categoryStyle.bg }]}
        >
          <Ionicons
            name={categoryStyle.icon}
            size={22}
            color={categoryStyle.color}
          />
        </View>

        <View style={styles.recordInfo}>
          <Text style={styles.recordTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <View style={styles.recordSubRow}>
            <View
              style={[
                styles.typeBadge,
                { backgroundColor: isInvestment ? '#E0F7FA' : '#FEE2E2' },
              ]}
            >
              <Text
                style={[
                  styles.typeBadgeText,
                  { color: isInvestment ? '#0891B2' : '#DC2626' },
                ]}
              >
                {isInvestment ? 'Yatırım' : 'Gider'}
              </Text>
            </View>
            <Text style={styles.recordSubText}>
              {item.category} • {item.date}
            </Text>
          </View>
        </View>

        <View style={styles.recordRight}>
          <Text
            style={[
              styles.recordAmount,
              { color: isInvestment ? '#11c4d4' : '#EF4444' },
            ]}
          >
            {isInvestment ? '' : '-'}₺
            {Number(item.amount).toLocaleString('tr-TR', {
              minimumFractionDigits: 2,
            })}
          </Text>
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() =>
                navigation.navigate('AddExpense', { record: item })
              }
            >
              <Ionicons name="pencil-outline" size={15} color="#64748B" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => handleDelete(item._id, item.title)}
            >
              <Ionicons name="trash-outline" size={15} color="#CBD5E1" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F6F8F8" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={22} color="#475569" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          {icon && (
            <View
              style={[
                styles.headerIconBox,
                { backgroundColor: bannerBackground },
              ]}
            >
              <Ionicons name={icon} size={16} color={bannerColor} />
            </View>
          )}
          <Text style={styles.headerTitle} numberOfLines={1}>
            {title || 'Tüm Kayıtlar'}
          </Text>
        </View>
        <View style={styles.backBtn} />
      </View>

      {/* Stats Banner */}
      <View style={[styles.statsBanner, { backgroundColor: bannerColor }]}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            ₺{totalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
          </Text>
          <Text style={styles.statLabel}>Toplam</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{transactionCount}</Text>
          <Text style={styles.statLabel}>İşlem</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {transactionCount > 0
              ? `₺${(totalAmount / transactionCount).toLocaleString('tr-TR', {
                  minimumFractionDigits: 0,
                })}`
              : '₺0'}
          </Text>
          <Text style={styles.statLabel}>Ortalama</Text>
        </View>
      </View>

      <FlatList
        data={filteredRecords}
        keyExtractor={item => item._id || Math.random().toString()}
        renderItem={renderRecord}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* Type filter — only when viewing all records */}
            {!category && !type && (
              <View style={styles.typeContainer}>
                {TYPE_TABS.map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[
                      styles.typeBtn,
                      activeType === t && styles.typeBtnActive,
                    ]}
                    onPress={() => setActiveType(t)}
                  >
                    <Text
                      style={[
                        styles.typeBtnText,
                        activeType === t && styles.typeBtnTextActive,
                      ]}
                    >
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Period filter */}
            <View style={styles.periodContainer}>
              {PERIOD_TABS.map(p => (
                <TouchableOpacity
                  key={p}
                  style={[
                    styles.periodBtn,
                    activePeriod === p && { backgroundColor: bannerColor },
                  ]}
                  onPress={() => setActivePeriod(p)}
                >
                  <Text
                    style={[
                      styles.periodBtnText,
                      activePeriod === p && {
                        color: '#fff',
                        fontWeight: '700',
                      },
                    ]}
                  >
                    {p}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {loading && (
              <ActivityIndicator
                color={bannerColor}
                style={{ marginVertical: 24 }}
              />
            )}

            {!loading && filteredRecords.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="file-tray-outline" size={72} color="#E2E8F0" />
                <Text style={styles.emptyText}>
                  Bu dönemde kayıt bulunamadı
                </Text>
                <Text style={styles.emptySubText}>
                  Yeni kayıt eklemek için ana sayfadaki + butonunu kullanın
                </Text>
              </View>
            )}
          </>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F6F8F8' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#F6F8F8',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  headerIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: 'bold', color: '#0F172A' },

  statsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },

  typeContainer: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 14,
    padding: 4,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  typeBtnActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  typeBtnText: { fontSize: 13, fontWeight: '600', color: '#94A3B8' },
  typeBtnTextActive: { color: '#0F172A', fontWeight: '700' },

  periodContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 12,
    marginBottom: 16,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  periodBtnText: { fontSize: 12, fontWeight: '600', color: '#64748B' },

  list: { paddingHorizontal: 16, paddingBottom: 32 },

  recordItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  recordIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  recordInfo: { flex: 1, gap: 4 },
  recordTitle: { fontSize: 14, fontWeight: 'bold', color: '#0F172A' },
  recordSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  typeBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  typeBadgeText: { fontSize: 10, fontWeight: '700' },
  recordSubText: { fontSize: 11, color: '#94A3B8' },
  recordRight: { alignItems: 'flex-end', gap: 6 },
  recordAmount: { fontSize: 15, fontWeight: 'bold' },
  actionRow: { flexDirection: 'row', gap: 4 },
  editBtn: { padding: 4 },
  deleteBtn: { padding: 4 },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 13,
    color: '#CBD5E1',
    textAlign: 'center',
    lineHeight: 20,
  },
});
