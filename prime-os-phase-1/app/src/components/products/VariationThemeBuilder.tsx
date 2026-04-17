import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, Wand2, X, AlertTriangle, Sparkles } from 'lucide-react';
import { 
  VariationGroup, 
  GeneratedVariant, 
  generateVariants, 
  calculateVariantCount, 
  validateVariationGroups,
  VARIATION_PRESETS,
  generateVariantName,
  parseVariationTheme,
  extractVariationGroupsFromCatalog,
} from '@/lib/variant-generator';
import type { CatalogVariant } from '@/lib/amazon-catalog-mock';

interface VariationThemeBuilderProps {
  baseSku: string;
  basePrice: number;
  onGenerate: (variants: GeneratedVariant[]) => void;
  existingVariantCount?: number;
  catalogVariationTheme?: string;
  catalogVariants?: CatalogVariant[];
}

export function VariationThemeBuilder({ 
  baseSku, 
  basePrice, 
  onGenerate,
  existingVariantCount = 0,
  catalogVariationTheme,
  catalogVariants,
}: VariationThemeBuilderProps) {
  const [groups, setGroups] = useState<VariationGroup[]>([
    { name: '', values: [] },
  ]);
  const [newValueInputs, setNewValueInputs] = useState<Record<number, string>>({});
  const [isFromCatalog, setIsFromCatalog] = useState(false);

  // Auto-populate from catalog data on mount
  useEffect(() => {
    if (catalogVariationTheme && catalogVariants && catalogVariants.length > 0) {
      const extractedGroups = extractVariationGroupsFromCatalog(catalogVariationTheme, catalogVariants);
      if (extractedGroups.length > 0) {
        setGroups(extractedGroups);
        setIsFromCatalog(true);
      }
    }
  }, [catalogVariationTheme, catalogVariants]);

  const addGroup = () => {
    setGroups([...groups, { name: '', values: [] }]);
  };

  const removeGroup = (index: number) => {
    setGroups(groups.filter((_, i) => i !== index));
    // Clean up new value input state
    const newInputs = { ...newValueInputs };
    delete newInputs[index];
    setNewValueInputs(newInputs);
  };

  const updateGroupName = (index: number, name: string) => {
    const updated = [...groups];
    updated[index] = { ...updated[index], name };
    setGroups(updated);
  };

  const addValue = (groupIndex: number, value: string) => {
    if (!value.trim()) return;
    
    const updated = [...groups];
    const currentValues = updated[groupIndex].values;
    
    // Prevent duplicates (case-insensitive)
    if (currentValues.some(v => v.toLowerCase() === value.trim().toLowerCase())) {
      return;
    }
    
    updated[groupIndex] = {
      ...updated[groupIndex],
      values: [...currentValues, value.trim()],
    };
    setGroups(updated);
    
    // Clear input
    setNewValueInputs({ ...newValueInputs, [groupIndex]: '' });
  };

  const removeValue = (groupIndex: number, valueIndex: number) => {
    const updated = [...groups];
    updated[groupIndex] = {
      ...updated[groupIndex],
      values: updated[groupIndex].values.filter((_, i) => i !== valueIndex),
    };
    setGroups(updated);
  };

  const handleKeyPress = (e: React.KeyboardEvent, groupIndex: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addValue(groupIndex, newValueInputs[groupIndex] || '');
    }
  };

  const applyPreset = (presetName: string) => {
    const preset = VARIATION_PRESETS.find(p => p.name === presetName);
    if (preset) {
      setGroups(JSON.parse(JSON.stringify(preset.groups))); // Deep copy
      setNewValueInputs({});
    }
  };

  const handleGenerate = () => {
    const variants = generateVariants({
      baseSku: baseSku || 'SKU',
      basePrice,
      groups,
    });
    onGenerate(variants);
  };

  const validation = validateVariationGroups(groups);
  const variantCount = calculateVariantCount(groups);
  const hasValidGroups = groups.some(g => g.name.trim() && g.values.length > 0);

  // Generate preview of first few variants
  const previewVariants = hasValidGroups 
    ? generateVariants({ baseSku: baseSku || 'SKU', basePrice, groups }).slice(0, 6)
    : [];

  return (
    <Card className={isFromCatalog ? "border-primary/30" : "border-dashed"}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Wand2 className="size-4" />
              Variation Theme Builder
              {isFromCatalog && (
                <Badge variant="secondary" className="gap-1 bg-primary/10 text-primary">
                  <Sparkles className="size-3" />
                  Suggested from catalog
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              {isFromCatalog 
                ? `Theme "${catalogVariationTheme}" with values extracted from catalog`
                : 'Define variation groups to auto-generate all SKU combinations'
              }
            </CardDescription>
          </div>
          <Select onValueChange={applyPreset}>
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <SelectValue placeholder="Quick presets..." />
            </SelectTrigger>
            <SelectContent>
              {VARIATION_PRESETS.map(preset => (
                <SelectItem key={preset.name} value={preset.name} className="text-xs">
                  {preset.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {/* Variation Groups */}
        <div className="flex flex-col gap-3">
          {groups.map((group, groupIndex) => (
            <div key={groupIndex} className="flex p-3 border rounded-lg bg-muted/30 flex-col gap-2">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Group name (e.g., Color, Size)"
                  value={group.name}
                  onChange={(e) => updateGroupName(groupIndex, e.target.value)}
                  className="h-8 text-sm flex-1"
                />
                {groups.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 flex-shrink-0"
                    onClick={() => removeGroup(groupIndex)}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                )}
              </div>
              
              {/* Values */}
              <div className="flex flex-wrap gap-1.5">
                {group.values.map((value, valueIndex) => (
                  <Badge 
                    key={valueIndex} 
                    variant="secondary" 
                    className="text-xs gap-1 pr-1"
                  >
                    {value}
                    <button
                      type="button"
                      onClick={() => removeValue(groupIndex, valueIndex)}
                      className="ml-0.5 hover:bg-destructive/20 rounded-full p-0.5"
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
                <div className="flex items-center gap-1">
                  <Input
                    placeholder="Add value..."
                    value={newValueInputs[groupIndex] || ''}
                    onChange={(e) => setNewValueInputs({ ...newValueInputs, [groupIndex]: e.target.value })}
                    onKeyDown={(e) => handleKeyPress(e, groupIndex)}
                    className="h-6 w-24 text-xs"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-6"
                    onClick={() => addValue(groupIndex, newValueInputs[groupIndex] || '')}
                  >
                    <Plus className="size-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          onClick={addGroup}
        >
          <Plus className="size-4 mr-2" />
          Add Variation Group
        </Button>

        {/* Preview */}
        {hasValidGroups && (
          <div className="flex pt-2 border-t flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                Preview: {variantCount} variant{variantCount !== 1 ? 's' : ''} will be generated
              </span>
              {variantCount > 50 && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="size-3" />
                  Large number of variants
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
              {previewVariants.map((variant, idx) => (
                <Badge key={idx} variant="outline" className="text-xs font-mono">
                  {generateVariantName(variant.attributes)}
                </Badge>
              ))}
              {variantCount > 6 && (
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  +{variantCount - 6} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Validation Errors */}
        {!validation.valid && groups.some(g => g.name.trim()) && (
          <div className="flex text-xs text-destructive flex-col gap-1">
            {validation.errors.map((error, idx) => (
              <p key={idx}>• {error}</p>
            ))}
          </div>
        )}

        {/* Generate Button */}
        <Button
          type="button"
          onClick={handleGenerate}
          disabled={!hasValidGroups || !validation.valid}
          className="w-full"
        >
          <Wand2 className="size-4 mr-2" />
          Generate {variantCount} Variant{variantCount !== 1 ? 's' : ''}
          {existingVariantCount > 0 && (
            <span className="ml-1 text-xs opacity-70">(replaces existing)</span>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
