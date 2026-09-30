import { Injectable } from '@angular/core';
import { HttpService } from '../../../shared/http.service';
import { NotaRegistro } from '../models/escanear.model';

const UPLOAD_TIMEOUT_MS = 30000;

/**
 * Sem fallback de mock em falha (mesma decisão do `HomeApiService`): fingir
 * que uma nota foi processada quando a ponte com o Python falhou é pior do
 * que mostrar o erro.
 */
@Injectable({ providedIn: 'root' })
export class EscanearApiService {
  constructor(private http: HttpService) {}

  async processarImagem(file: File): Promise<NotaRegistro> {
    const form = new FormData();
    form.append('file', file, file.name);
    return this.http.post<NotaRegistro>('notas/imagem', form, UPLOAD_TIMEOUT_MS);
  }

  async processarImagens(files: File[]): Promise<NotaRegistro> {
    const form = new FormData();
    files.forEach((file) => form.append('files', file, file.name));
    return this.http.post<NotaRegistro>('notas/imagens', form, UPLOAD_TIMEOUT_MS);
  }

  async listar(): Promise<NotaRegistro[]> {
    return this.http.get<NotaRegistro[]>('notas');
  }

  async remover(id: string): Promise<void> {
    await this.http.delete<{ removido: boolean }>(`notas/${id}`);
  }
}
