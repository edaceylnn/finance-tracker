import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { addRecord, updateRecord } from '../services/api';
import {
  formatRecordDateDisplay,
  parseUserDateInput,
  toIsoDateForApi,
} from '../utils/recordDate';

const EXPENSE_CATEGORIES = [
  { key: 'Yiyecek',   icon: 'restaurant'                  },
  { key: 'Ulaşım',    icon: 'car'                         },
  { key: 'Alışveriş', icon: 'bag'                         },
  { key: 'Eğlence',   icon: 'film'                        },
  { key: 'Kira',      icon: 'home'                        },
  { key: 'Faturalar', icon: 'document-text'               },
  { key: 'Sağlık',    icon: 'medical'                     },
  { key: 'Diğer',     icon: 'ellipsis-horizontal-circle'  },
];

const INVESTMENT_CATEGORIES = [
  { key: 'Hisse Senedi', icon: 'trending-up'                 },
  { key: 'Kripto',       icon: 'logo-bitcoin'                },
  { key: 'Altın',        icon: 'star'                        },
  { key: 'Döviz',        icon: 'cash'                        },
  { key: 'Yatırım Fonu', icon: 'pie-chart'                   },
  { key: 'Gayrimenkul',  icon: 'business'                    },
  { key: 'Diğer',        icon: 'ellipsis-horizontal-circle'  },
];

export default function AddExpenseScreen({ navigation, route }) {
  const recordToEdit = route.params?.record ?? null;
  const editMode = !!recordToEdit;

  const [type, setType]                         = useState(recordToEdit?.type || 'expense');
  const [amount, setAmount]                     = useState(recordToEdit ? String(recordToEdit.amount) : '');
  const [selectedCategory, setSelectedCategory] = useState(
    recordToEdit?.category || 'Yiyecek',
  );
  const [date, setDate] = useState(
    recordToEdit?.date != null
      ? formatRecordDateDisplay(recordToEdit.date)
      : formatRecordDateDisplay(new Date()),
  );
  const [note, setNote]     = useState(recordToEdit?.title || '');
  const [saving, setSaving] = useState(false);

  const categories  = type === 'expense' ? EXPENSE_CATEGORIES : INVESTMENT_CATEGORIES;
  const isInvestment = type === 'investment';

  const handleTypeChange = newType => {
    setType(newType);
    setSelectedCategory(newType === 'expense' ? 'Yiyecek' : 'Hisse Senedi');
  };

  const handleSave = async () => {
    const normalAmt = parseFloat(amount.replace(',', '.'));
    if (!amount || isNaN(normalAmt) || normalAmt <= 0) {
      Alert.alert('Hata', 'Lütfen geçerli bir tutar girin.');
      return;
    }
    const parsedDate = parseUserDateInput(date);
    if (!parsedDate) {
      Alert.alert('Hata', 'Lütfen geçerli bir tarih girin (ör. GG.AA.YYYY).');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title:    note.trim() || selectedCategory,
        amount:   normalAmt,
        category: selectedCategory,
        type,
        date:     toIsoDateForApi(parsedDate),
      };
      if (editMode) {
        await updateRecord(recordToEdit._id, payload);
        Alert.alert('Başarılı', 'Kayıt güncellendi!', [
          { text: 'Tamam', onPress: () => navigation.goBack() },
        ]);
      } else {
        await addRecord(payload);
        const message = isInvestment ? 'Yatırım kaydedildi!' : 'Gider kaydedildi!';
        Alert.alert('Başarılı', message, [
          { text: 'Tamam', onPress: () => navigation.goBack() },
        ]);
      }
    } catch {
      Alert.alert('Bağlantı Hatası', "Backend'e bağlanılamadı. Lütfen sunucunun çalıştığından emin olun.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color="#475569" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {editMode ? 'Kaydı Düzenle' : (isInvestment ? 'Yatırım Ekle' : 'Gider Ekle')}
          </Text>
          <View style={styles.backBtn} />
        </View>

        {/* Tip Seçimi */}
        <View style={styles.typeContainer}>
          <TouchableOpacity
            style={[styles.typeBtn, !isInvestment && styles.typeBtnExpenseActive]}
            onPress={() => handleTypeChange('expense')}
          >
            <Ionicons name="arrow-up-circle" size={18} color={!isInvestment ? '#fff' : '#94A3B8'} />
            <Text style={[styles.typeBtnText, !isInvestment && styles.typeBtnTextActive]}>Gider</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeBtn, isInvestment && styles.typeBtnInvestmentActive]}
            onPress={() => handleTypeChange('investment')}
          >
            <Ionicons name="trending-up" size={18} color={isInvestment ? '#fff' : '#94A3B8'} />
            <Text style={[styles.typeBtnText, isInvestment && styles.typeBtnTextActive]}>Yatırım</Text>
          </TouchableOpacity>
        </View>

        {/* Tutar */}
        <Text style={styles.label}>TUTAR</Text>
        <View style={styles.amountRow}>
          <Text style={[styles.amountCurrency, isInvestment && styles.amountCurrencyInvestment]}>₺</Text>
          <TextInput
            style={styles.amountInput}
            value={amount}
            onChangeText={text => {
              const cleaned = text.replace(/[^\d.,]/g, '').replace(/,/g, '.');
              const parts = cleaned.split('.');
              const result = parts[0] + (parts.length > 1 ? '.' + parts.slice(1).join('') : '');
              setAmount(result);
            }}
            placeholder="0,00"
            keyboardType="numeric"
            placeholderTextColor="#CBD5E1"
          />
        </View>

        {/* Kategori */}
        <Text style={[styles.label, { marginTop: 8 }]}>KATEGORİ</Text>
        <View style={styles.categoryGrid}>
          {categories.map(cat => {
            const isActive = selectedCategory === cat.key;
            return (
              <TouchableOpacity
                key={cat.key}
                style={[
                  styles.catBox,
                  { backgroundColor: isActive
                      ? (isInvestment ? '#11c4d4' : '#EF4444')
                      : (isInvestment ? '#EFF9FA' : '#FFF5F5') },
                ]}
                onPress={() => setSelectedCategory(cat.key)}
              >
                <Ionicons
                  name={cat.icon}
                  size={22}
                  color={isActive ? '#fff' : (isInvestment ? '#11c4d4' : '#EF4444')}
                />
                <Text style={[styles.catLabel, { color: isActive ? '#fff' : '#64748B' }, isActive && { fontWeight: '700' }]}>
                  {cat.key}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Tarih */}
        <Text style={styles.label}>TARİH</Text>
        <View style={styles.inputRow}>
          <Ionicons name="calendar-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
          <TextInput
            style={styles.textInput}
            value={date}
            onChangeText={setDate}
            placeholderTextColor="#94A3B8"
          />
          <Ionicons name="calendar" size={20} color="#94A3B8" />
        </View>

        {/* Not */}
        <Text style={styles.label}>NOT (İSTEĞE BAĞLI)</Text>
        <View style={[styles.inputRow, styles.noteRow]}>
          <Ionicons name="menu" size={20} color="#94A3B8" style={styles.inputIcon} />
          <TextInput
            style={[styles.textInput, styles.noteInput]}
            value={note}
            onChangeText={setNote}
            placeholder="Ne için harcandı?"
            placeholderTextColor="#94A3B8"
            multiline
          />
        </View>

        {/* Fiş Ekle */}
        <TouchableOpacity style={styles.receiptBox}>
          <View style={styles.receiptIconBox}>
            <Ionicons name="camera-outline" size={24} color="#94A3B8" />
          </View>
          <View>
            <Text style={styles.receiptTitle}>Fiş Ekle</Text>
            <Text style={styles.receiptSub}>İşlemin fotoğrafı (isteğe bağlı)</Text>
          </View>
        </TouchableOpacity>

        {/* Kaydet Butonu */}
        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.7 }, isInvestment && styles.saveBtnInvestment]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color="#fff" style={{ marginRight: 8 }} />
            : <Ionicons name="checkmark-circle" size={24} color="#fff" style={{ marginRight: 8 }} />
          }
          <Text style={styles.saveBtnText}>
            {editMode ? 'Güncelle' : (isInvestment ? 'Yatırımı Kaydet' : 'Gideri Kaydet')}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  content:  { paddingHorizontal: 24, paddingBottom: 40 },

  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, marginBottom: 8 },
  backBtn:     { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#0F172A' },

  typeContainer:          { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 16, padding: 4, marginBottom: 8 },
  typeBtn:                { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12 },
  typeBtnExpenseActive:   { backgroundColor: '#EF4444', shadowColor: '#EF4444', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 4 },
  typeBtnInvestmentActive:{ backgroundColor: '#11c4d4', shadowColor: '#11c4d4', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 4 },
  typeBtnText:            { fontSize: 14, fontWeight: '600', color: '#94A3B8' },
  typeBtnTextActive:      { color: '#fff' },

  label: { fontSize: 11, fontWeight: '700', color: '#94A3B8', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8, marginTop: 16 },

  amountRow:                { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, marginBottom: 4 },
  amountCurrency:           { fontSize: 36, fontWeight: 'bold', color: '#EF4444', marginRight: 4 },
  amountCurrencyInvestment: { color: '#11c4d4' },
  amountInput:              { fontSize: 48, fontWeight: 'bold', color: '#CBD5E1', flex: 1, textAlign: 'center', padding: 0 },

  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  catBox:       { width: '22%', alignItems: 'center', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 4, gap: 6 },
  catLabel:     { fontSize: 10, fontWeight: '500', textAlign: 'center' },

  inputRow:  { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 14, marginBottom: 4 },
  inputIcon: { marginRight: 10 },
  textInput: { flex: 1, fontSize: 15, color: '#0F172A', padding: 0 },
  noteRow:   { alignItems: 'flex-start', paddingVertical: 12 },
  noteInput: { minHeight: 80, textAlignVertical: 'top' },

  receiptBox:     { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#CBD5E1', borderRadius: 16, padding: 16, marginTop: 16, marginBottom: 24, gap: 14 },
  receiptIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  receiptTitle:   { fontSize: 14, fontWeight: 'bold', color: '#0F172A' },
  receiptSub:     { fontSize: 12, color: '#94A3B8', marginTop: 2 },

  saveBtn:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#EF4444', borderRadius: 16, paddingVertical: 18, shadowColor: '#EF4444', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 6 },
  saveBtnInvestment: { backgroundColor: '#11c4d4', shadowColor: '#11c4d4' },
  saveBtnText:       { fontSize: 17, fontWeight: 'bold', color: '#fff' },
});
