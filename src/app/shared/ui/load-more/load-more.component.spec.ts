import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoadMoreComponent } from './load-more.component';

describe('LoadMoreComponent', () => {
  let fixture: ComponentFixture<LoadMoreComponent>;

  beforeEach(() => {
    fixture = TestBed.createComponent(LoadMoreComponent);
  });

  const button = () => (fixture.nativeElement as HTMLElement).querySelector('button');

  it('caché quand tout est affiché', () => {
    fixture.detectChanges();
    expect(button()).toBeNull();
  });

  it('demande la suite, puis attend pendant le chargement', () => {
    const more = vi.fn();
    fixture.componentInstance.more.subscribe(more);
    fixture.componentRef.setInput('hasMore', true);
    fixture.componentRef.setInput('label', 'Avis plus anciens');
    fixture.detectChanges();
    expect(button()?.textContent?.trim()).toBe('Avis plus anciens');
    button()?.click();
    expect(more).toHaveBeenCalledTimes(1);

    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();
    expect(button()?.disabled).toBe(true);
    expect(button()?.textContent?.trim()).toBe('Chargement…');
  });
});
