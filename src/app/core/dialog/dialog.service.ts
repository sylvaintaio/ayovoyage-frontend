import { Dialog } from '@angular/cdk/dialog';
import { ComponentType } from '@angular/cdk/portal';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ConfirmDialogComponent, ConfirmOptions } from './confirm-dialog.component';

/** Ouverture des fenêtres modales (Angular CDK). */
@Injectable({ providedIn: 'root' })
export class DialogService {
  private readonly dialog = inject(Dialog);

  async confirm(options: ConfirmOptions): Promise<boolean> {
    const ref = this.dialog.open<boolean>(ConfirmDialogComponent, { data: options, autoFocus: 'dialog' });
    return (await firstValueFrom(ref.closed)) === true;
  }

  async open<R, D = unknown>(component: ComponentType<unknown>, data?: D): Promise<R | undefined> {
    const ref = this.dialog.open<R>(component, { data, autoFocus: 'first-tabbable' });
    return firstValueFrom(ref.closed);
  }
}
