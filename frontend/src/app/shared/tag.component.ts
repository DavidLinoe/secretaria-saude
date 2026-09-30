import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type TagColor = 'success' | 'danger' | 'warning' | 'info';

const COLOR_CLASSES: Record<TagColor, string> = {
  success: 'bg-green-100 text-green-700',
  danger: 'bg-red-100 text-red-700',
  warning: 'bg-amber-100 text-amber-700',
  info: 'bg-blue-100 text-blue-700',
};

@Component({
  selector: 'app-tag',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="inline-block px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide" [ngClass]="colorClass">
      {{ label }}
    </span>
  `,
})
export class TagComponent {
  @Input() label = '';
  @Input() color: TagColor = 'info';

  get colorClass(): string {
    return COLOR_CLASSES[this.color];
  }
}
