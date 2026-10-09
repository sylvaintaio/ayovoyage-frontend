import { TestBed } from '@angular/core/testing';

import { OtpInputComponent } from './otp-input.component';

describe('OtpInputComponent', () => {
  async function setup() {
    await TestBed.configureTestingModule({ imports: [OtpInputComponent] }).compileComponents();
    const fixture = TestBed.createComponent(OtpInputComponent);
    await fixture.whenStable();
    const boxes = () => [...fixture.nativeElement.querySelectorAll('input')] as HTMLInputElement[];
    return { fixture, boxes };
  }

  function type(box: HTMLInputElement, value: string) {
    box.value = value;
    box.dispatchEvent(new Event('input'));
  }

  it('affiche 6 cases et passe à la suivante après chaque chiffre', async () => {
    const { fixture, boxes } = await setup();
    expect(boxes().length).toBe(6);
    type(boxes()[0], '4');
    await fixture.whenStable();
    expect(document.activeElement).toBe(boxes()[1]);
    expect(fixture.componentInstance.value()).toBe('4');
  });

  it('répartit un code collé et émet « completed »', async () => {
    const { fixture, boxes } = await setup();
    const done = vi.fn();
    fixture.componentInstance.completed.subscribe(done);
    const paste = new Event('paste') as ClipboardEvent;
    Object.defineProperty(paste, 'clipboardData', { value: { getData: () => 'Code : 123 456' } });
    boxes()[0].dispatchEvent(paste);
    await fixture.whenStable();
    expect(boxes().map((b) => b.value).join('')).toBe('123456');
    expect(done).toHaveBeenCalledWith('123456');
  });

  it('ignore les caractères non numériques', async () => {
    const { fixture, boxes } = await setup();
    type(boxes()[0], 'a');
    await fixture.whenStable();
    expect(fixture.componentInstance.value()).toBe('');
  });

  it('revient à la case précédente avec la touche Retour', async () => {
    const { fixture, boxes } = await setup();
    type(boxes()[0], '1');
    type(boxes()[1], '2');
    await fixture.whenStable();
    boxes()[2].focus();
    boxes()[2].dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace' }));
    await fixture.whenStable();
    expect(fixture.componentInstance.value()).toBe('1');
    expect(document.activeElement).toBe(boxes()[1]);
  });
});
