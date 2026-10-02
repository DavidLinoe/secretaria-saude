import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { JsonCollection } from '../../common/json-store';
import { diasAte, normalizarLote, normalizarNome, validadeParaIso } from '../../common/texto';
import { EstoqueItem, EstoqueItemView, Movimento, MovimentoTipo } from './estoque.model';

export const DIAS_VALIDADE_CURTA = 180;

export interface EstoqueInput {
  nome?: string;
  codigo?: string;
  ean?: string;
  lote?: string;
  validade?: string;
  quantidade?: number;
  unidade?: string;
  localizacao?: string;
  estoqueMinimo?: number;
  fornecedor?: string;
}

@Injectable()
export class EstoqueService {
  private readonly itens = new JsonCollection<EstoqueItem>('estoque');
  private readonly movimentos = new JsonCollection<Movimento>('movimentos');

  listar(filtro: { q?: string; status?: string } = {}): EstoqueItemView[] {
    const q = filtro.q ? normalizarNome(filtro.q) : '';
    let lista = this.itens.all().map((i) => this.view(i));
    if (q) {
      lista = lista.filter(
        (i) =>
          normalizarNome(i.nome).includes(q) ||
          normalizarLote(i.lote).includes(normalizarLote(q)) ||
          i.ean?.includes(q) ||
          i.codigo?.toLowerCase().includes(q),
      );
    }
    if (filtro.status === 'vencido') lista = lista.filter((i) => i.statusValidade === 'vencido');
    if (filtro.status === 'vencendo') lista = lista.filter((i) => i.statusValidade === 'vencendo');
    if (filtro.status === 'baixo') lista = lista.filter((i) => i.abaixoDoMinimo);
    return lista.sort((a, b) => a.nome.localeCompare(b.nome) || a.validade.localeCompare(b.validade));
  }

  resumo() {
    const lista = this.itens.all().map((i) => this.view(i));
    return {
      totalItens: lista.length,
      totalUnidades: lista.reduce((s, i) => s + i.quantidade, 0),
      vencidos: lista.filter((i) => i.statusValidade === 'vencido').length,
      vencendo: lista.filter((i) => i.statusValidade === 'vencendo').length,
      abaixoDoMinimo: lista.filter((i) => i.abaixoDoMinimo).length,
    };
  }

  buscar(id: string): EstoqueItemView {
    return this.view(this.obter(id));
  }

  criar(input: EstoqueInput, extra: { origem?: EstoqueItem['origem']; conferenciaId?: string } = {}): EstoqueItemView {
    const dados = this.validar(input, true);
    if (this.achar(dados.nome, dados.lote, dados.ean)) {
      throw new ConflictException('Já existe este medicamento neste lote no estoque. Use uma movimentação de entrada.');
    }
    const agora = new Date().toISOString();
    const item: EstoqueItem = {
      id: randomUUID(),
      ...dados,
      origem: extra.origem ?? 'manual',
      conferenciaId: extra.conferenciaId,
      criadoEm: agora,
      atualizadoEm: agora,
    };
    this.itens.insert(item);
    this.registrar(item, 'entrada', item.quantidade, item.quantidade, extra.origem === 'conferencia' ? 'Entrada por conferência' : 'Cadastro inicial', extra.conferenciaId);
    return this.view(item);
  }

  /** Usado pela conferência: soma no lote existente ou cria o item. */
  entradaPorConferencia(input: EstoqueInput & { nome: string; lote: string }, conferenciaId: string): EstoqueItemView {
    const existente = this.achar(input.nome, input.lote, input.ean);
    if (existente) {
      return this.movimentar(existente.id, 'entrada', input.quantidade ?? 0, 'Entrada por conferência', conferenciaId);
    }
    return this.criar(input, { origem: 'conferencia', conferenciaId });
  }

  atualizar(id: string, input: EstoqueInput): EstoqueItemView {
    const atual = this.obter(id);
    const dados = this.validar({ ...atual, ...input }, true);
    const outro = this.achar(dados.nome, dados.lote, dados.ean);
    if (outro && outro.id !== id) throw new ConflictException('Já existe outro item com este medicamento e lote.');
    const atualizado: EstoqueItem = { ...atual, ...dados, atualizadoEm: new Date().toISOString() };
    this.itens.replace(atualizado);
    if (dados.quantidade !== atual.quantidade) {
      this.registrar(atualizado, 'ajuste', dados.quantidade, dados.quantidade, 'Edição manual');
    }
    return this.view(atualizado);
  }

  remover(id: string): void {
    this.obter(id);
    this.itens.remove(id);
    this.movimentos.removeWhere((m) => m.itemId === id);
  }

  movimentar(id: string, tipo: MovimentoTipo, quantidade: number, motivo?: string, conferenciaId?: string): EstoqueItemView {
    if (!['entrada', 'saida', 'ajuste'].includes(tipo)) throw new BadRequestException('Tipo inválido (entrada, saida ou ajuste).');
    if (!Number.isInteger(quantidade) || quantidade < (tipo === 'ajuste' ? 0 : 1)) {
      throw new BadRequestException('Quantidade inválida.');
    }
    const item = this.obter(id);
    let saldo = item.quantidade;
    if (tipo === 'entrada') saldo += quantidade;
    if (tipo === 'saida') {
      if (quantidade > item.quantidade) throw new BadRequestException(`Saldo insuficiente (disponível: ${item.quantidade}).`);
      saldo -= quantidade;
    }
    if (tipo === 'ajuste') saldo = quantidade;
    const atualizado = { ...item, quantidade: saldo, atualizadoEm: new Date().toISOString() };
    this.itens.replace(atualizado);
    this.registrar(atualizado, tipo, quantidade, saldo, motivo, conferenciaId);
    return this.view(atualizado);
  }

  resetar(): void {
    this.itens.removeWhere(() => true);
    this.movimentos.removeWhere(() => true);
  }

  historico(id: string): Movimento[] {
    this.obter(id);
    return this.movimentos.all().filter((m) => m.itemId === id).sort((a, b) => b.em.localeCompare(a.em));
  }

  // --- internos ---

  private obter(id: string): EstoqueItem {
    const item = this.itens.find(id);
    if (!item) throw new NotFoundException('Item de estoque não encontrado');
    return item;
  }

  private achar(nome: string, lote: string, ean?: string): EstoqueItem | undefined {
    const lt = normalizarLote(lote);
    return this.itens
      .all()
      .find((i) => normalizarLote(i.lote) === lt && ((ean && i.ean === ean) || normalizarNome(i.nome) === normalizarNome(nome)));
  }

  private registrar(item: EstoqueItem, tipo: MovimentoTipo, quantidade: number, saldoApos: number, motivo?: string, conferenciaId?: string) {
    this.movimentos.insert({ id: randomUUID(), itemId: item.id, tipo, quantidade, saldoApos, motivo, conferenciaId, em: new Date().toISOString() });
  }

  private validar(i: EstoqueInput, completo: boolean) {
    const erros: string[] = [];
    const nome = String(i.nome ?? '').trim();
    const lote = String(i.lote ?? '').trim();
    if (!nome) erros.push('nome é obrigatório');
    if (!lote) erros.push('lote é obrigatório');
    let validade = String(i.validade ?? '').trim();
    if (/^\d{2}\/\d{4}$/.test(validade) || /^\d{2}\/\d{2}\/\d{4}$/.test(validade)) validade = validadeParaIso(validade) ?? validade;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(validade) || isNaN(Date.parse(validade))) erros.push('validade inválida (use AAAA-MM-DD)');
    const quantidade = Number(i.quantidade);
    if (!Number.isInteger(quantidade) || quantidade < 0) erros.push('quantidade deve ser inteiro >= 0');
    const estoqueMinimo = i.estoqueMinimo === undefined || i.estoqueMinimo === null ? 0 : Number(i.estoqueMinimo);
    if (!Number.isInteger(estoqueMinimo) || estoqueMinimo < 0) erros.push('estoqueMinimo deve ser inteiro >= 0');
    if (erros.length && completo) throw new BadRequestException(erros);
    return {
      nome,
      lote,
      validade,
      quantidade,
      estoqueMinimo,
      unidade: String(i.unidade ?? 'CX').trim().toUpperCase() || 'CX',
      codigo: i.codigo?.trim() || undefined,
      ean: i.ean?.trim() || undefined,
      localizacao: i.localizacao?.trim() || undefined,
      fornecedor: i.fornecedor?.trim() || undefined,
    };
  }

  private view(i: EstoqueItem): EstoqueItemView {
    const dias = diasAte(i.validade);
    return {
      ...i,
      diasParaVencer: dias,
      statusValidade: dias < 0 ? 'vencido' : dias <= DIAS_VALIDADE_CURTA ? 'vencendo' : 'ok',
      abaixoDoMinimo: i.estoqueMinimo > 0 && i.quantidade < i.estoqueMinimo,
    };
  }
}
