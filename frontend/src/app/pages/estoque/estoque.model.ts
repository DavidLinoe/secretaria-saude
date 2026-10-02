export type StatusValidade = 'vencido' | 'vencendo' | 'ok';
export type FiltroEstoque = '' | 'vencendo' | 'vencido' | 'baixo';
export type MovimentoTipo = 'entrada' | 'saida' | 'ajuste';

export interface EstoqueItem {
  id: string;
  nome: string;
  codigo?: string;
  ean?: string;
  lote: string;
  validade: string;
  quantidade: number;
  unidade: string;
  localizacao?: string;
  estoqueMinimo: number;
  fornecedor?: string;
  origem: 'manual' | 'conferencia';
  statusValidade: StatusValidade;
  diasParaVencer: number;
  abaixoDoMinimo: boolean;
  atualizadoEm: string;
}

export interface EstoqueResumo {
  totalItens: number;
  totalUnidades: number;
  vencidos: number;
  vencendo: number;
  abaixoDoMinimo: number;
}

export interface Movimento {
  id: string;
  tipo: MovimentoTipo;
  quantidade: number;
  saldoApos: number;
  motivo?: string;
  em: string;
}

export interface EstoqueForm {
  nome: string;
  lote: string;
  validade: string;
  quantidade: number;
  unidade: string;
  codigo: string;
  ean: string;
  localizacao: string;
  estoqueMinimo: number;
}

export const FORM_VAZIO: EstoqueForm = {
  nome: '',
  lote: '',
  validade: '',
  quantidade: 0,
  unidade: 'CX',
  codigo: '',
  ean: '',
  localizacao: '',
  estoqueMinimo: 0,
};
