import { Injectable } from '@angular/core';
import { HttpService } from '../../shared/http.service';
import { Distribuicao, Polo, PoloEstoque, PoloForm } from './polos.model';

@Injectable({ providedIn: 'root' })
export class PolosApiService {
  constructor(private http: HttpService) {}

  listar(): Promise<Polo[]> {
    return this.http.get<Polo[]>('polos');
  }
  estoque(id: string): Promise<PoloEstoque[]> {
    return this.http.get<PoloEstoque[]>(`polos/${id}/estoque`);
  }
  distribuicoes(id: string): Promise<Distribuicao[]> {
    return this.http.get<Distribuicao[]>(`polos/${id}/distribuicoes`);
  }
  criar(form: PoloForm): Promise<Polo> {
    return this.http.post<Polo>('polos', form);
  }
  atualizar(id: string, form: Partial<PoloForm> & { ativo?: boolean }): Promise<Polo> {
    return this.http.put<Polo>(`polos/${id}`, form);
  }
  remover(id: string): Promise<{ removido: boolean }> {
    return this.http.delete<{ removido: boolean }>(`polos/${id}`);
  }
}
