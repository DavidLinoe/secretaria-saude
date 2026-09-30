import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-skeleton',
  standalone: true,
  template: `<div class="animate-pulse bg-slate-200 rounded-xl w-full" [style.height]="height"></div>`,
})
export class SkeletonComponent {
  @Input() height = '16px';
}
