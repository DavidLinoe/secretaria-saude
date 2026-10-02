import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type TagColor = 'success' | 'danger' | 'warning' | 'info';

/** Selo de STATUS (pílula colorida) — só aparece pra estados, nunca pra texto comum. */
const CLASSES: Record<TagColor, string> = {
  success: 'bg-emerald-100 text-emerald-800',
  danger: 'bg-red-100 text-red-800',
  warning: 'bg-amber-100 text-amber-900',
  info: 'bg-slate-200 text-slate-700',
};

@Component({
  selector: 'app-tag',
  standalone: true,
  imports: [CommonModule],
  template: `<span class="inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap" [ngClass]="cls">{{ label }}</span>`,
})
export class TagComponent {
  @Input() label = '';
  @Input() color: TagColor = 'info';

  get cls(): string {
    return CLASSES[this.color];
  }
}
