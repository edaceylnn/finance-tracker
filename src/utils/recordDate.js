export function parseRecordDate(value) {
  if (value == null || value === '') {
    return new Date(0);
  }
  if (value instanceof Date) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? new Date(0) : d;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    const ts = Date.parse(trimmed);
    if (!Number.isNaN(ts)) {
      const d = new Date(ts);
      return Number.isNaN(d.getTime()) ? new Date(0) : d;
    }
    const parts = trimmed.split('.');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      if (!Number.isNaN(day) && !Number.isNaN(month) && !Number.isNaN(year)) {
        return new Date(year, month, day);
      }
    }
  }
  return new Date(0);
}

export function startOfLocalDay(d) {
  const x = parseRecordDate(d);
  return new Date(x.getFullYear(), x.getMonth(), x.getDate());
}

export function formatRecordDateDisplay(value) {
  const x = parseRecordDate(value);
  if (x.getTime() === 0) {
    return '';
  }
  return x.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function parseUserDateInput(text) {
  if (text == null || String(text).trim() === '') {
    return null;
  }
  const trimmed = String(text).trim();
  const ts = Date.parse(trimmed);
  if (!Number.isNaN(ts)) {
    const d = new Date(ts);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const parts = trimmed.split('.');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    if (!Number.isNaN(day) && !Number.isNaN(month) && !Number.isNaN(year)) {
      const d = new Date(year, month, day);
      return Number.isNaN(d.getTime()) ? null : d;
    }
  }
  return null;
}

export function toIsoDateForApi(d) {
  const x = d instanceof Date ? d : parseRecordDate(d);
  if (Number.isNaN(x.getTime())) {
    return new Date().toISOString();
  }
  return x.toISOString();
}
