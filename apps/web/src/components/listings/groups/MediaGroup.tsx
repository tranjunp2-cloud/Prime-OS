import { useState } from 'react';
import { Image as ImageIcon, Video, Upload, X, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { type MediaGroup as MediaData } from '@/lib/listing-groups';
import { cn } from '@/lib/utils';

interface MediaGroupProps {
  data: MediaData;
  onChange: (data: MediaData) => void;
  errors?: Record<string, string>;
}

export function MediaGroup({ data, onChange, errors = {} }: MediaGroupProps) {
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newVideoUrl, setNewVideoUrl] = useState('');

  const handleMainImageChange = (url: string) => {
    onChange({ ...data, mainImage: url });
  };

  const addAdditionalImage = () => {
    if (newImageUrl.trim()) {
      onChange({ 
        ...data, 
        additionalImages: [...data.additionalImages, newImageUrl.trim()] 
      });
      setNewImageUrl('');
    }
  };

  const removeAdditionalImage = (index: number) => {
    const updated = data.additionalImages.filter((_, i) => i !== index);
    onChange({ ...data, additionalImages: updated });
  };

  const setAsMainImage = (imageUrl: string, index: number) => {
    const oldMain = data.mainImage;
    const newAdditional = data.additionalImages.filter((_, i) => i !== index);
    if (oldMain) {
      newAdditional.unshift(oldMain);
    }
    onChange({
      ...data,
      mainImage: imageUrl,
      additionalImages: newAdditional,
    });
  };

  const addVideo = () => {
    if (newVideoUrl.trim()) {
      onChange({ 
        ...data, 
        videos: [...data.videos, newVideoUrl.trim()] 
      });
      setNewVideoUrl('');
    }
  };

  const removeVideo = (index: number) => {
    const updated = data.videos.filter((_, i) => i !== index);
    onChange({ ...data, videos: updated });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="size-5" />
          Group 3: Media (Images / Video)
        </CardTitle>
        <CardDescription>
          Product images and videos for the listing
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {/* Main Image */}
        <div className="flex flex-col gap-3">
          <Label className="flex items-center gap-2">
            Main Image <span className="text-destructive">*</span>
          </Label>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Input
                value={data.mainImage || ''}
                onChange={(e) => handleMainImageChange(e.target.value)}
                placeholder="Main image URL"
                className={errors.mainImage ? 'border-destructive' : ''}
              />
              {errors.mainImage && (
                <p className="text-xs text-destructive">{errors.mainImage}</p>
              )}
            </div>
            {data.mainImage && (
              <div className="relative group">
                <img
                  src={data.mainImage}
                  alt="Main product"
                  className="size-32 object-cover rounded-lg border"
                  onError={(e) => {
                    e.currentTarget.src = '/placeholder.svg';
                  }}
                />
                <Badge className="absolute top-2 left-2 bg-primary">
                  <Star className="size-3 mr-1" />
                  Main
                </Badge>
              </div>
            )}
          </div>
        </div>

        {/* Additional Images */}
        <div className="flex border-t pt-4 flex-col gap-3">
          <Label>Additional Images</Label>
          <div className="flex gap-2">
            <Input
              value={newImageUrl}
              onChange={(e) => setNewImageUrl(e.target.value)}
              placeholder="Image URL"
              className="flex-1"
            />
            <Button type="button" variant="outline" onClick={addAdditionalImage}>
              <Upload className="size-4 mr-2" />
              Add
            </Button>
          </div>
          
          {data.additionalImages.length > 0 && (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 mt-3">
              {data.additionalImages.map((url, index) => (
                <div key={index} className="relative group">
                  <img
                    src={url}
                    alt={`Product ${index + 2}`}
                    className="w-full aspect-square object-cover rounded-lg border"
                    onError={(e) => {
                      e.currentTarget.src = '/placeholder.svg';
                    }}
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="secondary"
                      className="size-7"
                      onClick={() => setAsMainImage(url, index)}
                      title="Set as main image"
                    >
                      <Star className="size-3" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="destructive"
                      className="size-7"
                      onClick={() => removeAdditionalImage(index)}
                    >
                      <X className="size-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Videos */}
        <div className="flex border-t pt-4 flex-col gap-3">
          <Label className="flex items-center gap-2">
            <Video className="size-4" />
            Product Videos (Optional)
          </Label>
          <div className="flex gap-2">
            <Input
              value={newVideoUrl}
              onChange={(e) => setNewVideoUrl(e.target.value)}
              placeholder="Video URL (YouTube, Vimeo, etc.)"
              className="flex-1"
            />
            <Button type="button" variant="outline" onClick={addVideo}>
              Add Video
            </Button>
          </div>
          
          {data.videos.length > 0 && (
            <div className="flex mt-3 flex-col gap-2">
              {data.videos.map((url, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                  <Video className="size-4 text-muted-foreground" />
                  <span className="text-sm flex-1 truncate">{url}</span>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-7"
                    onClick={() => removeVideo(index)}
                  >
                    <X className="size-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
