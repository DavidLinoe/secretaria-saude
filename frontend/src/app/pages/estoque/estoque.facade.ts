import { Injectable, signal } from '@angular/core';
import { mensagemErro } from '../../shared/erro';
import { EstoqueApiService } from './estoque.api';
import { EstoqueForm, EstoqueItem, EstoqueResumo, FiltroEstoque, Movimento, MovimentoTipo } from './estoque.model';

@Injectable({ providedIn: 'root' })
export class EstoqueFacade {
  readonly itens = signal<EstoqueItem[]>([]);
  readonly resumo = signal<EstoqueResumo | null>(null);
  readonly historico = signal<Movimento[]>([]);
  readonly carregando = signal(false);
  readonly erro = signal<string | null>(null);

  private q = '';
  private filtro: FiltroEstoque = '';

  constructor(private api: EstoqueApiService) {}

  async carregar(q = this.q, filtro: FiltroEstoque = this.filtro): Promise<void> {
    this.q = q;
    this.filtro = filtro;
    this.carregando.set(true);
    try {
      const [itens, resumo] = await Promise.all([this.api.listar(q, filtro), this.api.resumo()]);
      this.itens.set(itens);
      this.resumo.set(resumo);
      this.erro.set(null);
    } catch (err) {
      this.erro.set(mensagemErro(err, 'Não foi possível carregar o estoque.'));
    } finally {
      this.carregando.set(false);
    }
  }

  /** Retorna `null` em sucesso ou a mensagem de erro (pra exibir no formulário). */
  async salvar(id: string | null, form: EstoqueForm): Promise<string | null> {
    try {
      if (id) await this.api.atualizar(id, form);
      else await this.api.criar(form);
      await this.carregar();
      return null;
    } catch (err) {
      return mensagemErro(err);
    }
  }

  async remover(id: string): Promise<string | null> {
    try {
      await this.api.remover(id);
      await this.carregar();
      return null;
    } catch (err) {
      return mensagemErro(err);
    }
  }

  async movimentar(id: string, tipo: MovimentoTipo, quantidade: number, motivo: string): Promise<string | null> {
    try {
      await this.api.movimentar(id, tipo, quantidade, motivo);
      await this.carregar();
      return null;
    } catch (err) {
      return mensagemErro(err);
    }
  }

  async carregarHistorico(id: string): Promise<void> {
    try {
      this.historico.set(await this.api.historico(id));
    } catch {
      this.historico.set([]);
    }
  }
}
