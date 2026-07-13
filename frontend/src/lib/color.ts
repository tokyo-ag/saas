export function isLightHexColor(color: string): boolean {
  const hex = color.trim().replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return false;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 180;
}

export function readableTextColor(bgColor: string): string {
  return isLightHexColor(bgColor) ? '#111827' : '#ffffff';
}
