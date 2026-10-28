import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Api } from '../../../api/api';
import {
  deleteDepartureSchedule,
  listDepartureSchedules,
  updateDepartureSchedule,
} from '../../../api/functions';
import { Schedule, ScheduleChange } from '../../../api/models';
import { DialogService } from '../../../core/dialog/dialog.service';
import { apiErrorMessage } from '../../../core/http/api-error';
import { ToastService } from '../../../core/notify/toast.service';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { StateComponent } from '../../../shared/ui/state/state.component';
import {
  DepartureFormComponent,
  DepartureFormResult,
  weekdaysLabel,
} from '../departure-form/departure-form.component';

/** Résumé d'un changement d'horaire pour l'utilisateur. */
export function changeSummary(c: ScheduleChange): string {
  const parts = [];
  if (c.created) parts.push(`${c.created} départ(s) créé(s)`);
  if (c.removed) parts.push(`${c.removed} retiré(s)`);
  if (c.kept.length)
    parts.push(`${c.kept.length} gardé(s) tel(s) quel(s) (déjà réservés ou modifiés à la main)`);
  return parts.length ? parts.join(', ') + '.' : 'Aucun départ à changer.';
}

/** Horaires réguliers : les départs se créent tout seuls ; on modifie, suspend ou supprime un horaire ici. */
@Component({
  selector: 'bv-schedules',
  imports: [StateComponent, RouterLink, DatePipe, MoneyPipe],
  templateUrl: './schedules.component.html',
  styleUrl: './schedules.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SchedulesComponent implements OnInit {
  private readonly api = inject(Api);
  private readonly dialog = inject(DialogService);
  private readonly toast = inject(ToastService);

  protected readonly schedules = signal<Schedule[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal<string | null>(null);
  protected readonly days = weekdaysLabel;

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.schedules.set(await this.api.invoke(listDepartureSchedules));
    } catch (err) {
      this.error.set(apiErrorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }

  protected async create(): Promise<void> {
    await this.afterDialog(
      await this.dialog.open<DepartureFormResult>(DepartureFormComponent, null),
    );
  }

  protected async edit(s: Schedule): Promise<void> {
    await this.afterDialog(
      await this.dialog.open<DepartureFormResult>(DepartureFormComponent, { schedule: s }),
    );
  }

  private async afterDialog(result: DepartureFormResult | undefined): Promise<void> {
    if (result && 'schedule' in result) {
      this.toast.success('Horaire enregistré : ' + changeSummary(result.schedule));
      await this.load();
    }
  }

  /** Suspendre (plus aucun départ créé, ceux sans réservation retirés) ou reprendre. */
  protected async setActive(s: Schedule, active: boolean): Promise<void> {
    if (
      !active &&
      !(await this.dialog.confirm({
        title: 'Suspendre cet horaire ?',
        message:
          'Les départs à venir sans réservation sont retirés et plus aucun départ n’est créé. ' +
          'Les départs déjà réservés restent. Vous pourrez reprendre l’horaire plus tard.',
        confirmLabel: 'Suspendre',
      }))
    ) {
      return;
    }
    this.busy.set(s.id);
    try {
      const change = await this.api.invoke(updateDepartureSchedule, {
        id: s.id,
        body: {
          bus_id: s.bus_id,
          time: s.time,
          weekdays: s.weekdays,
          base_price: s.base_price || undefined,
          driver_id: s.driver_id,
          agent_id: s.agent_id,
          crew: s.crew,
          notes: s.notes,
          starts_on: s.starts_on,
          ends_on: s.ends_on,
          active,
        },
      });
      this.toast.success(
        (active ? 'Horaire repris : ' : 'Horaire suspendu : ') + changeSummary(change),
      );
      await this.load();
    } catch (err) {
      this.toast.error(apiErrorMessage(err));
    } finally {
      this.busy.set(null);
    }
  }

  protected async remove(s: Schedule): Promise<void> {
    const ok = await this.dialog.confirm({
      title: 'Supprimer cet horaire ?',
      message:
        `${s.route_name}, ${this.days(s.weekdays).toLowerCase()} à ${s.time}. Les départs à venir sans réservation sont retirés ; ` +
        'ceux déjà réservés restent, comme des départs simples.',
      confirmLabel: 'Supprimer',
      danger: true,
    });
    if (!ok) {
      return;
    }
    this.busy.set(s.id);
    try {
      const change = await this.api.invoke(deleteDepartureSchedule, { id: s.id });
      this.toast.success('Horaire supprimé : ' + changeSummary(change));
      await this.load();
    } catch (err) {
      this.toast.error(apiErrorMessage(err));
    } finally {
      this.busy.set(null);
    }
  }
}
