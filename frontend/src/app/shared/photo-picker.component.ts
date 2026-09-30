import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { validateImageFile } from './validate-image-file';

/**
 * Seletor de foto simples: `<input type="file">` nativo (abre câmera/galeria
 * no WebView do Android sem plugin do Capacitor) + prévia local. Diferente
 * do picker original do monorepo (`@shared`, ligado a `ControlValueAccessor`
 * e a um `uploadFn` que devolve URL de S3), este só emite o `File` bruto —
 * quem usa decide o que fazer com ele (ver `EscanearFacade`).
 */
@Component({
  selector: 'app-photo-picker',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col items-center gap-2">
      <button
        type="button"
        (click)="openPicker()"
        [disabled]="disabled"
        class="w-20 h-20 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden active:scale-95 transition-transform disabled:opacity-50"
      >
        @if (preview) {
          <img [src]="preview" alt="Prévia" class="w-full h-full object-cover" />
        } @else {
          <i class="pi pi-camera text-slate-400 text-xl"></i>
        }
      </button>
      @if (error) {
        <p class="text-[11px] text-red-600 text-center">{{ error }}</p>
      }
      <input
        #fileInput
        type="file"
        accept="image/*"
        class="hidden"
        [disabled]="disabled"
        (change)="onFileChange($event)"
      />
    </div>
  `,
})
export class PhotoPickerComponent {
  @Input() disabled = false;
  @Output() fileSelected = new EventEmitter<File>();

  preview: string | null = null;
  error: string | null = null;

  @ViewChild('fileInput') private fileInput?: ElementRef<HTMLInputElement>;

  openPicker(): void {
    if (this.disabled) return;
    this.fileInput?.nativeElement.click();
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    const erro = validateImageFile(file);
    if (erro) {
      this.error = erro;
      return;
    }

    this.error = null;
    const reader = new FileReader();
    reader.onload = () => {
      this.preview = reader.result as string;
    };
    reader.readAsDataURL(file);

    this.fileSelected.emit(file);
  }
}
