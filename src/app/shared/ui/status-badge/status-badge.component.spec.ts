import { TestBed } from '@angular/core/testing';

import { StatusBadgeComponent } from './status-badge.component';

describe('StatusBadgeComponent', () => {
  it('affiche le libellé français et la couleur', async () => {
    await TestBed.configureTestingModule({ imports: [StatusBadgeComponent] }).compileComponents();
    const fixture = TestBed.createComponent(StatusBadgeComponent);
    fixture.componentRef.setInput('status', 'pending');
    fixture.componentRef.setInput('domain', 'booking');
    await fixture.whenStable();
    const badge: HTMLElement = fixture.nativeElement.querySelector('.badge');
    expect(badge.textContent).toContain('En attente de paiement');
    expect(badge.classList).toContain('badge--warning');
  });
});
