import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RotateCcw, Wrench, DollarSign, Trash2, XCircle } from 'lucide-react';
import type { ReturnItem, Disposition } from '@/lib/partner-types';

interface DispositionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ReturnItem;
  onSubmit: (data: { disposition: Disposition; reason?: string }) => Promise<void>;
  isLoading?: boolean;
}

const DISPOSITIONS: { value: Disposition; label: string; icon: React.ReactNode; description: string }[] = [
  { value: 'restock', label: 'Restock', icon: <RotateCcw className="size-4" />, description: 'Return to available inventory' },
  { value: 'refurbish', label: 'Refurbish', icon: <Wrench className="size-4" />, description: 'Send for repair/refurbishment' },
  { value: 'liquidation', label: 'Liquidation', icon: <DollarSign className="size-4" />, description: 'Sell at reduced price' },
  { value: 'unfulfillable', label: 'Unfulfillable', icon: <XCircle className="size-4" />, description: 'Cannot be resold' },
  { value: 'destroy', label: 'Destroy', icon: <Trash2 className="size-4" />, description: 'Dispose of the item' },
];

export function DispositionDialog({ open, onOpenChange, item, onSubmit, isLoading }: DispositionDialogProps) {
  const [disposition, setDisposition] = useState<Disposition>('restock');
  const [reason, setReason] = useState('');

  function handleSubmit() {
    onSubmit({ disposition, reason: reason || undefined });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Apply Disposition — {item.sku_code ?? 'Item'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Disposition *</Label>
            <div className="flex flex-col gap-2">
              {DISPOSITIONS.map(d => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => setDisposition(d.value)}
                  className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                    disposition === d.value
                      ? 'border-primary bg-primary/5'
                      : 'border-input bg-background hover:bg-muted'
                  }`}
                >
                  <div className={`size-8 rounded-full flex items-center justify-center ${
                    disposition === d.value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}>
                    {d.icon}
                  </div>
                  <div>
                    <div className={`text-sm font-medium ${disposition === d.value ? 'text-primary' : ''}`}>{d.label}</div>
                    <div className="text-xs text-muted-foreground">{d.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Reason / Notes (optional)</Label>
            <Input
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Why was this disposition chosen?"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading}
            variant={disposition === 'restock' ? 'default' : 'outline'}
          >
            {isLoading ? 'Processing...' : `Apply ${disposition.charAt(0).toUpperCase() + disposition.slice(1)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
