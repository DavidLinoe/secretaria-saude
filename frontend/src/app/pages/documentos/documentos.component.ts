import { ChangeDetectionStrategy, Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpService } from '../../shared/http.service';
import { mensagemErro } from '../../shared/erro';
import { AjudaComponent } from '../../shared/ajuda.component';
import { FeedbackService } from '../../shared/feedback.service';
import { SkeletonComponent } from '../../shared/skeleton.component';
import { TagComponent } from '../../shared/tag.component';
import { VisualizadorComponent } from '../../shared/visualizador.component';
import { Documento, DocumentoOrigem, DocumentoTipo, ORIGEM_ROTULO, TIPO_ROTULO } from './documentos.model';

@Component({
  selector: 'app-documentos',
  standalone: true,
  templateUrl: './documentos.component.html',
  imports: [CommonModule, FormsModule, AjudaComponent, SkeletonComponent, TagComponent, VisualizadorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocumentosComponent implements OnInit {
  readonly tipoRotulo = TIPO_ROTULO;
  readonly origemRotulo = ORIGEM_ROTULO;
  readonly filtros: { valor: DocumentoOrigem | ''; label: string }[] = [
    { valor: '', label: 'Todos' },
    { valor: 'importado', label: 'Importados' },
    { valor: 'conferencia', label: 'Conferências' },
    { valor: 'exemplo', label: 'Exemplos' },
  ];

  readonly documentos = signal<Documento[]>([]);
  readonly filtro = signal<DocumentoOrigem | ''>('');
  readonly visiveis = computed(() => this.documentos().filter((d) => !this.filtro() || d.origem === this.filtro()));
  readonly carregando = signal(false);
  readonly enviando = signal(false);
  readonly erro = signal<string | null>(null);
  readonly aberto = signal<Documento | null>(null);
  readonly arquivoEscolhido = signal<File | null>(null);
  tipoImport: DocumentoTipo = 'nota_fiscal';

  constructor(
    private http: HttpService,
    private fb: FeedbackService,
  ) {}

  ngOnInit(): void {
    void this.carregar();
  }

  async carregar(): Promise<void> {
    this.carregando.set(true);
    try {
      this.documentos.set(await this.http.get<Documento[]>('documentos'));
      this.erro.set(null);
    } catch (err) {
      this.erro.set(mensagemErro(err, 'Não foi possível carregar os documentos.'));
    } finally {
      this.carregando.set(false);
    }
  }

  escolher(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.arquivoEscolhido.set(input.files?.[0] ?? null);
    input.value = '';
  }

  async importar(): Promise<void> {
    const file = this.arquivoEscolhido();
    if (!file) return;
    this.enviando.set(true);
    this.erro.set(null);
    try {
      const form = new FormData();
      form.append('file', file, file.name);
      form.append('tipo', this.tipoImport);
      await this.http.post<Documento>('documentos', form, 60000);
      this.arquivoEscolhido.set(null);
      this.fb.aviso('Arquivo importado e salvo.');
      this.filtro.set('importado');
      await this.carregar();
    } catch (err) {
      this.erro.set(mensagemErro(err, 'Não foi possível importar o arquivo.'));
    } finally {
      this.enviando.set(false);
    }
  }

  async remover(doc: Documento, event: Event): Promise<void> {
    event.stopPropagation();
    const ok = await this.fb.confirmar({
      titulo: 'Excluir documento?',
      mensagem: `"${doc.nome}" será removido do armazenamento. Conferências já feitas continuam, mas perdem o link para o arquivo original.`,
      confirmar: 'Excluir',
      perigo: true,
    });
    if (!ok) return;
    try {
      await this.http.delete(`documentos/${doc.id}`);
      this.fb.aviso('Documento excluído.');
      this.documentos.update((l) => l.filter((d) => d.id !== doc.id));
    } catch (err) {
      this.erro.set(mensagemErro(err));
    }
  }

  tamanho(bytes: number): string {
    return bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
}
