import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ParcelComponent } from './parcel.component';

describe('ParcelComponent', () => {
  it('explique les étapes et renvoie vers les agences de dépôt', async () => {
    await TestBed.configureTestingModule({ imports: [ParcelComponent], providers: [provideRouter([])] }).compileComponents();
    const fixture = TestBed.createComponent(ParcelComponent);
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelectorAll('.step').length).toBe(4);
    expect(el.querySelector('a[href="/agences?service=parcel_drop"]')).toBeTruthy();
  });
});
