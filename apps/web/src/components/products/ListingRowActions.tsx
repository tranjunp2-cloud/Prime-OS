import type { MouseEvent } from 'react';
import { History, MoreHorizontal, Unlink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export function ListingRowActions({ label, canWrite, onManage, onActivity, onUnlink }: {
  label: string; canWrite: boolean; onManage: (event: MouseEvent<HTMLButtonElement>) => void;
  onActivity: () => void; onUnlink: () => void;
}) {
  return <>
    <Button type="button" variant="outline" size="sm" className="h-11 w-28 shrink-0" onClick={onManage}>{canWrite ? 'Manage listing' : 'View listing'}</Button>
    <DropdownMenu><DropdownMenuTrigger asChild><Button type="button" variant="ghost" size="icon" className="size-11 shrink-0" aria-label={`More actions for ${label}`}><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56"><DropdownMenuLabel>Listing actions</DropdownMenuLabel><DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onActivity}><History className="size-4" />View activity</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={!canWrite} className="text-destructive focus:bg-destructive/10 focus:text-destructive" onSelect={onUnlink}><Unlink className="size-4" />Unlink from Master</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </>;
}
