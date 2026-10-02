import { Injectable } from '@angular/core';
import { HttpService } from '../../shared/http.service';
import { EstoqueForm, EstoqueItem, EstoqueResumo, FiltroEstoque, Movimento, MovimentoTipo } from './estoque.model';

@Injectable({ providedIn: 'root' })
export class EstoqueApiService {
  constructor(private http: HttpService) {}

  listar(q: string, status: FiltroEstoque): Promise<EstoqueItem[]> {
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (status) params.set('status', status);
    const qs = params.toString();
    return this.http.get<EstoqueItem[]>(`estoque${qs ? '?' + qs : ''}`);
  }

  resumo(): Promise<EstoqueResumo> {
    return this.http.get<EstoqueResumo>('estoque/resumo');
  }

  criar(form: EstoqueForm): Promise<EstoqueItem> {
    return this.http.post<EstoqueItem>('estoque', form);
  }

  atualizar(id: string, form: EstoqueForm): Promise<EstoqueItem> {
    return this.http.put<EstoqueItem>(`estoque/${id}`, form);
  }

  remover(id: string): Promise<{ removido: boolean }> {
    return this.http.delete<{ removido: boolean }>(`estoque/${id}`);
  }

  movimentar(id: string, tipo: MovimentoTipo, quantidade: number, motivo: string): Promise<EstoqueItem> {
    return this.http.post<EstoqueItem>(`estoque/${id}/movimentos`, { tipo, quantidade, motivo: motivo || undefined });
  }

  historico(id: string): Promise<Movimento[]> {
    return this.http.get<Movimento[]>(`estoque/${id}/movimentos`);
  }
}
