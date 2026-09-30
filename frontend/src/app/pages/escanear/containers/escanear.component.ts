import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PhotoPickerComponent } from '../../../shared/photo-picker.component';
import { SkeletonComponent } from '../../../shared/skeleton.component';
import { TagComponent } from '../../../shared/tag.component';
import { validateImageFile } from '../../../shared/validate-image-file';
import { EscanearFacade } from '../facades/escanear.facade';
import { EscanearAdapter } from '../adapters/escanear.adapter';
import { NotaRegistro } from '../models/escanear.model';

@Component({
  selector: 'app-escanear',
  standalone: true,
  templateUrl: './escanear.component.html',
  imports: [CommonModule, PhotoPickerComponent, SkeletonComponent, TagComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EscanearComponent implements OnInit {
  readonly adapter = EscanearAdapter;

  loteInvalido: string | null = null;

  constructor(public facade: EscanearFacade) {}

  ngOnInit(): void {
    this.facade.carregarHistorico();
  }

  onFotoUnica(file: File): void {
    void this.facade.enviarImagemUnica(file);
  }

  onLoteSelecionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (!files.length) return;

    this.loteInvalido = files.map((f) => validateImageFile(f)).find((e) => !!e) ?? null;
    if (this.loteInvalido) return;

    void this.facade.enviarLote(files);
  }

  remover(nota: NotaRegistro): void {
    void this.facade.remover(nota.id);
  }
}
