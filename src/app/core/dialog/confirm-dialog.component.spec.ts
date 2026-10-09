import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { TestBed } from '@angular/core/testing';

import { ConfirmDialogComponent } from './confirm-dialog.component';

describe('ConfirmDialogComponent', () => {
  it('renvoie true quand on confirme', async () => {
    const close = vi.fn();
    await TestBed.configureTestingModule({
      imports: [ConfirmDialogComponent],
      providers: [
        { provide: DIALOG_DATA, useValue: { title: 'Annuler ?', message: 'Sûr ?', confirmLabel: 'Oui' } },
        { provide: DialogRef, useValue: { close } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(ConfirmDialogComponent);
    await fixture.whenStable();
    const buttons = fixture.nativeElement.querySelectorAll('button');
    buttons[1].click();
    expect(close).toHaveBeenCalledWith(true);
  });
});
