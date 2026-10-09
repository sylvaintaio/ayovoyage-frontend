import { ChangeDetectionStrategy, Component, ElementRef, afterNextRender, model, signal, viewChild } from '@angular/core';

/** Signature au doigt ou à la souris ; valeur : image PNG (data URL), vide tant que rien n'est tracé. */
@Component({
  selector: 'bv-signature-pad',
  templateUrl: './signature-pad.component.html',
  styleUrl: './signature-pad.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignaturePadComponent {
  readonly value = model('');
  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  protected readonly empty = signal(true);
  private drawing = false;
  private ctx: CanvasRenderingContext2D | null = null;

  constructor() {
    afterNextRender(() => this.setup());
  }

  private setup(): void {
    const c = this.canvas().nativeElement;
    const ratio = window.devicePixelRatio || 1;
    c.width = c.offsetWidth * ratio;
    c.height = c.offsetHeight * ratio;
    this.ctx = c.getContext('2d');
    if (this.ctx) {
      this.ctx.scale(ratio, ratio);
      this.ctx.lineWidth = 2.2;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      this.ctx.strokeStyle = '#121614';
    }
  }

  private point(e: PointerEvent): [number, number] {
    const r = this.canvas().nativeElement.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  }

  protected start(e: PointerEvent): void {
    if (!this.ctx) {
      return;
    }
    e.preventDefault();
    this.canvas().nativeElement.setPointerCapture(e.pointerId);
    this.drawing = true;
    const [x, y] = this.point(e);
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
  }

  protected move(e: PointerEvent): void {
    if (!this.drawing || !this.ctx) {
      return;
    }
    const [x, y] = this.point(e);
    this.ctx.lineTo(x, y);
    this.ctx.stroke();
    this.empty.set(false);
  }

  protected end(): void {
    if (!this.drawing) {
      return;
    }
    this.drawing = false;
    if (!this.empty()) {
      this.value.set(this.canvas().nativeElement.toDataURL('image/png'));
    }
  }

  protected clear(): void {
    const c = this.canvas().nativeElement;
    this.ctx?.clearRect(0, 0, c.width, c.height);
    this.empty.set(true);
    this.value.set('');
  }
}
