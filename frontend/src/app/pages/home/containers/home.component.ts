import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AjudaComponent } from '../../../shared/ajuda.component';
import { SkeletonComponent } from '../../../shared/skeleton.component';
import { TagComponent } from '../../../shared/tag.component';
import { ConferenciaApiService } from '../../conferencia/conferencia.api';
import { EstoqueApiService } from '../../estoque/estoque.api';
import { EstoqueResumo } from '../../estoque/estoque.model';
import { HomeFacade } from '../facades/home.facade';
import { FLUXO_ETAPAS } from '../models/home.model';

@Component({
  selector: 'app-home',
  standalone: true,
  templateUrl: './home.component.html',
  imports: [CommonModule, RouterModule, AjudaComponent, SkeletonComponent, TagComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent implements OnInit {
  readonly etapas = FLUXO_ETAPAS;
  readonly resumo = signal<EstoqueResumo | null>(null);
  readonly pendentes = signal<number | null>(null);

  constructor(
    public facade: HomeFacade,
    private estoque: EstoqueApiService,
    private conferencias: ConferenciaApiService,
  ) {}

  ngOnInit(): void {
    void this.facade.load();
    this.estoque.resumo().then((r) => this.resumo.set(r)).catch(() => this.resumo.set(null));
    this.conferencias
      .listar()
      .then((l) => this.pendentes.set(l.filter((c) => c.status === 'pendente').length))
      .catch(() => this.pendentes.set(null));
  }

  retryStatus(): void {
    void this.facade.load();
  }
}
