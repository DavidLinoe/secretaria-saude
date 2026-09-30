import { BadRequestException } from '@nestjs/common';
import { memoryStorage } from 'multer';

/**
 * Multer não grava em disco — o buffer é só repassado pro serviço Python
 * (`PythonBridgeService`), que é quem persiste de verdade. Duas variantes
 * porque o limite de quantidade difere entre os dois fluxos (1 nota por foto
 * vs. lote de fotos de uma vez).
 */
const IMAGE_MAX_BYTES = 8 * 1024 * 1024;

const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

const fileFilter = (
  _req: unknown,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void,
) => {
  if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype)) {
    callback(
      new BadRequestException(`Formato de imagem não suportado: ${file.mimetype}. Use JPEG, PNG, WEBP ou GIF.`),
      false,
    );
    return;
  }
  callback(null, true);
};

export const singleImageUploadOptions = {
  storage: memoryStorage(),
  limits: { fileSize: IMAGE_MAX_BYTES, files: 1 },
  fileFilter,
};

export const multipleImagesUploadOptions = {
  storage: memoryStorage(),
  limits: { fileSize: IMAGE_MAX_BYTES, files: 10 },
  fileFilter,
};
