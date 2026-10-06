import type { ReactNode } from 'react';
import { ChannelLogo } from '@/components/channels/ChannelLogo';
import styles from './ProductChannelListings.module.css';

export interface ProductChannelListingRow {
  id: string;
  channelKey: string;
  channelLabel: string;
  shop: string;
  sku: string;
  context?: ReactNode;
  price: ReactNode;
  stock: ReactNode;
  status: ReactNode;
  actions: ReactNode;
  newlyLinked?: boolean;
}

export function ProductChannelListings({ rows }: { rows: ProductChannelListingRow[] }) {
  return <div className={styles.root}>
    <table role="table" className={styles.table} aria-label="Channel listings">
      <colgroup><col /><col className={styles.priceColumn} /><col className={styles.stockColumn} /><col className={styles.statusColumn} /><col className={styles.actionsColumn} /></colgroup>
      <thead role="rowgroup"><tr role="row">
        <th scope="col">Shop listing</th><th scope="col">Listing price</th><th scope="col">Shop stock</th><th scope="col">Master data sync</th><th scope="col" className="text-right">Actions</th>
      </tr></thead>
      <tbody role="rowgroup">{rows.map(row => <tr role="row" key={row.id} data-newly-linked={row.newlyLinked || undefined}>
        <td role="cell" className={styles.identity}>
          <div className="flex items-start gap-2.5">
            <ChannelLogo channel={{ key: row.channelKey === 'webstore' ? 'primeweb' : row.channelKey, label: row.channelLabel }} size="sm" />
            <div className="min-w-0"><p className="break-words text-sm font-semibold">{row.shop}{' '}<span className="ml-1 text-xs font-normal text-muted-foreground">{row.channelLabel}</span>{row.newlyLinked && <span className="sr-only"> · Newly linked</span>}</p><p className="mt-1 break-all text-xs text-muted-foreground">SKU: <span className="font-mono">{row.sku}</span></p>{row.context && <div className="mt-1 text-xs text-muted-foreground">{row.context}</div>}</div>
          </div>
        </td>
        <td role="cell"><span className={styles.mobileLabel}>Listing price</span>{row.price}</td>
        <td role="cell"><span className={styles.mobileLabel}>Shop stock</span>{row.stock}</td>
        <td role="cell" className={styles.status}><span className={styles.mobileLabel}>Master data sync</span>{row.status}</td>
        <td role="cell" className={styles.actions}><div className="flex items-center justify-end gap-2">{row.actions}</div></td>
      </tr>)}</tbody>
    </table>
  </div>;
}
