export interface BackendStatus {
  online: boolean;
  message: string;
}

export interface FluxoEtapa {
  icon: string;
  title: string;
  description: string;
  route: string;
  variant: 'primary' | 'info' | 'warning';
}

export const FLUXO_ETAPAS: FluxoEtapa[] = [
  {
    icon: 'pi-file-pdf',
    title: 'Escanear nota',
    description: 'Foto da nota fiscal — extrai e cadastra os itens no estoque',
    route: '/escanear',
    variant: 'primary',
  },
  {
    icon: 'pi-qrcode',
    title: 'Bipar conferência',
    description: 'Compara lote e quantidade recebidos com o que a nota declarou',
    route: '/bipar',
    variant: 'info',
  },
  {
    icon: 'pi-box',
    title: 'Ver estoque',
    description: 'Saldo atual de medicamentos e insumos, por lote e validade',
    route: '/estoque',
    variant: 'warning',
  },
];
