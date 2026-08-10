import { useMemo, useRef, useState } from 'react';
import { ImagePlus, Loader2, Star, Trash2, Upload } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n/I18nContext';
import { uploadProductImage } from '@/lib/product-images';
import { toast } from 'sonner';

interface ProductImagesEditorProps {
  images: string[];
  productId: string;
  userId: string;
  disabled?: boolean;
  onChange: (images: string[]) => void;
  onUploaded: (upload: { path: string; url: string }) => void;
}

export function ProductImagesEditor({
  images,
  productId,
  userId,
  disabled,
  onChange,
  onUploaded,
}: ProductImagesEditorProps) {
  const { t } = useI18n();
  const addInputRef = useRef<HTMLInputElement | null>(null);
  const replaceInputRef = useRef<HTMLInputElement | null>(null);
  const replaceIndexRef = useRef<number | null>(null);
  const [uploadTarget, setUploadTarget] = useState<number | 'append' | null>(null);

  const isUploading = uploadTarget !== null;
  const imageCountLabel = useMemo(() => `${images.length} ${t('common.items')}`, [images.length, t]);

  const handleAppendFiles = async (fileList: FileList | null) => {
    if (!fileList?.length) return;
    setUploadTarget('append');

    try {
      const nextImages = [...images];
      for (const file of Array.from(fileList)) {
        const upload = await uploadProductImage({ file, productId, userId });
        onUploaded(upload);
        nextImages.push(upload.url);
      }
      onChange(nextImages);
    } catch (error) {
      console.error('Failed to upload product image:', error);
      toast.error(error instanceof Error ? error.message : t('products.imageUploadFailed'));
    } finally {
      setUploadTarget(null);
      if (addInputRef.current) addInputRef.current.value = '';
    }
  };

  const handleReplaceFile = async (fileList: FileList | null) => {
    const replaceIndex = replaceIndexRef.current;
    if (!fileList?.length || replaceIndex === null) return;

    setUploadTarget(replaceIndex);

    try {
      const upload = await uploadProductImage({ file: fileList[0], productId, userId });
      onUploaded(upload);
      const nextImages = [...images];
      nextImages[replaceIndex] = upload.url;
      onChange(nextImages);
    } catch (error) {
      console.error('Failed to replace product image:', error);
      toast.error(error instanceof Error ? error.message : t('products.imageReplaceFailed'));
    } finally {
      setUploadTarget(null);
      replaceIndexRef.current = null;
      if (replaceInputRef.current) replaceInputRef.current.value = '';
    }
  };

  const handleSetPrimary = (index: number) => {
    if (index === 0) return;
    const nextImages = [...images];
    const [selected] = nextImages.splice(index, 1);
    nextImages.unshift(selected);
    onChange(nextImages);
  };

  const handleRemove = (index: number) => {
    onChange(images.filter((_, imageIndex) => imageIndex !== index));
  };

  const triggerReplace = (index: number) => {
    replaceIndexRef.current = index;
    replaceInputRef.current?.click();
  };

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <CardTitle>{t('products.images')}</CardTitle>
          <CardDescription>{t('products.imagesEditorDescription')}</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {imageCountLabel}
          </Badge>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addInputRef.current?.click()}
            disabled={disabled || isUploading}
          >
            {isUploading && uploadTarget === 'append' ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <ImagePlus className="mr-2 size-4" />
            )}
            {t('products.addImages')}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <input
          ref={addInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          multiple
          onChange={(event) => void handleAppendFiles(event.target.files)}
        />
        <input
          ref={replaceInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={(event) => void handleReplaceFile(event.target.files)}
        />

        {images.length === 0 ? (
          <div className="flex min-h-[220px] flex-col items-center justify-center rounded-lg border border-dashed border-edge-divider/70 bg-surface-hover/45 px-6 text-center">
            <ImagePlus className="mb-3 size-10 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">{t('products.noImagesYet')}</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">{t('products.noImagesYetDescription')}</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {images.map((image, index) => {
              const isReplacing = uploadTarget === index;
              const isPrimary = index === 0;

              return (
                <div
                  key={`${image}-${index}`}
                  className="surface-solid overflow-hidden rounded-lg border border-edge-divider/60"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-surface-hover/45">
                    <img
                      src={image}
                      alt={`${t('products.images')} ${index + 1}`}
                      className={cn('h-full w-full object-cover', isReplacing && 'opacity-40')}
                      onError={(event) => {
                        event.currentTarget.src = '/placeholder.svg';
                      }}
                    />
                    <div className="absolute left-3 top-3 flex items-center gap-2">
                      {isPrimary && (
                        <Badge className="border border-primary/20 bg-primary/15 text-primary shadow-none">
                          <Star className="mr-1 size-3" />
                          {t('products.primaryImage')}
                        </Badge>
                      )}
                    </div>
                    {isReplacing && (
                      <div className="absolute inset-0 flex items-center justify-center bg-background/35 backdrop-blur-sm">
                        <Loader2 className="size-6 animate-spin text-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 p-3">
                    {!isPrimary && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => handleSetPrimary(index)}
                        disabled={disabled || isUploading}
                      >
                        <Star className="mr-1 h-3.5 w-3.5" />
                        {t('products.setPrimaryImage')}
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => triggerReplace(index)}
                      disabled={disabled || isUploading}
                    >
                      <Upload className="mr-1 h-3.5 w-3.5" />
                      {t('products.replaceImage')}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="ml-auto text-xs text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemove(index)}
                      disabled={disabled || isUploading}
                    >
                      <Trash2 className="mr-1 h-3.5 w-3.5" />
                      {t('common.delete')}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-xs text-muted-foreground">{t('products.imageUploadHint')}</p>
      </CardContent>
    </Card>
  );
}
