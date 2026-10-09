import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import {
  ArrowRight,
  Armchair,
  Briefcase,
  Camera,
  Bus,
  ChevronDown,
  CircleCheck,
  Clock,
  CreditCard,
  Heart,
  Luggage,
  Mail,
  Map,
  MapPin,
  MessageCircle,
  Package,
  Phone,
  Plug,
  Printer,
  ScanLine,
  Search,
  ShieldCheck,
  Smartphone,
  Snowflake,
  Star,
  Ticket,
  Users,
  TriangleAlert,
  Wifi,
} from 'lucide';

import { IconName } from '../../../content/site-content';

type Node = [string, Record<string, string | number>];

/** Icônes Lucide (licence ISC). Seules celles listées ici sont embarquées. */
const ICONS: Record<IconName | 'arrow' | 'chevron' | 'pin' | 'mail' | 'alert' | 'camera' | 'printer' | 'scan', Node[]> = {
  app: Smartphone as Node[],
  seat: Armchair as Node[],
  phone: Phone as Node[],
  ticket: Ticket as Node[],
  shield: ShieldCheck as Node[],
  clock: Clock as Node[],
  parcel: Package as Node[],
  star: Star as Node[],
  users: Users as Node[],
  briefcase: Briefcase as Node[],
  map: Map as Node[],
  wifi: Wifi as Node[],
  snow: Snowflake as Node[],
  plug: Plug as Node[],
  bag: Luggage as Node[],
  chat: MessageCircle as Node[],
  search: Search as Node[],
  card: CreditCard as Node[],
  bus: Bus as Node[],
  heart: Heart as Node[],
  check: CircleCheck as Node[],
  arrow: ArrowRight as Node[],
  chevron: ChevronDown as Node[],
  pin: MapPin as Node[],
  mail: Mail as Node[],
  alert: TriangleAlert as Node[],
  camera: Camera as Node[],
  printer: Printer as Node[],
  scan: ScanLine as Node[],
};

export type AnyIcon = keyof typeof ICONS;

@Component({
  selector: 'bv-icon',
  templateUrl: './icon.component.html',
  styleUrl: './icon.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
})
export class IconComponent {
  readonly name = input.required<AnyIcon>();
  readonly size = input(24);
  protected readonly nodes = computed(() => ICONS[this.name()] ?? []);
}
