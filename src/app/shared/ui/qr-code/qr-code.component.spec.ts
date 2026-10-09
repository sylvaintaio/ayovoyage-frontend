import { TestBed } from '@angular/core/testing';

import { QrCodeComponent } from './qr-code.component';

describe('QrCodeComponent', () => {
  it('se crée avec une valeur', async () => {
    await TestBed.configureTestingModule({ imports: [QrCodeComponent] }).compileComponents();
    const fixture = TestBed.createComponent(QrCodeComponent);
    fixture.componentRef.setInput('value', 'BV1.payload.signature');
    await fixture.whenStable();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
