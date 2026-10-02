import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FeedbackService } from './feedback.service';

@Component({
  selector: 'app-feedback',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (fb.toast(); as t) {
      <div class="fixed top-4 left-4 right-4 z-[90] flex justify-center pointer-events-none">
        <div
          role="status"
          class="pointer-events-auto max-w-sm w-full text-sm px-4 py-3 shadow-md flex items-start gap-2"
          [class.bg-slate-900]="t.tipo === 'ok'"
          [class.text-white]="true"
          [class.bg-red-700]="t.tipo === 'erro'"
        >
          <i class="pi mt-0.5" [class.pi-check-circle]="t.tipo === 'ok'" [class.pi-exclamation-triangle]="t.tipo === 'erro'"></i>
          <span>{{ t.msg }}</span>
        </div>
      </div>
    }
    @if (fb.dialogo(); as d) {
      <div class="fixed inset-0 z-[95] bg-black/40 flex items-center justify-center p-6" (click)="fb.responder(false)">
        <div class="bg-white w-full max-w-sm p-5" role="dialog" aria-modal="true" (click)="$event.stopPropagation()">
          <p class="text-base font-semibold text-slate-900">{{ d.titulo }}</p>
          <p class="text-sm text-slate-600 mt-2">{{ d.mensagem }}</p>
          <div class="flex gap-2 mt-5">
            <button (click)="fb.responder(false)" class="flex-1 border border-slate-300 text-slate-700 text-sm py-2.5">Cancelar</button>
            <button (click)="fb.responder(true)" class="flex-1 text-white text-sm py-2.5" [class.bg-red-700]="d.perigo" [class.bg-slate-900]="!d.perigo">
              {{ d.confirmar ?? 'Confirmar' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class FeedbackComponent {
  constructor(public fb: FeedbackService) {}
}
