import { TestBed } from '@angular/core/testing';

import { BookingStepsComponent } from './booking-steps.component';

describe('BookingStepsComponent', () => {
  it('marque les étapes passées et l’étape en cours', async () => {
    await TestBed.configureTestingModule({ imports: [BookingStepsComponent] }).compileComponents();
    const fixture = TestBed.createComponent(BookingStepsComponent);
    fixture.componentRef.setInput('current', 2);
    await fixture.whenStable();
    const items = fixture.nativeElement.querySelectorAll('li') as NodeListOf<HTMLElement>;
    expect(items[0].classList).toContain('done');
    expect(items[1].getAttribute('aria-current')).toBe('step');
    expect(items[2].classList).not.toContain('done');
  });
});
