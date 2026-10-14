import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { settle } from '../../../../testing/settle';
import { provideApiConfiguration } from '../../../api/api-configuration';
import { CounterComponent, defaultBoarding } from './counter.component';

describe('CounterComponent', () => {
  it('liste les départs ouverts à la vente', async () => {
    await TestBed.configureTestingModule({
      imports: [CounterComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideApiConfiguration('/api')],
    }).compileComponents();
    const fixture = TestBed.createComponent(CounterComponent);
    fixture.detectChanges();
    const dep = { id: 'd1', route_id: 'r', route_name: 'Cotonou → Parakou', bus_id: 'b', plate_number: 'AB 1234 RB',
      departure_at: '2026-10-12T06:00:00Z', arrival_eta: '', base_price: 7500, notes: '', seat_count: 48, sold_seats: 4, peak_seats: 3, boarded_seats: 0 };
    TestBed.inject(HttpTestingController).expectOne((r) => r.url === '/api/v1/admin/departures').flush([
      { ...dep, status: 'scheduled' },
      { ...dep, id: 'd2', status: 'departed' },
      { ...dep, id: 'd3', status: 'arrived' },
    ]);
    await settle(fixture);
    const items = fixture.nativeElement.querySelectorAll('.dep');
    // Car en route : encore en vente pour les arrêts suivants ; places libres = capacité − charge max.
    expect(items.length).toBe(2);
    expect(items[0].textContent).toContain('45 libre(s)');
    expect(items[1].textContent).toContain('en route');
  });
});

describe('CounterComponent — paiement', () => {
  const departure = {
    departure: { id: 'd1', route_name: 'Cotonou → Parakou', departure_at: '2026-10-20T06:00:00Z', stops: [], visits: [] },
    seat_map: { rows: 1, cols: 1, cells: [{ id: 's1', row: 0, col: 0, kind: 'seat', seat_label: '1A', price: 8000, state: 'available' }] },
    categories: [],
    boarding_seq: 0,
    alighting_seq: 1,
    unit_price: 8000,
  };

  async function setup() {
    await TestBed.configureTestingModule({
      imports: [CounterComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideApiConfiguration('/api')],
    }).compileComponents();
    const fixture = TestBed.createComponent(CounterComponent);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne((r) => r.url === '/api/v1/admin/departures').flush([]);
    http.expectOne('/api/v1/public/payment-providers').flush([{ code: 'mock', label: 'Simulé', methods: ['mobile_money'] }, { code: 'fedapay', label: 'FedaPay', methods: ['mobile_money'] }]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- accès aux méthodes protégées du composant dans le test
    const cmp = fixture.componentInstance as unknown as Record<string, any>;
    const choosing = cmp['choose']('d1');
    http.expectOne((r) => r.url === '/api/v1/admin/departures/d1').flush(departure);
    await choosing;
    cmp['selected'].set(['s1']);
    cmp['contact'].patchValue({ name: 'Koffi Mensah', phone: '0197000000' });
    /** Répond aux rechargements (départ, liste) jusqu'à la fin de l'action. */
    const drain = async (action: Promise<unknown>) => {
      let done = false;
      void action.finally(() => (done = true));
      for (let i = 0; i < 50 && !done; i++) {
        await new Promise((r) => setTimeout(r, 0));
        http.match(() => true).forEach((r) => r.flush(r.request.url.endsWith('/d1') ? departure : []));
      }
      await action;
    };
    return { fixture, http, cmp, drain };
  }

  it('réservation par appel : envoyée en « later », places gardées jusqu’à l’heure limite', async () => {
    const { fixture, http, cmp, drain } = await setup();
    cmp['payMode'].set('later');
    const selling = cmp['sell']();
    const req = http.expectOne((r) => r.method === 'POST' && r.url === '/api/v1/admin/bookings');
    expect(req.request.body).toMatchObject({ payment: 'later', contact_phone: '0197000000' });
    req.flush({ id: 'b1', reference: 'BV-1', total_amount: 8000, status: 'pending', pay_by: '2026-10-14T18:00:00Z', tickets: [] });
    await drain(selling);
    await settle(fixture);
    expect(fixture.nativeElement.textContent).toContain('Places gardées jusqu');
  });

  it('Mobile Money du voyageur : paiement lancé chez FedaPay et page ouverte pour l’agent', async () => {
    const { fixture, http, cmp } = await setup();
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    cmp['payMode'].set('online');
    const selling = cmp['sell']();
    http.expectOne((r) => r.method === 'POST' && r.url === '/api/v1/admin/bookings').flush({ id: 'b2', reference: 'BV-2', total_amount: 8000, status: 'pending', contact_phone: '+2290197000000', tickets: [] });
    await settle(fixture);
    const pay = http.expectOne('/api/v1/admin/bookings/b2/payments');
    expect(pay.request.body).toMatchObject({ provider: 'fedapay', payer_phone: '+2290197000000' });
    expect(pay.request.headers.get('Idempotency-Key')).toBeTruthy();
    pay.flush({ id: 'p1', status: 'pending', checkout_url: 'https://checkout.fedapay.com/x' });
    await selling;
    await settle(fixture);
    expect(open).toHaveBeenCalledWith('https://checkout.fedapay.com/x', 'paiement', expect.any(String));
    expect(fixture.nativeElement.textContent).toContain('En attente du paiement');
    cmp['cancelWaiting']();
  });

  it('espèces : téléphone facultatif ; Mobile Money reçu : référence exigée', async () => {
    const { http, cmp, drain } = await setup();
    cmp['contact'].patchValue({ phone: '' });
    cmp['payMode'].set('mobile_money');
    await cmp['sell']();
    http.expectNone((r) => r.method === 'POST');
    cmp['payMode'].set('cash');
    const selling = cmp['sell']();
    const req = http.expectOne((r) => r.method === 'POST' && r.url === '/api/v1/admin/bookings');
    expect(req.request.body.contact_phone).toBeUndefined();
    expect(req.request.body.payment).toBe('cash');
    req.flush({ id: 'b3', reference: 'BV-3', total_amount: 8000, status: 'confirmed', tickets: [] });
    await drain(selling);
  });
});

describe('defaultBoarding', () => {
  const stop = (seq: number, agency?: string, can_board = true) => ({ seq, agency_id: agency, can_board, can_alight: true,
    city_id: 'c', city_name: 'V', stop_point_id: 's', stop_name: 'A' + seq, scheduled_at: '', pause_minutes: 0 });
  const stops = [stop(0, 'cot'), stop(1, 'boh'), stop(2, undefined, false), stop(3, 'par')];

  it("prend l'arrêt de l'agence du vendeur", () => {
    expect(defaultBoarding(stops, 'boh', new Set())).toBe(1);
  });

  it('prend le premier arrêt ouvert sinon, en sautant ceux déjà quittés', () => {
    expect(defaultBoarding(stops, undefined, new Set())).toBe(0);
    expect(defaultBoarding(stops, 'cot', new Set([0]))).toBe(1);
  });

  it("ignore le terminus pour la montée", () => {
    expect(defaultBoarding(stops, 'par', new Set())).toBe(0);
  });
});
