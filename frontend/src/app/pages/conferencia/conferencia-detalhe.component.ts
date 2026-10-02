import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { VisualizadorComponent } from '../../shared/visualizador.component';
import { AjudaComponent } from '../../shared/ajuda.component';
import { FeedbackService } from '../../shared/feedback.service';
import { SkeletonComponent } from '../../shared/skeleton.component';
import { TagColor, TagComponent } from '../../shared/tag.component';
import { dataBr, mensagemErro } from '../../shared/erro';
import { ConferenciaApiService } from './conferencia.api';
import { Aceite, Conferencia, Linha, LinhaStatus } from './conferencia.model';

const ROTULOS: Record<LinhaStatus, string> = {
  ok: 'Confere',
  quantidade: 'Quantidade diverge',
  lote: 'Lote diverge',
  validade: 'Validade diverge',
  so_nota: 'Só na nota',
  so_documento: 'Só no documento',
  sem_documento: 'Sem documento',
};

@Component({
  selector: 'app-conferencia-detalhe',
  standalone: true,
  templateUrl: './conferencia-detalhe.component.html',
  imports: [CommonModule, FormsModule, RouterModule, AjudaComponent, SkeletonComponent, VisualizadorComponent, TagComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConferenciaDetalheComponent implements OnInit {
  readonly dataBr = dataBr;
  readonly conferencia = signal<Conferencia | null>(null);
  readonly erro = signal<string | null>(null);
  readonly processando = signal(false);
  readonly verArquivo = signal<{ url: string; nome: string } | null>(null);
  /** linhas divergentes aceitas pelo usuário → quantidade que de fato chegou */
  readonly aceitas = signal<Record<string, number>>({});

  constructor(
    private api: ConferenciaApiService,
    private route: ActivatedRoute,
    private router: Router,
    private fb: FeedbackService,
  ) {}

  async ngOnInit(): Promise<void> {
    try {
      this.conferencia.set(await this.api.buscar(this.route.snapshot.paramMap.get('id')!));
    } catch (err) {
      this.erro.set(mensagemErro(err, 'Conferência não encontrada.'));
    }
  }

  rotulo(l: Linha): string {
    return l.bloqueada ? 'Vencido — bloqueado' : ROTULOS[l.status];
  }

  cor(l: Linha): TagColor {
    if (l.bloqueada) return 'danger';
    if (l.status === 'ok' || l.status === 'sem_documento') return 'success';
    return 'warning';
  }

  automatica(l: Linha): boolean {
    return l.status === 'ok' || l.status === 'sem_documento';
  }

  item(l: Linha) {
    return l.documento ?? l.nota!;
  }

  titulo(l: Linha): string {
    return (l.nota ?? l.documento!).nome;
  }

  quantidadePadrao(l: Linha): number {
    return this.item(l).quantidade;
  }

  alternar(l: Linha): void {
    this.aceitas.update((a) => {
      const novo = { ...a };
      if (l.chave in novo) delete novo[l.chave];
      else novo[l.chave] = this.quantidadePadrao(l);
      return novo;
    });
  }

  definirQtd(l: Linha, valor: number): void {
    this.aceitas.update((a) => ({ ...a, [l.chave]: Number(valor) }));
  }

  /** Quantas linhas entrarão no estoque com as escolhas atuais. */
  totalEntradas(c: Conferencia): number {
    const aceitas = this.aceitas();
    return c.linhas.filter((l) => !l.bloqueada && (this.automatica(l) || l.chave in aceitas)).length;
  }

  async confirmar(): Promise<void> {
    const c = this.conferencia();
    if (!c) return;
    const aceitar: Aceite[] = Object.entries(this.aceitas()).map(([chave, quantidade]) => ({ chave, quantidade }));
    const n = this.totalEntradas(c);
    const ok = await this.fb.confirmar({
      titulo: 'Lançar entrada no estoque?',
      mensagem: `${n} item(ns) serão adicionados ao estoque. Esta ação não pode ser desfeita por aqui — ajustes depois só pela aba Estoque.`,
      confirmar: 'Lançar entrada',
    });
    if (!ok) return;
    if (await this.rodar(() => this.api.confirmar(c.id, aceitar))) this.fb.aviso(`Entrada lançada: ${n} item(ns) no estoque.`);
  }

  async rejeitar(): Promise<void> {
    const c = this.conferencia();
    if (!c) return;
    const ok = await this.fb.confirmar({
      titulo: 'Rejeitar recebimento?',
      mensagem: 'Nada será lançado no estoque. Use quando a carga não bate e será devolvida ou reenviada.',
      confirmar: 'Rejeitar',
      perigo: true,
    });
    if (!ok) return;
    if (await this.rodar(() => this.api.rejeitar(c.id))) this.fb.aviso('Recebimento rejeitado.');
  }

  irEstoque(): void {
    void this.router.navigate(['/estoque']);
  }

  private async rodar(chamada: () => Promise<Conferencia>): Promise<boolean> {
    this.processando.set(true);
    this.erro.set(null);
    try {
      this.conferencia.set(await chamada());
      return true;
    } catch (err) {
      this.erro.set(mensagemErro(err));
      return false;
    } finally {
      this.processando.set(false);
    }
  }
}
