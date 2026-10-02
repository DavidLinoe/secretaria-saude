import { Injectable } from '@angular/core';
import { HttpService } from '../../shared/http.service';
import { Aceite, Conferencia, MockSet } from './conferencia.model';

const UPLOAD_TIMEOUT_MS = 90000;

@Injectable({ providedIn: 'root' })
export class ConferenciaApiService {
  constructor(private http: HttpService) {}

  listar(): Promise<Conferencia[]> {
    return this.http.get<Conferencia[]>('conferencias');
  }

  buscar(id: string): Promise<Conferencia> {
    return this.http.get<Conferencia>(`conferencias/${id}`);
  }

  mocks(): Promise<MockSet[]> {
    return this.http.get<MockSet[]>('mocks');
  }

  criarComMock(setId: string): Promise<Conferencia> {
    return this.http.post<Conferencia>(`conferencias/mock/${setId}`, {}, UPLOAD_TIMEOUT_MS);
  }

  criar(nota: File, documento?: File): Promise<Conferencia> {
    const form = new FormData();
    form.append('nota', nota, nota.name);
    if (documento) form.append('documento', documento, documento.name);
    return this.http.post<Conferencia>('conferencias', form, UPLOAD_TIMEOUT_MS);
  }

  confirmar(id: string, aceitar: Aceite[]): Promise<Conferencia> {
    return this.http.post<Conferencia>(`conferencias/${id}/confirmar`, { aceitar });
  }

  rejeitar(id: string): Promise<Conferencia> {
    return this.http.post<Conferencia>(`conferencias/${id}/rejeitar`, {});
  }

  remover(id: string): Promise<{ removido: boolean }> {
    return this.http.delete<{ removido: boolean }>(`conferencias/${id}`);
  }
}
