import { Injectable } from '@angular/core';
import { HttpService } from '../../../shared/http.service';
import { NotaMetadados, NotaRegistro } from '../models/escanear.model';

// Contagem + leitura do nome (OCR) leva ~3–7 s por foto na CPU; lote de 10 passa de 30 s.
const UPLOAD_TIMEOUT_MS = 120000;

function anexarMetadados(form: FormData, meta: NotaMetadados): void {
  if (meta.medicamento?.trim()) form.append('medicamento', meta.medicamento.trim());
  form.append('camadas', String(meta.camadas));
}

/**
 * Sem fallback de mock em falha (mesma decisão do `HomeApiService`): fingir
 * que uma nota foi processada quando a ponte com o Python falhou é pior do
 * que mostrar o erro.
 */
@Injectable({ providedIn: 'root' })
export class EscanearApiService {
  constructor(private http: HttpService) {}

  async processarImagem(file: File, meta: NotaMetadados): Promise<NotaRegistro> {
    const form = new FormData();
    form.append('file', file, file.name);
    anexarMetadados(form, meta);
    return this.http.post<NotaRegistro>('notas/imagem', form, UPLOAD_TIMEOUT_MS);
  }

  async processarImagens(files: File[], meta: NotaMetadados): Promise<NotaRegistro> {
    const form = new FormData();
    files.forEach((file) => form.append('files', file, file.name));
    anexarMetadados(form, meta);
    return this.http.post<NotaRegistro>('notas/imagens', form, UPLOAD_TIMEOUT_MS);
  }

  async listar(): Promise<NotaRegistro[]> {
    return this.http.get<NotaRegistro[]>('notas');
  }

  async atualizar(id: string, meta: Partial<NotaMetadados>): Promise<NotaRegistro> {
    return this.http.patch<NotaRegistro>(`notas/${id}`, meta);
  }

  async remover(id: string): Promise<void> {
    await this.http.delete<{ removido: boolean }>(`notas/${id}`);
  }
}
