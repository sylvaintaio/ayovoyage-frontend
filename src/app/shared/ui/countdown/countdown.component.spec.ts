import { TestBed } from '@angular/core/testing';

import { CountdownComponent } from './countdown.component';

describe('CountdownComponent', () => {
  it('affiche le temps restant en minutes:secondes', async () => {
    await TestBed.configureTestingModule({ imports: [CountdownComponent] }).compileComponents();
    const fixture = TestBed.createComponent(CountdownComponent);
    fixture.componentRef.setInput('until', new Date(Date.now() + 5 * 60_000 + 500).toISOString());
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent.trim()).toMatch(/^[45]:\d{2}$/);
  });
});
