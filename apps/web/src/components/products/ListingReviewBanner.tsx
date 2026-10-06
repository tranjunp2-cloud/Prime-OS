import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChannelLogo } from '@/components/channels/ChannelLogo';
import type { CatalogImportItem } from '@/lib/catalog-import-store';
import styles from './ListingReviewBanner.module.css';

const channelNames: Record<CatalogImportItem['channel'], string> = { shopee: 'Shopee', lazada: 'Lazada', amazon: 'Amazon', website: 'PrimeWeb', pos: 'POS', tiktok: 'TikTok', social: 'Social', rakuten: 'Rakuten' };

export function ListingReviewBanner({ listings, onReview }: { listings: CatalogImportItem[]; onReview: () => void }) {
  if (!listings.length) return null;
  const sources = [...new Set(listings.map(listing => listing.channel))];
  return <section aria-label="Shop listings to review" className={styles.banner}>
    <div className={styles.sources} aria-hidden="true">
      {sources.slice(0, 3).map(channel => <span key={channel} className={styles.avatar}><ChannelLogo channel={{ key: channel, label: channelNames[channel] }} /></span>)}
    </div>
    <div className={styles.copy}>
      <p className="text-sm font-semibold text-foreground"><span className="tabular-nums">{listings.length}</span> shop listing{listings.length === 1 ? '' : 's'} to review</p>
      <span aria-hidden="true" className={styles.separator}>·</span>
      <p className="text-xs text-muted-foreground">{sources.map(channel => channelNames[channel]).join(', ')}</p>
    </div>
    <Button onClick={onReview} className={`${styles.cta} h-11`}>Review &amp; link ({listings.length})<ArrowRight aria-hidden="true" className="size-4" /></Button>
  </section>;
}
