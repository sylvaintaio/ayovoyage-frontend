import { formatMoney } from './money.pipe';

describe('formatMoney', () => {
  it('formate en francs CFA sans décimales', () => {
    expect(formatMoney(7500).replace(/\s/g, ' ')).toBe('7 500 F CFA');
    expect(formatMoney(0)).toBe('0 F CFA');
  });

  it('affiche un tiret pour une valeur absente', () => {
    expect(formatMoney(undefined)).toBe('—');
  });
});
