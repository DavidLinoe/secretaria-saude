import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FeedbackService } from '../../shared/feedback.service';
import { SkeletonComponent } from '../../shared/skeleton.component';
import { dataBr } from '../../shared/erro';
import { PolosFacade } from './polos.facade';
import { Polo, PoloForm } from './polos.model';

type Painel = 'detalhe' | 'form' | null;

@Component({
  selector: 'app-polos',
  standalone: true,
  templateUrl: './polos.component.html',
  imports: [CommonModule, FormsModule, DatePipe, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PolosComponent implements OnInit {
  readonly dataBr = dataBr;
  readonly tipos = ['UBS', 'UPA', 'Hospital', 'Farmácia', 'Posto', 'Outro'];
  readonly painel = signal<Painel>(null);
  readonly selecionado = signal<Polo | null>(null);
  readonly erroPainel = signal<string | null>(null);
  readonly salvando = signal(false);

  form: PoloForm = { nome: '', tipo: 'UBS', endereco: '' };
  editandoId: string | null = null;

  constructor(
    public facade: PolosFacade,
    private fb: FeedbackService,
  ) {}

  ngOnInit(): void {
    void this.facade.carregar();
  }

  abrir(p: Polo): void {
    this.selecionado.set(p);
    this.erroPainel.set(null);
    this.painel.set('detalhe');
    void this.facade.carregarDetalhe(p.id);
  }

  novo(): void {
    this.editandoId = null;
    this.form = { nome: '', tipo: 'UBS', endereco: '' };
    this.erroPainel.set(null);
    this.painel.set('form');
  }

  editar(p: Polo): void {
    this.editandoId = p.id;
    this.form = { nome: p.nome, tipo: p.tipo, endereco: p.endereco ?? '' };
    this.erroPainel.set(null);
    this.painel.set('form');
  }

  fechar(): void {
    this.painel.set(null);
    this.selecionado.set(null);
  }

  async salvar(): Promise<void> {
    this.salvando.set(true);
    const erro = await this.facade.salvar(this.editandoId, this.form);
    this.salvando.set(false);
    if (erro) return void this.erroPainel.set(erro);
    this.fb.aviso(this.editandoId ? 'Polo atualizado.' : 'Polo cadastrado.');
    this.fechar();
  }

  async alternarAtivo(): Promise<void> {
    const p = this.selecionado();
    if (!p) return;
    const erro = await this.facade.alternarAtivo(p);
    if (erro) return void this.erroPainel.set(erro);
    this.fb.aviso(p.ativo ? 'Polo desativado.' : 'Polo reativado.');
    this.fechar();
  }

  async excluir(): Promise<void> {
    const p = this.selecionado();
    if (!p) return;
    const ok = await this.fb.confirmar({ titulo: 'Excluir polo?', mensagem: `${p.nome} será removido da lista de destinos.`, confirmar: 'Excluir', perigo: true });
    if (!ok) return;
    const erro = await this.facade.remover(p.id);
    if (erro) return void this.erroPainel.set(erro);
    this.fb.aviso('Polo excluído.');
    this.fechar();
  }
}
