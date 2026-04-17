import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ClipboardList } from 'lucide-react';
import type { ReturnItem } from '@/lib/partner-types';

interface QCDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ReturnItem;
  onSubmit: (data: { grade: string; outcome: 'pass' | 'fail'; notes?: string }) => Promise<void>;
  isLoading?: boolean;
}

const GRADES = [
  { value: 'A', label: 'A — Like New', className: 'bg-green-100 border-green-300 text-green-700' },
  { value: 'B', label: 'B — Good', className: 'bg-blue-100 border-blue-300 text-blue-700' },
  { value: 'C', label: 'C — Fair', className: 'bg-yellow-100 border-yellow-300 text-yellow-700' },
  { value: 'D', label: 'D — Poor', className: 'bg-red-100 border-red-300 text-red-700' },
];

export function QCDialog({ open, onOpenChange, item, onSubmit, isLoading }: QCDialogProps) {
  const [grade, setGrade] = useState('A');
  const [outcome, setOutcome] = useState<'pass' | 'fail'>('pass');
  const [notes, setNotes] = useState('');

  function handleSubmit() {
    onSubmit({ grade, outcome, notes: notes || undefined });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="size-4" />
            Quality Check — {item.sku_code ?? 'Item'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Grade</Label>
            <div className="grid grid-cols-2 gap-2">
              {GRADES.map(g => (
                <button
                  key={g.value}
                  type="button"
                  onClick={() => setGrade(g.value)}
                  className={`py-2.5 rounded-md border text-sm font-medium transition-colors ${
                    grade === g.value
                      ? `${g.className} border-2`
                      : 'border-input bg-background text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>QC Result *</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setOutcome('pass')}
                className={`py-2.5 rounded-md border text-sm font-medium transition-colors ${
                  outcome === 'pass'
                    ? 'bg-green-100 border-green-300 text-green-700'
                    : 'border-input bg-background text-muted-foreground hover:bg-muted'
                }`}
              >
                ✅ Pass
              </button>
              <button
                type="button"
                onClick={() => setOutcome('fail')}
                className={`py-2.5 rounded-md border text-sm font-medium transition-colors ${
                  outcome === 'fail'
                    ? 'bg-red-100 border-red-300 text-red-700'
                    : 'border-input bg-background text-muted-foreground hover:bg-muted'
                }`}
              >
                ❌ Fail
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Notes (optional)</Label>
            <Input
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Add any notes about the item condition..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save QC Result'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
