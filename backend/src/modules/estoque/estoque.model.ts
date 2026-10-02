export interface EstoqueItem {
  id: string;
  nome: string;
  codigo?: string;
  ean?: string;
  lote: string;
  /** AAAA-MM-DD */
  validade: string;
  quantidade: number;
  unidade: string;
  localizacao?: string;
  estoqueMinimo: number;
  fornecedor?: string;
  origem: 'manual' | 'conferencia';
  conferenciaId?: string;
  criadoEm: string;
  atualizadoEm: string;
}

export type MovimentoTipo = 'entrada' | 'saida' | 'ajuste';

export interface Movimento {
  id: string;
  itemId: string;
  tipo: MovimentoTipo;
  /** entrada/saida: quantidade movimentada (>0); ajuste: novo saldo absoluto. */
  quantidade: number;
  saldoApos: number;
  motivo?: string;
  conferenciaId?: string;
  em: string;
}

export type StatusValidade = 'vencido' | 'vencendo' | 'ok';

export interface EstoqueItemView extends EstoqueItem {
  statusValidade: StatusValidade;
  diasParaVencer: number;
  abaixoDoMinimo: boolean;
}
