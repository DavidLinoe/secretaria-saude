import { ChangeDetectionStrategy, Component, Input, OnInit, signal } from '@angular/core';

/**
 * Caixa azul recolhível = INFORMAÇÃO/AJUDA (nunca dados do sistema). Oculta por padrão; lembra se o usuário
 * abriu (localStorage, opcional — se o armazenamento falhar, só abre por padrão).
 */
@Component({
  selector: 'app-ajuda',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="info">
      <button (click)="alternar()" class="w-full flex items-center gap-2.5 px-3.5 py-3 text-left" [attr.aria-expanded]="aberto()">
        <span class="w-6 h-6 shrink-0 rounded-full bg-sky-500 text-white flex items-center justify-center text-[11px] font-bold">i</span>
        <span class="flex-1 info-titulo">{{ titulo }}</span>
        <span class="text-[11px] text-sky-700">{{ aberto() ? 'Ocultar' : 'Ver' }}</span>
      </button>
      @if (aberto()) {
        <div class="px-3.5 pb-3.5 info-corpo"><ng-content></ng-content></div>
      }
    </section>
  `,
})
export class AjudaComponent implements OnInit {
  @Input() titulo = 'Como funciona';
  @Input({ required: true }) chave!: string;
  readonly aberto = signal(false);

  ngOnInit(): void {
    try {
      if (localStorage.getItem(`ajuda:${this.chave}`) === 'aberto') this.aberto.set(true);
    } catch {
      /* sem armazenamento: fica oculta */
    }
  }

  alternar(): void {
    this.aberto.update((v) => !v);
    try {
      localStorage.setItem(`ajuda:${this.chave}`, this.aberto() ? 'aberto' : 'fechado');
    } catch {
      /* ignora */
    }
  }
}
