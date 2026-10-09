import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ContactComponent } from './contact.component';

describe('ContactComponent', () => {
  it('prépare un message WhatsApp avec la demande', async () => {
    await TestBed.configureTestingModule({ imports: [ContactComponent], providers: [provideRouter([])] }).compileComponents();
    const fixture = TestBed.createComponent(ContactComponent);
    await fixture.whenStable();
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    const el: HTMLElement = fixture.nativeElement;
    for (const [id, value] of [['#ct-name', 'Awa'], ['#ct-phone', '0197000001'], ['#ct-message', 'Mariage le 12 décembre, 40 personnes']]) {
      const input = el.querySelector(id) as HTMLInputElement;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    }
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    expect(open).toHaveBeenCalledWith(expect.stringMatching(/^https:\/\/wa\.me\/\d+\?text=Voyage%20de%20groupe/), '_blank', 'noopener');
  });
});
