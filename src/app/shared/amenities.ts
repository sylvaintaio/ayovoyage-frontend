import { AnyIcon } from './ui/icon/icon.component';

/** Libellés et icônes des équipements saisis dans le back-office (texte libre). */
const KNOWN: Record<string, { label: string; icon: AnyIcon }> = {
  climatisation: { label: 'Climatisation', icon: 'snow' },
  clim: { label: 'Climatisation', icon: 'snow' },
  wifi: { label: 'Wi-Fi', icon: 'wifi' },
  'wi-fi': { label: 'Wi-Fi', icon: 'wifi' },
  usb: { label: 'Prises USB', icon: 'plug' },
  prises: { label: 'Prises USB', icon: 'plug' },
  toilettes: { label: 'Toilettes', icon: 'check' },
};

export function amenity(raw: string): { label: string; icon: AnyIcon } {
  const key = raw.trim().toLowerCase();
  return KNOWN[key] ?? { label: raw.charAt(0).toUpperCase() + raw.slice(1), icon: 'check' };
}
