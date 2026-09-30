import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type TagColor = 'success' | 'danger' | 'warning' | 'info';

const DOT_CLASSES: Record<TagColor, string> = {
  success: 'bg-emerald-600',
  danger: 'bg-red-600',
  warning: 'bg-amber-600',
  info: 'bg-slate-400',
};

@Component({
  selector: 'app-tag',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
      <span class="w-1.5 h-1.5 rounded-full" [ngClass]="dotClass"></span>
      {{ label }}
    </span>
  `,
})
export class TagComponent {
  @Input() label = '';
  @Input() color: TagColor = 'info';

  get dotClass(): string {
    return DOT_CLASSES[this.color];
  }
}
