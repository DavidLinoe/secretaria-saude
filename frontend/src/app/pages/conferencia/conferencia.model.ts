export type LinhaStatus = 'ok' | 'quantidade' | 'lote' | 'validade' | 'so_nota' | 'so_documento' | 'sem_documento';

export interface ItemExtraido {
  codigo?: string;
  ean?: string;
  nome: string;
  lote: string;
  validade: string;
  quantidade: number;
  unidade: string;
}

export interface Linha {
  chave: string;
  status: LinhaStatus;
  nota?: ItemExtraido;
  documento?: ItemExtraido;
  divergencias: string[];
  alertas: string[];
  bloqueada: boolean;
}

export interface Conferencia {
  id: string;
  status: 'pendente' | 'confirmada' | 'rejeitada';
  criadaEm: string;
  confirmadaEm?: string;
  arquivos: { nota: string; documento?: string };
  urls?: { nota?: string; documento?: string };
  nota: { numero?: string; fornecedor?: string; emissao?: string; valorTotal?: number };
  linhas: Linha[];
  resumo: { total: number; ok: number; divergentes: number; bloqueadas: number };
  avisos: string[];
}

export interface MockSet {
  id: string;
  titulo: string;
  descricao: string;
  fornecedor: string;
}

export interface Aceite {
  chave: string;
  quantidade?: number;
}
