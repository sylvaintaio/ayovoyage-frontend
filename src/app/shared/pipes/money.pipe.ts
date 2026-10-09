import { Pipe, PipeTransform } from '@angular/core';

const formatter = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });

/** Montant en francs CFA : 7500 → « 7 500 F CFA ». */
export function formatMoney(amount: number | null | undefined, currency = 'XOF'): string {
  if (amount === null || amount === undefined) {
    return '—';
  }
  const label = currency === 'XOF' ? 'F CFA' : currency;
  return `${formatter.format(amount)} ${label}`;
}

@Pipe({ name: 'money' })
export class MoneyPipe implements PipeTransform {
  transform(amount: number | null | undefined, currency = 'XOF'): string {
    return formatMoney(amount, currency);
  }
}
