import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { settle } from '../../../../testing/settle';
import { provideApiConfiguration } from '../../../api/api-configuration';
import { AuditComponent } from './audit.component';

describe('AuditComponent', () => {
  it('déplie le détail avant / après d’une action', async () => {
    await TestBed.configureTestingModule({
      imports: [AuditComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideApiConfiguration('/api')],
    }).compileComponents();
    const fixture = TestBed.createComponent(AuditComponent);
    fixture.detectChanges();
    TestBed.inject(HttpTestingController).expectOne((r) => r.url === '/api/v1/admin/audit-logs').flush([
      { id: 1, actor_type: 'staff', action: 'refund.approved', entity_type: 'refund', entity_id: 'r1', ip: '127.0.0.1',
        created_at: '2026-10-08T09:00:00Z', before: { status: 'requested' }, after: { status: 'approved' } },
    ]);
    await settle(fixture);
    fixture.nativeElement.querySelector('tbody button').click();
    await settle(fixture);
    expect(fixture.nativeElement.querySelector('pre').textContent).toContain('requested');
  });
});
