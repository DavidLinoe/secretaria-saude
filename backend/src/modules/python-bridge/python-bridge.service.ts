import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
// `form-data` não faz o shim de interop que a `axios` faz — `import FormData
// from 'form-data'` compila (sem `esModuleInterop`) pra `require('form-data').default`,
// que não existe e quebra em runtime. `import =` chama `require` direto.
import FormData = require('form-data');

/**
 * `@types/axios` (dependência legada, obsoleta desde que a própria axios
 * passou a publicar seus tipos) sombreia os tipos reais do pacote e faz
 * `axios.isAxiosError`/`AxiosError` não tiparem certo — por isso o guard
 * manual abaixo em vez de `axios.isAxiosError(err)`.
 */
function extractAxiosErrorInfo(err: unknown): { status?: number; detail: string } {
  const maybeAxiosErr = err as { isAxiosError?: boolean; response?: { status?: number; data?: unknown } };
  if (maybeAxiosErr?.isAxiosError) {
    return { status: maybeAxiosErr.response?.status, detail: JSON.stringify(maybeAxiosErr.response?.data) };
  }
  return { detail: (err as Error).message };
}

/**
 * Ponte HTTP pro serviço Python que já existe fora deste monorepo: ele expõe
 * 2 endpoints (processar 1 imagem, processar um array de imagens) e é quem
 * de fato faz OCR/parsing e grava o resultado no banco dele. O Node aqui não
 * reprocessa nada — só repassa o(s) arquivo(s) recebido(s) do front e devolve
 * a resposta do Python pro chamador (ver `NotasService`, que também guarda
 * uma cópia leve do resultado pro CRUD de listagem do front).
 *
 * Paths/campo de arquivo são configuráveis por env porque o contrato real do
 * Python ainda não foi validado nesta integração — os defaults abaixo são um
 * chute razoável (`file`/`files` multipart) e devem ser ajustados assim que o
 * contrato real for confirmado.
 */
@Injectable()
export class PythonBridgeService {
  private readonly logger = new Logger(PythonBridgeService.name);
  private readonly baseUrl = process.env.PYTHON_API_URL ?? 'http://localhost:8000';
  private readonly processImagePath = process.env.PYTHON_PROCESS_IMAGE_PATH ?? '/process-image';
  private readonly processImagesPath = process.env.PYTHON_PROCESS_IMAGES_PATH ?? '/process-images';
  private readonly timeoutMs = Number(process.env.PYTHON_API_TIMEOUT_MS ?? 30000);

  private client() {
    return axios.create({ baseURL: this.baseUrl, timeout: this.timeoutMs });
  }

  async processarImagem(file: Express.Multer.File): Promise<unknown> {
    const form = new FormData();
    form.append('file', file.buffer, { filename: file.originalname, contentType: file.mimetype });

    return this.post(this.processImagePath, form);
  }

  async processarImagens(files: Express.Multer.File[]): Promise<unknown> {
    const form = new FormData();
    for (const file of files) {
      form.append('files', file.buffer, { filename: file.originalname, contentType: file.mimetype });
    }

    return this.post(this.processImagesPath, form);
  }

  private async post(path: string, form: FormData): Promise<unknown> {
    try {
      const response = await this.client().post(path, form, { headers: form.getHeaders() });
      return response.data;
    } catch (err) {
      const { status, detail } = extractAxiosErrorInfo(err);
      this.logger.error(`Falha ao chamar a API Python (${path}): ${status ?? 's/status'} ${detail}`);
      throw new BadGatewayException(
        `API de processamento (Python) indisponível ou retornou erro${status ? ` (HTTP ${status})` : ''}.`,
      );
    }
  }
}
