import {
  parseRecordDate,
  formatRecordDateDisplay,
  parseUserDateInput,
  startOfLocalDay,
} from '../src/utils/recordDate';

describe('parseRecordDate', () => {
  it('parses ISO date strings', () => {
    const d = parseRecordDate('2025-03-29T12:00:00.000Z');
    expect(d.getUTCFullYear()).toBe(2025);
  });

  it('parses dd.mm.yyyy', () => {
    const d = parseRecordDate('29.03.2025');
    expect(d.getDate()).toBe(29);
    expect(d.getMonth()).toBe(2);
    expect(d.getFullYear()).toBe(2025);
  });
});

describe('formatRecordDateDisplay', () => {
  it('formats valid dates', () => {
    const s = formatRecordDateDisplay(new Date(2025, 2, 29));
    expect(s).toMatch(/\d{2}\.\d{2}\.2025/);
  });
});

describe('parseUserDateInput', () => {
  it('accepts dd.mm.yyyy', () => {
    const d = parseUserDateInput('15.01.2024');
    expect(d).not.toBeNull();
    expect(d.getFullYear()).toBe(2024);
  });

  it('returns null for garbage', () => {
    expect(parseUserDateInput('not-a-date')).toBeNull();
  });
});

describe('startOfLocalDay', () => {
  it('strips time', () => {
    const d = startOfLocalDay(new Date(2025, 5, 10, 14, 30));
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
  });
});
