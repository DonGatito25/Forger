import { COLOR_OPTIONS } from '@/lib/colors';

export const APP_SETTINGS_STORAGE_KEY = 'forge_app_settings_v1';

const COLOR_NAME_MAP = {
  '#8B5CF6': 'Violet',
  '#6366F1': 'Indigo',
  '#3B82F6': 'Blue',
  '#06B6D4': 'Cyan',
  '#10B981': 'Emerald',
  '#84CC16': 'Lime',
  '#F59E0B': 'Amber',
  '#F97316': 'Orange',
  '#EF4444': 'Red',
  '#EC4899': 'Pink',
  '#808080': 'Gray',
  '#303030': 'Charcoal',
  '#4D2C15': 'Brown',
};

const EXCLUDED_ACCENT_HEXES = new Set(['#EBEBEB']);

const normalizeHex = (hex) => String(hex || '').trim().toUpperCase();

const hexToHsl = (hex) => {
  const normalized = normalizeHex(hex).replace('#', '');
  const safeHex =
    normalized.length === 3
      ? normalized
          .split('')
          .map((char) => char + char)
          .join('')
      : normalized;

  if (!/^[0-9A-F]{6}$/.test(safeHex)) {
    return '0 0% 50%';
  }

  const r = parseInt(safeHex.slice(0, 2), 16) / 255;
  const g = parseInt(safeHex.slice(2, 4), 16) / 255;
  const b = parseInt(safeHex.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  const lightness = (max + min) / 2;

  let hue = 0;
  if (delta !== 0) {
    if (max === r) hue = ((g - b) / delta) % 6;
    else if (max === g) hue = (b - r) / delta + 2;
    else hue = (r - g) / delta + 4;
  }

  const saturation =
    delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));

  const hueDegrees = Math.round(hue * 60 < 0 ? hue * 60 + 360 : hue * 60);
  const saturationPercent = Math.round(saturation * 100);
  const lightnessPercent = Math.round(lightness * 100);

  return `${hueDegrees} ${saturationPercent}% ${lightnessPercent}%`;
};

const getReadableForeground = (hex, darkValue = '0 0% 100%', lightValue = '222.2 47.4% 11.2%') => {
  const normalized = normalizeHex(hex).replace('#', '');
  if (!/^[0-9A-F]{6}$/.test(normalized)) return darkValue;

  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.63 ? lightValue : darkValue;
};

export const ACCENT_COLOR_OPTIONS = COLOR_OPTIONS
  .map(normalizeHex)
  .filter((hex) => hex && !EXCLUDED_ACCENT_HEXES.has(hex))
  .map((hex) => ({
    id: hex.toLowerCase().replace('#', ''),
    hex,
    name: COLOR_NAME_MAP[hex] || hex,
    hsl: hexToHsl(hex),
    foreground: getReadableForeground(hex),
  }));

const DEFAULT_PRIMARY_ACCENT = ACCENT_COLOR_OPTIONS[0]?.id || '8b5cf6';
const DEFAULT_SUB_ACCENT = ACCENT_COLOR_OPTIONS[1]?.id || DEFAULT_PRIMARY_ACCENT;

export const DEFAULT_APP_SETTINGS = {
  themeMode: 'dark',
  accentId: DEFAULT_PRIMARY_ACCENT,
  subAccentId: DEFAULT_SUB_ACCENT,
};

export const getAccentOption = (accentId) =>
  ACCENT_COLOR_OPTIONS.find((option) => option.id === accentId) || ACCENT_COLOR_OPTIONS[0];
