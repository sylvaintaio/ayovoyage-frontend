import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { settle } from '../../../../testing/settle';
import { provideApiConfiguration } from '../../../api/api-configuration';
import { LayoutEditorComponent } from './layout-editor.component';

describe('LayoutEditorComponent', () => {
  it('génère un autocar 2+2 de 48 places pour un nouveau plan', async () => {
    await TestBed.configureTestingModule({
      imports: [LayoutEditorComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideApiConfiguration('/api')],
    }).compileComponents();
    const fixture = TestBed.createComponent(LayoutEditorComponent);
    fixture.componentRef.setInput('id', 'nouveau');
    fixture.detectChanges();
    TestBed.inject(HttpTestingController).expectOne('/api/v1/admin/seat-categories').flush([
      { id: 'std', code: 'standard', name: 'Standard', color: '#64748b', description: '', perks: [], surcharge_amount: 0, sort_order: 1 },
    ]);
    await settle(fixture);
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('48 sièges');
    expect(el.querySelectorAll('.cell--seat').length).toBe(48);
  });
});
