import { useState } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import type { CatalogImportItem } from '@/lib/catalog-import-store';
import type { confirmListingIntake } from '@/lib/product-listing-intake';
import { ListingMasterReview } from './ListingMasterReview';

type Props = {
  listing: CatalogImportItem;
  hasUnsavedMasterChanges: boolean;
  onClose: () => void;
  restoreFocus: () => void;
  onSaved: (result: ReturnType<typeof confirmListingIntake>, created: boolean) => void;
};

/** A contextual review of one existing relationship, separate from the import inbox. */
export function ListingMappingReviewDialog({ listing, hasUnsavedMasterChanges, onClose, restoreFocus, onSaved }: Props) {
  const [dirty, setDirty] = useState(false);
  const [discard, setDiscard] = useState(false);
  return <>
    <Sheet open onOpenChange={open => { if (!open) { if (dirty) setDiscard(true); else onClose(); } }}>
      <SheetContent className="flex w-full flex-col p-0 sm:max-w-[min(1120px,94vw)] motion-reduce:animate-none motion-reduce:transition-none" onCloseAutoFocus={event => { event.preventDefault(); restoreFocus(); }}>
        <SheetHeader className="shrink-0 border-b px-6 py-5 pr-14 text-left">
          <SheetTitle>Review mapping</SheetTitle>
          <SheetDescription>{listing.storeName} · {listing.channelSku}. Confirm the current Master or move this listing to the correct one.</SheetDescription>
          {hasUnsavedMasterChanges && <p className="text-xs text-muted-foreground">Using saved Master data. Your unsaved Master edits stay in the editor.</p>}
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-hidden"><ListingMasterReview listings={[listing]} initialMode="existing" backLabel="Back to Channel listings" onBack={onClose} onDirtyChange={setDirty} onSaved={onSaved} /></div>
      </SheetContent>
    </Sheet>
    <AlertDialog open={discard} onOpenChange={setDiscard}>
      <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Discard unsaved details?</AlertDialogTitle><AlertDialogDescription>The current mapping and shop data have not changed. Close without saving these edits?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Keep editing</AlertDialogCancel><AlertDialogAction onClick={onClose}>Discard &amp; close</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
    </AlertDialog>
  </>;
}
