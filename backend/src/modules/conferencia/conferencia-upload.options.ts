import { BadRequestException } from '@nestjs/common';
import { memoryStorage } from 'multer';

const PERMITIDOS = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export const conferenciaUploadOptions = {
  storage: memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024, files: 2 },
  fileFilter: (_req: unknown, file: Express.Multer.File, cb: (e: Error | null, ok: boolean) => void) => {
    if (!PERMITIDOS.includes(file.mimetype)) {
      cb(new BadRequestException(`Formato não suportado: ${file.mimetype}. Use PDF, JPEG ou PNG.`), false);
      return;
    }
    cb(null, true);
  },
};
