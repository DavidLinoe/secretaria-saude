import { ChangeDetectionStrategy, Component, EventEmitter, Inject, Input, Output } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { API_BASE_URL } from './api-base-url.token';

/** Overlay em tela cheia pra ver PDF (iframe) ou imagem. `url` é relativa à API. */
@Component({
  selector: 'app-visualizador',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed inset-0 z-[70] bg-slate-900 flex flex-col">
      <div class="flex items-center gap-3 px-4 py-3 text-white pt-10">
        <button (click)="fechar.emit()" aria-label="Fechar"><i class="pi pi-arrow-left"></i></button>
        <p class="flex-1 min-w-0 truncate text-sm">{{ nome }}</p>
        <a [href]="href" target="_blank" rel="noopener" aria-label="Abrir em nova aba"><i class="pi pi-external-link"></i></a>
        <a [href]="href" [attr.download]="nome" aria-label="Baixar"><i class="pi pi-download"></i></a>
      </div>
      <div class="flex-1 bg-slate-100 overflow-auto">
        @if (ehImagem) {
          <img [src]="href" [alt]="nome" class="w-full h-auto" />
        } @else {
          <iframe [src]="seguro" class="w-full h-full border-0 bg-white" [title]="nome"></iframe>
        }
      </div>
    </div>
  `,
})
export class VisualizadorComponent {
  @Input({ required: true }) set url(v: string) {
    this.href = this.base + v;
    this.seguro = this.sanitizer.bypassSecurityTrustResourceUrl(this.href);
  }
  @Input() nome = '';
  @Input() mimetype = 'application/pdf';
  @Output() fechar = new EventEmitter<void>();

  href = '';
  seguro!: SafeResourceUrl;

  constructor(
    private sanitizer: DomSanitizer,
    @Inject(API_BASE_URL) private base: string,
  ) {}

  get ehImagem(): boolean {
    return this.mimetype.startsWith('image/');
  }
}
