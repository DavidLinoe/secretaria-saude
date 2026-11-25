export interface Polo {
  id: string;
  nome: string;
  tipo: string;
  endereco?: string;
  ativo: boolean;
}

/** Saldo de um lote dentro de um polo (cresce a cada saída do estoque central). */
export interface PoloEstoque {
  id: string;
  poloId: string;
  nome: string;
  codigo?: string;
  ean?: string;
  lote: string;
  validade: string;
  unidade: string;
  quantidade: number;
  atualizadoEm: string;
}

/** Registro de cada remessa enviada pela secretaria a um polo. */
export interface Distribuicao {
  id: string;
  poloId: string;
  itemId: string;
  nome: string;
  lote: string;
  quantidade: number;
  motivo?: string;
  em: string;
}

export interface PoloView extends Polo {
  totalUnidades: number;
  totalLotes: number;
}
