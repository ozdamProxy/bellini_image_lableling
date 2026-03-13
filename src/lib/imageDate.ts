/**
 * Attempts to extract the capture date/time from an image filename.
 * Raspberry Pi / camera filenames commonly embed timestamps.
 * Falls back to a provided date string (e.g. created_at) if no match.
 *
 * Supported patterns:
 *   2024-01-15_14-30-22
 *   20240115_143022
 *   IMG_20240115_143022
 *   image_2024-01-15T14:30:22
 *   2024-01-15 14:30:22
 */
export function parseCaptureDate(filename: string, fallback?: string): Date | null {
  const name = filename.replace(/\.[^.]+$/, ''); // strip extension

  const patterns: RegExp[] = [
    // 2024-01-15_14-30-22 or 2024-01-15 14:30:22
    /(\d{4})-(\d{2})-(\d{2})[_T ](\d{2})[-:](\d{2})[-:](\d{2})/,
    // 20240115_143022
    /(\d{4})(\d{2})(\d{2})[_-](\d{2})(\d{2})(\d{2})/,
    // 2024-01-15 (date only)
    /(\d{4})-(\d{2})-(\d{2})/,
    // 20240115 (date only, at least 8 consecutive digits)
    /\b(\d{4})(\d{2})(\d{2})\b/,
  ];

  for (const pattern of patterns) {
    const m = name.match(pattern);
    if (!m) continue;

    const [, year, month, day, hour = '0', min = '0', sec = '0'] = m;
    const d = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(min),
      Number(sec)
    );
    if (!isNaN(d.getTime())) return d;
  }

  if (fallback) {
    const d = new Date(fallback);
    if (!isNaN(d.getTime())) return d;
  }

  return null;
}

export function formatCaptureDate(date: Date): string {
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function formatCaptureDateShort(date: Date): string {
  return date.toLocaleString(undefined, {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
