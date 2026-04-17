// Product Images — Base64/FileReader upload
// Demo implementation: converts file → data URL → stores in memory
// Production: replace with S3 / Cloudflare R2 / Cloudflare Images upload

export interface UploadResult {
  url: string;    // data URL (demo) or cloud storage URL
  key: string;    // unique key for deletion
  filename: string;
  size: number;
  mimeType: string;
}

const _uploadedImages = new Map<string, UploadResult>();

/**
 * Upload a product image. Demo: FileReader → base64 data URL.
 * Production: POST to S3 presigned URL or Cloudflare Images API.
 */
export async function uploadProductImage(
  file: File,
  productId: string
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const dataUrl = reader.result as string;
      const key = `img_${productId}_${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
      const result: UploadResult = {
        url: dataUrl,
        key,
        filename: file.name,
        size: file.size,
        mimeType: file.type,
      };
      _uploadedImages.set(key, result);
      resolve(result);
    };

    reader.onerror = () => {
      reject(new Error(`Failed to read file: ${file.name}`));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Delete an uploaded image. Demo: removes from in-memory map.
 * Production: call DELETE on cloud storage.
 */
export async function deleteProductImage(key: string): Promise<void> {
  _uploadedImages.delete(key);
}

/**
 * Get all uploaded images for a product (in-memory demo).
 */
export function getProductImages(productId: string): UploadResult[] {
  return [..._uploadedImages.values()].filter(r => r.key.includes(productId));
}

/**
 * Validate image file before upload.
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: `Unsupported type: ${file.type}. Use JPEG, PNG, WebP, or GIF.` };
  }
  if (file.size > MAX_SIZE) {
    return { valid: false, error: `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Max: 10MB.` };
  }
  return { valid: true };
}

/**
 * Format file size for display.
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
