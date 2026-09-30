export const MAX_IMAGE_SIZE_MB = 8;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

/** Mesmo limite do backend (`notas-upload.options.ts`) — falha cedo, sem gastar upload. */
export function validateImageFile(file: File, maxSizeMb = MAX_IMAGE_SIZE_MB): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return 'Formato de imagem não suportado. Use JPEG, PNG, WEBP ou GIF.';
  }
  if (file.size > maxSizeMb * 1024 * 1024) {
    return `A imagem deve ter no máximo ${maxSizeMb} MB.`;
  }
  return null;
}
