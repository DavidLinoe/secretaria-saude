import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { AjudaComponent } from '../../../shared/ajuda.component';
import { PhotoPickerComponent } from '../../../shared/photo-picker.component';
import { SkeletonComponent } from '../../../shared/skeleton.component';
import { TagComponent } from '../../../shared/tag.component';
import { validateImageFile } from '../../../shared/validate-image-file';
import { EscanearFacade } from '../facades/escanear.facade';
import { EscanearAdapter } from '../adapters/escanear.adapter';
import { NotaMetadados, NotaRegistro } from '../models/escanear.model';

interface Captura {
  file: File;
  preview: string;
}

@Component({
  selector: 'app-escanear',
  standalone: true,
  templateUrl: './escanear.component.html',
  imports: [CommonModule, FormsModule, AjudaComponent, PhotoPickerComponent, SkeletonComponent, TagComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EscanearComponent implements OnInit {
  readonly adapter = EscanearAdapter;

  loteInvalido: string | null = null;

  /** Fotos batidas na câmera nesta sessão, aguardando envio (ver `abrirCamera`). */
  capturas: Captura[] = [];
  capturando = false;

  /** Valem para o próximo envio (foto única, lote ou câmera). */
  medicamento = '';
  camadas = 1;

  /** Nota com a imagem anotada (caixas marcadas) aberta no histórico. */
  expandida: string | null = null;

  alternar(nota: NotaRegistro): void {
    this.expandida = this.expandida === nota.id ? null : nota.id;
  }

  constructor(public facade: EscanearFacade) {}

  ngOnInit(): void {
    this.facade.carregarHistorico();
  }

  /**
   * Abre a câmera nativa (`@capacitor/camera` — no navegador/dev cai pro
   * seletor de arquivo do próprio plugin). Cada chamada tira 1 foto e
   * acumula em `capturas`; o usuário decide quando enviar (`enviarCapturas`),
   * podendo bater várias fotos em sequência sem sair da tela.
   */
  async abrirCamera(): Promise<void> {
    this.capturando = true;
    try {
      const foto = await Camera.getPhoto({
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
        quality: 85,
        saveToGallery: false,
      });
      if (!foto.webPath) return;

      const blob = await fetch(foto.webPath).then((r) => r.blob());
      const file = new File([blob], `captura-${Date.now()}.jpeg`, { type: blob.type || 'image/jpeg' });
      this.capturas = [...this.capturas, { file, preview: foto.webPath }];
    } catch (err) {
      // Usuário cancelou a câmera — não é erro, só não faz nada.
      if ((err as Error)?.message?.toLowerCase().includes('cancel')) return;
      console.error('[EscanearComponent] falha ao abrir a câmera:', err);
    } finally {
      this.capturando = false;
    }
  }

  removerCaptura(index: number): void {
    this.capturas = this.capturas.filter((_, i) => i !== index);
  }

  async enviarCapturas(): Promise<void> {
    if (!this.capturas.length) return;
    const files = this.capturas.map((c) => c.file);
    this.capturas = [];
    await this.facade.enviarLote(files, this.metadados());
  }

  onFotoUnica(file: File): void {
    void this.facade.enviarImagemUnica(file, this.metadados());
  }

  onLoteSelecionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (!files.length) return;

    this.loteInvalido = files.map((f) => validateImageFile(f)).find((e) => !!e) ?? null;
    if (this.loteInvalido) return;

    void this.facade.enviarLote(files, this.metadados());
  }

  /** Camadas sempre inteiro ≥ 1 (o campo numérico aceita vazio/0/decimal). */
  private camadasValidas(valor: unknown): number {
    const n = Math.floor(Number(valor));
    return Number.isFinite(n) && n >= 1 ? Math.min(n, 999) : 1;
  }

  private metadados(): NotaMetadados {
    return { medicamento: this.medicamento.trim() || undefined, camadas: this.camadasValidas(this.camadas) };
  }

  ajustarCamadas(delta: number): void {
    this.camadas = this.camadasValidas(this.camadasValidas(this.camadas) + delta);
  }

  /** Edição no histórico: só salva se mudou de fato. */
  salvarCamadas(nota: NotaRegistro, valor: unknown): void {
    const camadas = this.camadasValidas(valor);
    if (camadas !== this.adapter.camadas(nota)) void this.facade.atualizar(nota.id, { camadas });
  }

  salvarMedicamento(nota: NotaRegistro, valor: string): void {
    const medicamento = valor.trim();
    if (medicamento !== (nota.medicamento ?? '')) void this.facade.atualizar(nota.id, { medicamento });
  }

  remover(nota: NotaRegistro): void {
    void this.facade.remover(nota.id);
  }
}
