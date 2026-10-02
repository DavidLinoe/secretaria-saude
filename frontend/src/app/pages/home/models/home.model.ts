export interface BackendStatus {
  online: boolean;
  message: string;
}

export interface FluxoEtapa {
  icon: string;
  title: string;
  description: string;
  route: string;
}

export const FLUXO_ETAPAS: FluxoEtapa[] = [
  {
    icon: 'pi-check-square',
    title: 'Conferir recebimento',
    description: 'Envie a nota fiscal e o romaneio (PDF ou foto). O sistema compara item, lote, validade e quantidade e mostra o que não bate.',
    route: '/conferencia',
  },
  {
    icon: 'pi-box',
    title: 'Estoque',
    description: 'Confirmada a conferência, os itens entram aqui. Consulte saldo por lote, dê saída, ajuste ou cadastre manualmente.',
    route: '/estoque',
  },
  {
    icon: 'pi-camera',
    title: 'Escanear nota (serviço externo)',
    description: 'Opcional: envia fotos da nota ao serviço Python de OCR. Para o fluxo principal, use Conferir.',
    route: '/escanear',
  },
];
