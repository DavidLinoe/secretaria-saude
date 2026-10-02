export interface ItemExtraido {
  codigo?: string;
  ean?: string;
  nome: string;
  lote: string;
  /** AAAA-MM-DD */
  validade: string;
  quantidade: number;
  unidade: string;
  valorUnitario?: number;
}

export interface NotaExtraida {
  tipo: 'nota_fiscal';
  numero?: string;
  serie?: string;
  chave?: string;
  emissao?: string;
  fornecedor?: string;
  cnpj?: string;
  valorTotal?: number;
  itens: ItemExtraido[];
  avisos: string[];
}

export interface DocumentoExtraido {
  tipo: 'romaneio';
  referenciaNota?: string;
  fornecedor?: string;
  emissao?: string;
  itens: ItemExtraido[];
  avisos: string[];
}
