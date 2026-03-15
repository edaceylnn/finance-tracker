export const CATEGORY_ICONS = {
  // Expense categories
  Yiyecek: { icon: 'restaurant', bg: '#FFF3E0', color: '#F57C00' },
  Ulaşım: { icon: 'car', bg: '#E3F2FD', color: '#1565C0' },
  Kira: { icon: 'home', bg: '#F3E5F5', color: '#7B1FA2' },
  Alışveriş: { icon: 'bag', bg: '#E0F7FA', color: '#00838F' },
  Eğlence: { icon: 'film', bg: '#FCE4EC', color: '#C62828' },
  Faturalar: { icon: 'document-text', bg: '#FFF9C4', color: '#F57F17' },
  Sağlık: { icon: 'medical', bg: '#FCE4EC', color: '#E91E63' },
  // Investment categories
  'Hisse Senedi': { icon: 'trending-up', bg: '#E8F5E9', color: '#2E7D32' },
  Kripto: { icon: 'logo-bitcoin', bg: '#FFF3E0', color: '#FF6F00' },
  Altın: { icon: 'star', bg: '#FFFDE7', color: '#F9A825' },
  Döviz: { icon: 'cash', bg: '#E3F2FD', color: '#0277BD' },
  'Yatırım Fonu': { icon: 'pie-chart', bg: '#F3E5F5', color: '#6A1B9A' },
  Gayrimenkul: { icon: 'business', bg: '#ECEFF1', color: '#455A64' },
  Diğer: {
    icon: 'ellipsis-horizontal-circle',
    bg: '#ECEFF1',
    color: '#546E7A',
  },
};

export function getCategoryStyle(category) {
  return CATEGORY_ICONS[category] || CATEGORY_ICONS['Diğer'];
}
