import { ComponentFixture } from '@angular/core/testing';

/**
 * Laisse se terminer les promesses (appels API simulés) et le rendu,
 * en mode sans zone.js.
 */
export async function settle(fixture: ComponentFixture<unknown>, rounds = 3): Promise<void> {
  for (let i = 0; i < rounds; i++) {
    await new Promise((resolve) => setTimeout(resolve));
    await fixture.whenStable();
  }
}
