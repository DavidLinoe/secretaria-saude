import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AjudaComponent } from '../../shared/ajuda.component';
import { FeedbackService } from '../../shared/feedback.service';
import { SkeletonComponent } from '../../shared/skeleton.component';
import { TagColor, TagComponent } from '../../shared/tag.component';
import { mensagemErro } from '../../shared/erro';
import { ConferenciaApiService } from './conferencia.api';
import { Conferencia, MockSet } from './conferencia.model';

@Component({
  selector: 'app-conferencia',
  standalone: true,
  templateUrl: './conferencia.component.html',
  imports: [CommonModule, RouterModule, DatePipe, AjudaComponent, SkeletonComponent, TagComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConferenciaComponent implements OnInit {
  readonly conferencias = signal<Conferencia[]>([]);
  readonly mocks = signal<MockSet[]>([]);
  readonly carregando = signal(false);
  readonly enviando = signal<string | null>(null);
  readonly erro = signal<string | null>(null);
  readonly aba = signal<'nova' | 'exemplos' | 'historico'>('nova');
  readonly nota = signal<File | null>(null);
  readonly documento = signal<File | null>(null);

  constructor(
    private api: ConferenciaApiService,
    private router: Router,
    private fb: FeedbackService,
  ) {}

  async ngOnInit(): Promise<void> {
    this.carregando.set(true);
    try {
      const [confs, mocks] = await Promise.all([this.api.listar(), this.api.mocks().catch(() => [])]);
      this.conferencias.set(confs);
      this.mocks.set(mocks);
    } catch (err) {
      this.erro.set(mensagemErro(err, 'Não foi possível carregar as conferências.'));
    } finally {
      this.carregando.set(false);
    }
  }

  escolher(event: Event, alvo: 'nota' | 'documento'): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = '';
    (alvo === 'nota' ? this.nota : this.documento).set(file);
  }

  async enviar(): Promise<void> {
    const nota = this.nota();
    if (!nota) return;
    await this.executar('upload', () => this.api.criar(nota, this.documento() ?? undefined));
  }

  async usarMock(set: MockSet): Promise<void> {
    await this.executar(set.id, () => this.api.criarComMock(set.id));
  }

  async remover(c: Conferencia, event: Event): Promise<void> {
    event.stopPropagation();
    const ok = await this.fb.confirmar({
      titulo: 'Excluir conferência?',
      mensagem: `A conferência da NF ${c.nota.numero ?? ''} será apagada do histórico. Itens já lançados no estoque NÃO são desfeitos.`,
      confirmar: 'Excluir',
      perigo: true,
    });
    if (!ok) return;
    try {
      await this.api.remover(c.id);
      this.fb.aviso('Conferência excluída.');
      this.conferencias.update((l) => l.filter((x) => x.id !== c.id));
    } catch (err) {
      this.erro.set(mensagemErro(err));
    }
  }

  abrir(c: Conferencia): void {
    void this.router.navigate(['/conferencia', c.id]);
  }

  cor(c: Conferencia): TagColor {
    return c.status === 'confirmada' ? 'success' : c.status === 'rejeitada' ? 'danger' : c.resumo.divergentes ? 'warning' : 'info';
  }

  rotulo(c: Conferencia): string {
    if (c.status === 'confirmada') return 'Confirmada';
    if (c.status === 'rejeitada') return 'Rejeitada';
    return c.resumo.divergentes ? `${c.resumo.divergentes} divergência(s)` : 'Pendente';
  }

  private async executar(chave: string, chamada: () => Promise<Conferencia>): Promise<void> {
    this.enviando.set(chave);
    this.erro.set(null);
    try {
      const c = await chamada();
      this.nota.set(null);
      this.documento.set(null);
      await this.router.navigate(['/conferencia', c.id]);
    } catch (err) {
      this.erro.set(mensagemErro(err, 'Não foi possível processar os arquivos.'));
    } finally {
      this.enviando.set(null);
    }
  }
}
