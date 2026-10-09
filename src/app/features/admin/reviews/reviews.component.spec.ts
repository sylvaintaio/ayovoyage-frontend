import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { settle } from '../../../../testing/settle';
import { provideApiConfiguration } from '../../../api/api-configuration';
import { AdminReviewsComponent } from './reviews.component';

const review = (id: string, rating: number, consent: boolean) => ({
  id, reference: 'BV' + id, booking_id: 'b' + id, route_name: 'Cotonou → Parakou', departure_at: '2026-10-09T07:00:00Z',
  rating, comment: 'Commentaire ' + id, name: 'Awa', city: 'Cotonou', publish_consent: consent, status: 'pending',
  created_at: '2026-10-09T12:00:00Z',
});

describe('AdminReviewsComponent', () => {
  it('ne propose « Publier » qu’avec l’accord du voyageur et exige un motif pour masquer', async () => {
    await TestBed.configureTestingModule({
      imports: [AdminReviewsComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideApiConfiguration('/api')],
    }).compileComponents();
    const fixture = TestBed.createComponent(AdminReviewsComponent);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne((r) => r.url === '/api/v1/admin/reviews').flush({
      stats: { total: 2, average: 3.5, positive: 1, negative: 1, to_moderate: 2, replied: 0, punctuality: 3, comfort: 4, staff: 0, cleanliness: 0 },
      reviews: [review('A', 5, true), review('B', 2, false)],
    });
    await settle(fixture);
    const cards = fixture.nativeElement.querySelectorAll('.review') as NodeListOf<HTMLElement>;
    expect(cards[0].textContent).toContain('Publier');
    expect(cards[1].textContent).not.toContain('Publier');
    expect(cards[1].classList).toContain('review--bad');

    (Array.from(cards[1].querySelectorAll('button')).find((b) => b.textContent!.includes('Masquer')) as HTMLButtonElement).click();
    await settle(fixture);
    const save = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('.review')[1].querySelectorAll('button'))
      .find((b) => b.textContent!.includes('Enregistrer')) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
  });
});
