import { useId, useRef, useState } from 'react';
import { ChevronDown, Globe2, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { SellerDemo } from './demo-state';

// Match the countries offered by the prototype's warehouse setup.
const markets = [
  { code: 'VN', name: 'Vietnam' },
  { code: 'SG', name: 'Singapore' },
  { code: 'JP', name: 'Japan' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'TH', name: 'Thailand' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'PH', name: 'Philippines' },
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'AU', name: 'Australia' },
];

export function SellerMarketFields({ data, update }: {
  data: SellerDemo;
  update: (patch: Partial<SellerDemo>) => void;
}) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const search = query.trim().toLowerCase();
  const options = markets.filter(market => `${market.name} ${market.code}`.toLowerCase().includes(search));
  const changeOpen = (value: boolean) => { setOpen(value); if (!value) setQuery(''); };
  const toggle = (market: string) => {
    if (market === data.market) return;
    update({ additionalMarkets: data.additionalMarkets.includes(market)
      ? data.additionalMarkets.filter(value => value !== market)
      : [...data.additionalMarkets, market] });
  };

  return <section className="seller-field-section" aria-label="Selling markets">
    <div className="seller-field">
      <label htmlFor={`${id}-primary`}>Primary market</label>
      <div className="seller-select-wrap">
        <select id={`${id}-primary`} className="seller-input" value={data.market} aria-describedby={`${id}-primary-hint`}
          onChange={event => update({ market: event.target.value, additionalMarkets: data.additionalMarkets.filter(value => value !== event.target.value) })}>
          {markets.map(market => <option key={market.code} value={market.name}>{market.name}</option>)}
        </select>
        <ChevronDown aria-hidden="true" />
      </div>
      <p id={`${id}-primary-hint`} className="seller-field-hint">Choose your main selling market. Add other countries or regions where you sell, now or later.</p>
    </div>

    <div className="seller-field">
      <label id={`${id}-additional-label`} htmlFor={`${id}-additional`} className="seller-market-label">Additional markets <span className="seller-optional" aria-hidden="true">Optional</span></label>
      <Popover open={open} onOpenChange={changeOpen}>
        <PopoverTrigger asChild>
          <button ref={trigger} id={`${id}-additional`} type="button" className="seller-input seller-market-trigger" aria-labelledby={`${id}-additional-label`} aria-describedby={`${id}-additional-hint`}>
            <Globe2 aria-hidden="true" />
            <span>{data.additionalMarkets.length ? 'Add or remove markets' : 'Choose countries or regions'}</span>
            <ChevronDown aria-hidden="true" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="seller-market-popover" aria-label="Choose additional markets" collisionPadding={16}>
          <div className="seller-market-search">
            <Search aria-hidden="true" />
            <Input aria-label="Search markets" placeholder="Search countries or regions" value={query} onChange={event => setQuery(event.target.value)} />
          </div>
          <div className="seller-market-options" role="group" aria-label="Available markets">
            {options.length ? options.map(market => {
              const primary = market.name === data.market;
              const selected = data.additionalMarkets.includes(market.name);
              return <label key={market.code} className="seller-market-option" data-selected={selected} data-primary={primary}>
                <input type="checkbox" aria-label={market.name} checked={primary || selected} disabled={primary} onChange={() => toggle(market.name)} />
                <span>{market.name}</span>
                {primary && <small>Primary market</small>}
              </label>;
            }) : <p className="seller-market-empty" role="status">No markets found. Try another country name.</p>}
          </div>
          <div className="seller-market-actions">
            <span role="status">{data.additionalMarkets.length} additional {data.additionalMarkets.length === 1 ? 'market' : 'markets'} selected</span>
            <Button type="button" variant="outline" className="min-h-11" onClick={() => changeOpen(false)}>Done</Button>
          </div>
        </PopoverContent>
      </Popover>
      {data.additionalMarkets.length > 0 && <ul className="seller-market-tags" aria-label="Selected additional markets">
        {data.additionalMarkets.map(market => <li key={market}>
          <span>{market}</span>
          <button type="button" aria-label={`Remove ${market}`} onClick={() => { toggle(market); trigger.current?.focus(); }}><X aria-hidden="true" /></button>
        </li>)}
      </ul>}
      <p id={`${id}-additional-hint`} className="seller-field-hint">Optional. {data.market} is already included as your primary market. These choices help tailor your setup; connect stores separately when you’re ready.</p>
    </div>
  </section>;
}
