function normalizeRecordDate(input) {
  if (input == null || input === '') {
    return new Date();
  }
  if (input instanceof Date) {
    return Number.isNaN(input.getTime()) ? new Date() : input;
  }
  if (typeof input === 'string') {
    const trimmed = input.trim();
    const ts = Date.parse(trimmed);
    if (!Number.isNaN(ts)) {
      const d = new Date(ts);
      return Number.isNaN(d.getTime()) ? new Date() : d;
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
  return new Date();
}

module.exports = { normalizeRecordDate };
