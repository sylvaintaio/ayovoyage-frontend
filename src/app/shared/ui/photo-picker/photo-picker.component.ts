import { ChangeDetectionStrategy, Component, input, model, signal } from '@angular/core';

import { IconComponent } from '../icon/icon.component';

/** Réduit une image à 1280 px et la compresse en JPEG (photos de 4 à 8 Mo → ~200 Ko). */
export async function compressImage(file: File, maxSide = 1280, quality = 0.8): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Ajout de photos (appareil photo sur mobile), compressées avant envoi. */
@Component({
  selector: 'bv-photo-picker',
  imports: [IconComponent],
  templateUrl: './photo-picker.component.html',
  styleUrl: './photo-picker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PhotoPickerComponent {
  readonly photos = model<string[]>([]);
  readonly max = input(3);
  readonly label = input('Ajouter une photo');
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected async add(event: Event): Promise<void> {
    const inputEl = event.target as HTMLInputElement;
    const files = Array.from(inputEl.files ?? []).slice(0, this.max() - this.photos().length);
    inputEl.value = '';
    this.error.set(null);
    this.busy.set(true);
    try {
      const added: string[] = [];
      for (const f of files) {
        if (!f.type.startsWith('image/')) {
          this.error.set('Seules les photos sont acceptées.');
          continue;
        }
        added.push(await compressImage(f));
      }
      this.photos.update((p) => [...p, ...added]);
    } catch {
      this.error.set('Impossible de lire cette photo.');
    } finally {
      this.busy.set(false);
    }
  }

  protected remove(i: number): void {
    this.photos.update((p) => p.filter((_, j) => j !== i));
  }
}
