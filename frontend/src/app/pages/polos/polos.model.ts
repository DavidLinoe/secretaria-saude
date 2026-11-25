export interface Polo {
  id: string;
  nome: string;
  tipo: string;
  endereco?: string;
  ativo: boolean;
  totalUnidades: number;
  totalLotes: number;
}

export interface PoloEstoque {
  id: string;
  nome: string;
  lote: string;
  validade: string;
  unidade: string;
  quantidade: number;
}

export interface Distribuicao {
  id: string;
  nome: string;
  lote: string;
  quantidade: number;
  motivo?: string;
  em: string;
}

export interface PoloForm {
  nome: string;
  tipo: string;
  endereco: string;
}
