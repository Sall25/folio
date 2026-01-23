// helper function
function hexToRgba(hex: string, alpha = 0.55): string {
  const cleanHex = hex.replace('#', '');
  const fullHex = cleanHex.length === 3
    ? cleanHex.split('').map(c => c + c).join('')
    : cleanHex;

  const r = parseInt(fullHex.substring(0, 2), 16);
  const g = parseInt(fullHex.substring(2, 4), 16);
  const b = parseInt(fullHex.substring(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// full palette
export const COLORS = [
  {
    hex: '#6B7280',
    rgba: hexToRgba('#6B7280'),
    text: 'text-gray-500',
    ring: 'ring-[#D1D5DB]/60 dark:ring-[#374151]/60',
  },
  {
    hex: '#EF4444',
    rgba: hexToRgba('#EF4444'),
    text: 'text-red-500',
    ring: 'ring-[#FCA5A5]/60 dark:ring-[#B91C1C]/60',
  },
  {
    hex: '#F97316',
    rgba: hexToRgba('#F97316'),
    text: 'text-orange-500',
    ring: 'ring-[#FDBA74]/60 dark:ring-[#C2410C]/60',
  },
  {
    hex: '#FACC15',
    rgba: hexToRgba('#FACC15'),
    text: 'text-yellow-500',
    ring: 'ring-[#FDE68A]/60 dark:ring-[#A16207]/60',
  },
  {
    hex: '#22C55E',
    rgba: hexToRgba('#22C55E'),
    text: 'text-green-500',
    ring: 'ring-[#86EFAC]/60 dark:ring-[#166534]/60',
  },
  {
    hex: '#3B82F6',
    rgba: hexToRgba('#3B82F6'),
    text: 'text-blue-500',
    ring: 'ring-[#93C5FD]/60 dark:ring-[#1D4ED8]/60',
  },
  {
    hex: '#A855F7',
    rgba: hexToRgba('#A855F7'),
    text: 'text-purple-500',
    ring: 'ring-[#D8B4FE]/60 dark:ring-[#7E22CE]/60',
  },
  {
    hex: '#06B6D4',
    rgba: hexToRgba('#06B6D4'),
    text: 'text-cyan-500',
    ring: 'ring-[#22D3EE]/60 dark:ring-[#0E7490]/60',
  },
  {
    hex: '#EC4899',
    rgba: hexToRgba('#EC4899'),
    text: 'text-pink-500',
    ring: 'ring-[#F9A8D4]/60 dark:ring-[#BE185D]/60',
  },
];
