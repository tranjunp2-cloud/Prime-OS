import {
  deleteProductImage,
  uploadProductImage,
  validateImageFile,
  type UploadResult,
} from '@/lib/product-images';

export type IntelligenceAssetSource = 'creators' | 'customers';

export interface IntelligenceAsset extends UploadResult {
  id: string;
  source: IntelligenceAssetSource;
  entityId: string;
  entityLabel: string;
  contextLabel: string;
  uploadedAt: string;
}

const STORAGE_KEY = 'prime.intelligence.assets.v1';

function hasStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function readAssets(): IntelligenceAsset[] {
  if (!hasStorage()) return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as IntelligenceAsset[] : [];
  } catch {
    return [];
  }
}

function writeAssets(assets: IntelligenceAsset[]) {
  if (!hasStorage()) return;

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(assets.slice(0, 24)));
}

export function getIntelligenceAssets(source?: IntelligenceAssetSource): IntelligenceAsset[] {
  const assets = readAssets()
    .slice()
    .sort((left, right) => right.uploadedAt.localeCompare(left.uploadedAt));

  return source ? assets.filter((asset) => asset.source === source) : assets;
}

export async function uploadIntelligenceAsset({
  file,
  source,
  entityId,
  entityLabel,
  contextLabel,
}: {
  file: File;
  source: IntelligenceAssetSource;
  entityId: string;
  entityLabel: string;
  contextLabel: string;
}): Promise<IntelligenceAsset> {
  const validation = validateImageFile(file);
  if (!validation.valid) {
    throw new Error(validation.error || 'Unsupported image file.');
  }

  const upload = await uploadProductImage(file, `prime-${source}-${entityId}`);
  const asset: IntelligenceAsset = {
    ...upload,
    id: `${source}-${entityId}-${Date.now()}-${file.name.replace(/\s+/g, '-')}`,
    source,
    entityId,
    entityLabel,
    contextLabel,
    uploadedAt: new Date().toISOString(),
  };

  writeAssets([asset, ...readAssets()]);
  return asset;
}

export async function removeIntelligenceAsset(assetId: string): Promise<void> {
  const assets = readAssets();
  const target = assets.find((asset) => asset.id === assetId);
  if (target) {
    await deleteProductImage(target.key);
  }

  writeAssets(assets.filter((asset) => asset.id !== assetId));
}
