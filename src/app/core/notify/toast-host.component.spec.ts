import { TestBed } from '@angular/core/testing';

import { ToastHostComponent } from './toast-host.component';
import { ToastService } from './toast.service';

describe('ToastHostComponent', () => {
  it('affiche puis retire une notification', async () => {
    await TestBed.configureTestingModule({ imports: [ToastHostComponent] }).compileComponents();
    const fixture = TestBed.createComponent(ToastHostComponent);
    const toast = TestBed.inject(ToastService);

    toast.success('Réservation confirmée');
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Réservation confirmée');

    toast.dismiss(toast.toasts()[0].id);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelectorAll('.toast').length).toBe(0);
  });
});
