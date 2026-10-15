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
          <div className={styles.identityContent}>
            <ChannelLogo channel={{ key: row.channelKey === 'webstore' ? 'primeweb' : row.channelKey, label: row.channelLabel }} size="sm" />
            <div className="min-w-0"><p className={styles.shop}>{row.shop}{' '}<span className={styles.channel}>{row.channelLabel}</span>{row.newlyLinked && <span className="sr-only"> · Newly linked</span>}</p><p className={styles.sku}>SKU: <span className="font-mono">{row.sku}</span></p>{row.context && <div className={styles.context}>{row.context}</div>}</div>
          </div>
        </td>
        <td role="cell" className={styles.price}><span className={styles.mobileLabel} aria-hidden="true">Listing price</span>{row.price}</td>
        <td role="cell" className={styles.stock}><span className={styles.mobileLabel} aria-hidden="true">Shop stock</span>{row.stock}</td>
        <td role="cell" className={styles.status}><span className={styles.mobileLabel} aria-hidden="true">Master data sync</span>{row.status}</td>
        <td role="cell" className={styles.actions}><div className={styles.actionsInner}>{row.actions}</div></td>
      </tr>)}</tbody>
    </table>
  </div>;
}
