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
  Switch,
  Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { addRecord, updateRecord, addRecurringRecord } from '../services/api';
import {
  formatRecordDateDisplay,
  parseUserDateInput,
  toIsoDateForApi,
} from '../utils/recordDate';
import { useTheme } from '../context/ThemeContext';
import type { AppNavigation, AddExpenseRouteParams } from '../types/navigation';
import type { FinanceRecord } from '../types/record';
import type { AppTheme } from '../theme';

type RecordType = 'expense' | 'income' | 'investment';

type Props = {
  navigation: AppNavigation;
  route: { params?: AddExpenseRouteParams };
};

const EXPENSE_CATEGORIES = [
  { key: 'Yiyecek',   icon: 'restaurant'                 },
  { key: 'Ulaşım',    icon: 'car'                        },
  { key: 'Alışveriş', icon: 'bag'                        },
  { key: 'Eğlence',   icon: 'film'                       },
  { key: 'Kira',      icon: 'home'                       },
  { key: 'Faturalar', icon: 'document-text'              },
  { key: 'Sağlık',    icon: 'medical'                    },
  { key: 'Diğer',     icon: 'ellipsis-horizontal-circle' },
];

const INVESTMENT_CATEGORIES = [
  { key: 'Hisse Senedi', icon: 'trending-up'                },
  { key: 'Kripto',       icon: 'logo-bitcoin'               },
  { key: 'Altın',        icon: 'star'                       },
  { key: 'Döviz',        icon: 'cash'                       },
  { key: 'Yatırım Fonu', icon: 'pie-chart'                  },
  { key: 'Gayrimenkul',  icon: 'business'                   },
  { key: 'Diğer',        icon: 'ellipsis-horizontal-circle' },
];

const INCOME_CATEGORIES = [
  { key: 'Maaş',             icon: 'briefcase'              },
  { key: 'Freelance',        icon: 'laptop-outline'         },
  { key: 'Kira Geliri',      icon: 'home'                   },
  { key: 'Yatırım Getirisi', icon: 'trending-up'            },
  { key: 'Diğer Gelir',      icon: 'wallet-outline'         },
];

const CURRENCIES = ['TRY', 'USD', 'EUR', 'GBP', 'CHF', 'JPY'];

const FREQUENCIES = [
  { key: 'daily',   label: 'Günlük'  },
  { key: 'weekly',  label: 'Haftalık' },
  { key: 'monthly', label: 'Aylık'   },
  { key: 'yearly',  label: 'Yıllık'  },
];

function sanitizeAmountTyping(text: string) {
  const t = text.replace(/[^\d.,]/g, '');
  let out = '';
  let sepUsed = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (c >= '0' && c <= '9') out += c;
    else if ((c === ',' || c === '.') && !sepUsed) {
      out += c;
      sepUsed = true;
    }
  }
  return out;
}

export default function AddExpenseScreen({ navigation, route }: Props) {
  const theme = useTheme();
  const recordToEdit: FinanceRecord | null = route.params?.record ?? null;
  const editMode = !!recordToEdit;

  const [type, setType]                         = useState<RecordType>((recordToEdit?.type as RecordType) || 'expense');
  const [amount, setAmount]                     = useState(recordToEdit ? String(recordToEdit.amount) : '');
  const [currency, setCurrency]                 = useState(recordToEdit?.currency || 'TRY');
  const [selectedCategory, setSelectedCategory] = useState(
    recordToEdit?.category || 'Yiyecek',
  );
  const [date, setDate] = useState(
    recordToEdit?.date != null
      ? formatRecordDateDisplay(recordToEdit.date)
      : formatRecordDateDisplay(new Date()),
  );
  const [note, setNote]             = useState(recordToEdit?.title || '');
  const [saving, setSaving]         = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency]   = useState('monthly');

  const categories =
    type === 'expense' ? EXPENSE_CATEGORIES :
    type === 'income'  ? INCOME_CATEGORIES  :
    INVESTMENT_CATEGORIES;

  const accentColor =
    type === 'expense'    ? theme.expense :
    type === 'income'     ? theme.income  :
    theme.investment;

  const handleTypeChange = (newType: RecordType) => {
    setType(newType);
    if (newType === 'expense')    setSelectedCategory('Yiyecek');
    else if (newType === 'income') setSelectedCategory('Maaş');
    else                          setSelectedCategory('Hisse Senedi');
  };

  const insertDecimalSeparator = (sep: string) => {
    setAmount(prev => {
      const p = sanitizeAmountTyping(prev);
      if (p.includes(',') || p.includes('.')) return p;
      if (p === '') return `0${sep}`;
      return p + sep;
    });
  };

  const handleSave = async () => {
    const normalAmt = parseFloat(String(amount).trim().replace(',', '.'));
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
        currency,
        date:     toIsoDateForApi(parsedDate),
      };

      if (isRecurring && !editMode) {
        await addRecurringRecord({ ...payload, frequency, startDate: toIsoDateForApi(parsedDate) });
        Alert.alert('Başarılı', 'Tekrarlayan kayıt oluşturuldu!', [
          { text: 'Tamam', onPress: () => navigation.goBack() },
        ]);
        return;
      }

      if (editMode) {
        await updateRecord(String(recordToEdit._id), payload);
        Alert.alert('Başarılı', 'Kayıt güncellendi!', [
          { text: 'Tamam', onPress: () => navigation.goBack() },
        ]);
      } else {
        await addRecord(payload);
        const message =
          type === 'income'     ? 'Gelir kaydedildi!'    :
          type === 'investment' ? 'Yatırım kaydedildi!'  :
          'Gider kaydedildi!';
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

  const s = makeStyles(theme);

  return (
    <SafeAreaView style={s.safeArea}>
      <StatusBar barStyle={theme.statusBar} backgroundColor={theme.surface} />
      <ScrollView
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={theme.textSub} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>
            {editMode ? 'Kaydı Düzenle' :
             type === 'income' ? 'Gelir Ekle' :
             type === 'investment' ? 'Yatırım Ekle' : 'Gider Ekle'}
          </Text>
          <View style={s.backBtn} />
        </View>

        {/* Tip Seçimi */}
        <View style={s.typeContainer}>
          {[
            { key: 'expense',    label: 'Gider',   icon: 'arrow-up-circle' },
            { key: 'income',     label: 'Gelir',   icon: 'arrow-down-circle' },
            { key: 'investment', label: 'Yatırım', icon: 'trending-up' },
          ].map(t => {
            const active = type === t.key;
            const btnAccent =
              t.key === 'expense' ? theme.expense :
              t.key === 'income'  ? theme.income  :
              theme.investment;
            return (
              <TouchableOpacity
                key={t.key}
                style={[s.typeBtn, active && { backgroundColor: btnAccent, shadowColor: btnAccent, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 4 }]}
                onPress={() => handleTypeChange(t.key as RecordType)}
              >
                <Ionicons name={t.icon} size={16} color={active ? '#fff' : theme.textMuted} />
                <Text style={[s.typeBtnText, active && { color: '#fff' }]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Tutar + Para Birimi */}
        <Text style={s.label}>TUTAR</Text>
        <View style={s.amountRow}>
          <Text style={[s.amountCurrency, { color: accentColor }]}>{currency}</Text>
          <TextInput
            style={s.amountInput}
            value={amount}
            onChangeText={text => setAmount(sanitizeAmountTyping(text))}
            placeholder="0,00"
            keyboardType={Platform.OS === 'ios' ? 'number-pad' : 'decimal-pad'}
            placeholderTextColor={theme.textFaint}
          />
        </View>
        <View style={s.amountSepRow}>
          <Text style={s.amountSepHint}>Ondalık</Text>
          <TouchableOpacity
            style={[s.amountSepBtn, { backgroundColor: theme.surfaceAlt }]}
            onPress={() => insertDecimalSeparator(',')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[s.amountSepBtnText, { color: theme.text }]}>,</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.amountSepBtn, { backgroundColor: theme.surfaceAlt }]}
            onPress={() => insertDecimalSeparator('.')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[s.amountSepBtnText, { color: theme.text }]}>.</Text>
          </TouchableOpacity>
        </View>

        {/* Para Birimi Seçimi */}
        <Text style={s.label}>PARA BİRİMİ</Text>
        <View style={s.currencyRow}>
          {CURRENCIES.map(c => (
            <TouchableOpacity
              key={c}
              style={[s.currencyBtn, currency === c && { backgroundColor: accentColor }]}
              onPress={() => setCurrency(c)}
            >
              <Text style={[s.currencyBtnText, currency === c && { color: '#fff', fontWeight: '700' }]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Kategori */}
        <Text style={[s.label, { marginTop: 8 }]}>KATEGORİ</Text>
        <View style={s.categoryGrid}>
          {categories.map(cat => {
            const isActive = selectedCategory === cat.key;
            return (
              <TouchableOpacity
                key={cat.key}
                style={[s.catBox, { backgroundColor: isActive ? accentColor : theme.surfaceAlt }]}
                onPress={() => setSelectedCategory(cat.key)}
              >
                <Ionicons name={cat.icon} size={22} color={isActive ? '#fff' : accentColor} />
                <Text style={[s.catLabel, { color: isActive ? '#fff' : theme.textSub }, isActive && { fontWeight: '700' }]}>
                  {cat.key}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Tarih */}
        <Text style={s.label}>TARİH</Text>
        <View style={s.inputRow}>
          <Ionicons name="calendar-outline" size={20} color={theme.textMuted} style={s.inputIcon} />
          <TextInput
            style={s.textInput}
            value={date}
            onChangeText={setDate}
            placeholderTextColor={theme.textMuted}
          />
          <Ionicons name="calendar" size={20} color={theme.textMuted} />
        </View>

        {/* Not */}
        <Text style={s.label}>NOT (İSTEĞE BAĞLI)</Text>
        <View style={[s.inputRow, s.noteRow]}>
          <Ionicons name="menu" size={20} color={theme.textMuted} style={s.inputIcon} />
          <TextInput
            style={[s.textInput, s.noteInput]}
            value={note}
            onChangeText={setNote}
            placeholder="Ne için?"
            placeholderTextColor={theme.textMuted}
            multiline
          />
        </View>

        {/* Tekrarlayan Kayıt */}
        {!editMode && (
          <>
            <View style={s.recurringRow}>
              <View style={s.recurringLeft}>
                <Ionicons name="repeat" size={20} color={accentColor} />
                <View>
                  <Text style={s.recurringTitle}>Tekrarlayan Kayıt</Text>
                  <Text style={s.recurringSub}>Otomatik olarak tekrarlanır</Text>
                </View>
              </View>
              <Switch
                value={isRecurring}
                onValueChange={setIsRecurring}
                trackColor={{ false: theme.surfaceAlt2, true: accentColor }}
                thumbColor="#fff"
              />
            </View>

            {isRecurring && (
              <>
                <Text style={s.label}>TEKRAR SIKLIĞI</Text>
                <View style={s.frequencyRow}>
                  {FREQUENCIES.map(f => (
                    <TouchableOpacity
                      key={f.key}
                      style={[s.freqBtn, frequency === f.key && { backgroundColor: accentColor }]}
                      onPress={() => setFrequency(f.key)}
                    >
                      <Text style={[s.freqBtnText, frequency === f.key && { color: '#fff', fontWeight: '700' }]}>
                        {f.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </>
        )}

        {/* Kaydet Butonu */}
        <TouchableOpacity
          style={[s.saveBtn, { backgroundColor: accentColor, shadowColor: accentColor }, saving && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color="#fff" style={{ marginRight: 8 }} />
            : <Ionicons name="checkmark-circle" size={24} color="#fff" style={{ marginRight: 8 }} />
          }
          <Text style={s.saveBtnText}>
            {editMode ? 'Güncelle' :
             isRecurring ? 'Tekrarlayan Kayıt Oluştur' :
             type === 'income' ? 'Geliri Kaydet' :
             type === 'investment' ? 'Yatırımı Kaydet' : 'Gideri Kaydet'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(theme: AppTheme) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.surface },
    content:  { paddingHorizontal: 24, paddingBottom: 40 },

    header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, marginBottom: 8 },
    backBtn:     { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.surfaceAlt, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: theme.text },

    typeContainer: { flexDirection: 'row', backgroundColor: theme.surfaceAlt, borderRadius: 16, padding: 4, marginBottom: 8 },
    typeBtn:       { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 10, borderRadius: 12 },
    typeBtnText:   { fontSize: 13, fontWeight: '600', color: theme.textMuted },

    label: { fontSize: 11, fontWeight: '700', color: theme.textMuted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8, marginTop: 16 },

    amountRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, marginBottom: 4 },
    amountCurrency: { fontSize: 28, fontWeight: 'bold', marginRight: 8 },
    amountInput:    { fontSize: 48, fontWeight: 'bold', color: theme.textFaint, flex: 1, textAlign: 'center', padding: 0 },

    amountSepRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 8 },
    amountSepHint:   { fontSize: 12, fontWeight: '600', color: theme.textMuted, marginRight: 4 },
    amountSepBtn:    { minWidth: 44, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    amountSepBtnText:{ fontSize: 20, fontWeight: '700' },

    currencyRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    currencyBtn:    { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: theme.surfaceAlt },
    currencyBtnText:{ fontSize: 13, fontWeight: '600', color: theme.textSub },

    categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
    catBox:       { width: '22%', alignItems: 'center', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 4, gap: 6 },
    catLabel:     { fontSize: 10, fontWeight: '500', textAlign: 'center' },

    inputRow:  { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surfaceAlt, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 14, marginBottom: 4 },
    inputIcon: { marginRight: 10 },
    textInput: { flex: 1, fontSize: 15, color: theme.text, padding: 0 },
    noteRow:   { alignItems: 'flex-start', paddingVertical: 12 },
    noteInput: { minHeight: 80, textAlignVertical: 'top' },

    recurringRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.surfaceAlt, borderRadius: 14, padding: 16, marginTop: 16 },
    recurringLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    recurringTitle:{ fontSize: 15, fontWeight: '600', color: theme.text },
    recurringSub:  { fontSize: 12, color: theme.textMuted, marginTop: 2 },

    frequencyRow:  { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    freqBtn:       { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: theme.surfaceAlt },
    freqBtnText:   { fontSize: 13, fontWeight: '600', color: theme.textSub },

    saveBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 16, paddingVertical: 18, marginTop: 24, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 6 },
    saveBtnText: { fontSize: 17, fontWeight: 'bold', color: '#fff' },
  });
}
