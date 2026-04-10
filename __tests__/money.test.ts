import { normalizeCurrency, formatMoney, formatMixedTotal } from '../src/utils/money';

describe('normalizeCurrency', () => {
  it('defaults empty to TRY', () => {
    expect(normalizeCurrency(null)).toBe('TRY');
    expect(normalizeCurrency('  ')).toBe('TRY');
  });

  it('uppercases', () => {
    expect(normalizeCurrency('usd')).toBe('USD');
  });
});

describe('formatMoney', () => {
  it('formats TRY with lira symbol', () => {
    expect(formatMoney(1234.5, 'TRY')).toMatch(/₺/);
    expect(formatMoney(1234.5, 'TRY')).toMatch(/1\.234/);
  });

  it('formats unknown code with suffix', () => {
    expect(formatMoney(100, 'AUD')).toContain('AUD');
  });
});

describe('formatMixedTotal', () => {
  it('uses TRY when no records', () => {
    expect(formatMixedTotal(50, [])).toBe(formatMoney(50, 'TRY'));
  });

  it('single currency uses symbol', () => {
    const r = [{ amount: 10, currency: 'USD' }, { amount: 20, currency: 'USD' }];
    expect(formatMixedTotal(30, r)).toBe(formatMoney(30, 'USD'));
  });

  it('multiple currencies shows mixed label', () => {
    const r = [{ amount: 10, currency: 'USD' }, { amount: 20, currency: 'TRY' }];
    expect(formatMixedTotal(30, r)).toContain('karışık');
  });
});
