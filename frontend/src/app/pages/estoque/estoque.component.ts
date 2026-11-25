import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AjudaComponent } from '../../shared/ajuda.component';
import { FeedbackService } from '../../shared/feedback.service';
import { SkeletonComponent } from '../../shared/skeleton.component';
import { TagColor, TagComponent } from '../../shared/tag.component';
import { dataBr } from '../../shared/erro';
import { PolosFacade } from '../polos/polos.facade';
import { EstoqueFacade } from './estoque.facade';
import { EstoqueForm, EstoqueItem, FORM_VAZIO, FiltroEstoque, MovimentoTipo } from './estoque.model';

type Painel = 'detalhe' | 'form' | null;

@Component({
  selector: 'app-estoque',
  standalone: true,
  templateUrl: './estoque.component.html',
  imports: [CommonModule, FormsModule, DatePipe, AjudaComponent, SkeletonComponent, TagComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EstoqueComponent implements OnInit {
  readonly dataBr = dataBr;
  readonly filtros: { valor: FiltroEstoque; label: string }[] = [
    { valor: '', label: 'Todos' },
    { valor: 'vencendo', label: 'Vencendo' },
    { valor: 'vencido', label: 'Vencidos' },
    { valor: 'baixo', label: 'Estoque baixo' },
  ];

  busca = '';
  filtro: FiltroEstoque = '';
  readonly painel = signal<Painel>(null);
  readonly selecionado = signal<EstoqueItem | null>(null);
  readonly erroPainel = signal<string | null>(null);
  readonly salvando = signal(false);

  form: EstoqueForm = { ...FORM_VAZIO };
  editandoId: string | null = null;

  movTipo: MovimentoTipo = 'saida';
  movQtd: number | null = null;
  movMotivo = '';
  movDestino = '';

  private timer?: ReturnType<typeof setTimeout>;

  constructor(
    public facade: EstoqueFacade,
    public polos: PolosFacade,
    private fb: FeedbackService,
  ) {}

  ngOnInit(): void {
    void this.facade.carregar(this.busca, this.filtro);
    void this.polos.carregar();
  }

  get destinos() {
    return this.polos.polos().filter((p) => p.ativo);
  }

  onBusca(): void {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.facade.carregar(this.busca, this.filtro), 250);
  }

  setFiltro(f: FiltroEstoque): void {
    this.filtro = f;
    void this.facade.carregar(this.busca, f);
  }

  corValidade(i: EstoqueItem): TagColor {
    return i.statusValidade === 'vencido' ? 'danger' : i.statusValidade === 'vencendo' ? 'warning' : 'success';
  }

  textoValidade(i: EstoqueItem): string {
    if (i.statusValidade === 'vencido') return `Vencido (${dataBr(i.validade)})`;
    if (i.statusValidade === 'vencendo') return `Vence em ${i.diasParaVencer} d (${dataBr(i.validade)})`;
    return `Val. ${dataBr(i.validade)}`;
  }

  abrirDetalhe(item: EstoqueItem): void {
    this.selecionado.set(item);
    this.erroPainel.set(null);
    this.movTipo = 'saida';
    this.movQtd = null;
    this.movMotivo = '';
    this.movDestino = '';
    this.painel.set('detalhe');
    void this.facade.carregarHistorico(item.id);
  }

  novo(): void {
    this.editandoId = null;
    this.form = { ...FORM_VAZIO };
    this.erroPainel.set(null);
    this.painel.set('form');
  }

  editar(item: EstoqueItem): void {
    this.editandoId = item.id;
    this.form = {
      nome: item.nome,
      lote: item.lote,
      validade: item.validade,
      quantidade: item.quantidade,
      unidade: item.unidade,
      codigo: item.codigo ?? '',
      ean: item.ean ?? '',
      localizacao: item.localizacao ?? '',
      estoqueMinimo: item.estoqueMinimo,
    };
    this.erroPainel.set(null);
    this.painel.set('form');
  }

  fechar(): void {
    this.painel.set(null);
    this.selecionado.set(null);
  }

  async salvar(): Promise<void> {
    this.salvando.set(true);
    const erro = await this.facade.salvar(this.editandoId, { ...this.form, quantidade: Number(this.form.quantidade), estoqueMinimo: Number(this.form.estoqueMinimo) });
    this.salvando.set(false);
    if (erro) return void this.erroPainel.set(erro);
    this.fb.aviso(this.editandoId ? 'Item atualizado.' : 'Item cadastrado no estoque.');
    this.fechar();
  }

  async movimentar(): Promise<void> {
    const item = this.selecionado();
    if (!item || this.movQtd === null || this.movQtd === undefined) return void this.erroPainel.set('Informe a quantidade.');
    if (this.movTipo === 'saida' && !this.movDestino) return void this.erroPainel.set('Escolha o polo de destino da saída.');
    this.salvando.set(true);
    const erro = await this.facade.movimentar(item.id, this.movTipo, Number(this.movQtd), this.movMotivo, this.movTipo === 'saida' ? this.movDestino : undefined);
    this.salvando.set(false);
    if (erro) return void this.erroPainel.set(erro);
    this.erroPainel.set(null);
    this.fb.aviso('Movimentação registrada.');
    const atualizado = this.facade.itens().find((i) => i.id === item.id) ?? null;
    this.selecionado.set(atualizado);
    this.movQtd = null;
    this.movMotivo = '';
    this.movDestino = '';
    void this.polos.carregar();
    void this.facade.carregarHistorico(item.id);
  }

  async excluir(): Promise<void> {
    const item = this.selecionado();
    if (!item) return;
    const ok = await this.fb.confirmar({
      titulo: 'Excluir item do estoque?',
      mensagem: `${item.nome} (lote ${item.lote}) e todo o seu histórico de movimentações serão apagados. Para dar baixa em unidades, use "Saída" em vez de excluir.`,
      confirmar: 'Excluir',
      perigo: true,
    });
    if (!ok) return;
    const erro = await this.facade.remover(item.id);
    if (erro) return void this.erroPainel.set(erro);
    this.fb.aviso('Item excluído.');
    this.fechar();
  }
}
