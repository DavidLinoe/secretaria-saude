import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { HttpService } from '../../shared/http.service';
import { mensagemErro } from '../../shared/erro';

/** Ao entrar, zera o estado de teste no backend (estoque, conferências, documentos salvos, notas). */
@Component({
  selector: 'app-reset',
  standalone: true,
  imports: [RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <header class="page-header">
        <h2>Resetar ambiente</h2>
        <p>Volta o app ao estado inicial para uma nova demonstração</p>
      </header>
      <div class="px-4 mt-4">
        <div class="alerta-aviso">
          <strong>Apaga:</strong> estoque e movimentações, conferências, documentos importados e histórico de notas.<br />
          <strong>Mantém:</strong> os arquivos de exemplo.
        </div>
      </div>
      <div class="secao">
        <p class="secao-titulo">Resultado</p>
        <div class="painel">
          @if (estado() === 'rodando') {
            <p class="texto"><i class="pi pi-spin pi-spinner mr-1"></i>Limpando…</p>
          } @else if (estado() === 'ok') {
            <p class="texto"><i class="pi pi-check-circle mr-1 text-emerald-600"></i>Pronto — o ambiente foi zerado.</p>
            <a routerLink="/conferencia" class="btn-primario w-full mt-4">Começar nova conferência</a>
            <a routerLink="/home" class="btn-secundario w-full mt-2">Ir para o início</a>
          } @else {
            <div class="alerta-erro">{{ erro() }}</div>
            <button (click)="resetar()" class="btn-primario w-full mt-4">Tentar novamente</button>
          }
        </div>
      </div>
    </div>
  `,
})
export class ResetComponent implements OnInit {
  readonly estado = signal<'rodando' | 'ok' | 'erro'>('rodando');
  readonly erro = signal('');

  constructor(private http: HttpService) {}

  ngOnInit(): void {
    void this.resetar();
  }

  async resetar(): Promise<void> {
    this.estado.set('rodando');
    try {
      await this.http.post('reset', {}, 20000);
      this.estado.set('ok');
    } catch (err) {
      this.erro.set(mensagemErro(err, 'Não foi possível resetar.'));
      this.estado.set('erro');
    }
  }
}
