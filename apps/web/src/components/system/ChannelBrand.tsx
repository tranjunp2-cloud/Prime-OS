import { Globe2, Sparkles, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';

type ChannelBrand = 'amazon' | 'shopee' | 'rakuten' | 'website' | 'tiktok' | 'manual';

interface ChannelBrandProps {
  channel: string;
  className?: string;
}

function AmazonMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 44 16" aria-hidden="true" className={cn('h-3.5 w-auto', className)}>
      <text
        x="1.5"
        y="9.5"
        fill="currentColor"
        fontSize="8.5"
        fontWeight="800"
        fontFamily="ui-sans-serif, system-ui, -apple-system, sans-serif"
      >
        a
      </text>
      <path
        d="M6 11.1c5.5 3.4 18.1 3.4 27.8-.9"
        fill="none"
        stroke="#F59E0B"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path d="m32.7 8.6 2.5 1.4-2.9 1" fill="none" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AmazonWordmark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 76 18" aria-hidden="true" className={cn('h-4.5 w-auto', className)}>
      <text
        x="1"
        y="11.8"
        fill="currentColor"
        fontSize="12"
        fontWeight="800"
        letterSpacing="-0.3"
        fontFamily="ui-sans-serif, system-ui, -apple-system, sans-serif"
      >
        amazon
      </text>
      <path
        d="M12.5 14c9 3.8 30.5 3.7 47.4-1.2"
        fill="none"
        stroke="#F59E0B"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
      <path d="m58.6 10.4 4 2.2-4.7 1.8" fill="none" stroke="#F59E0B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ShopeeMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 18 18" aria-hidden="true" className={cn('h-3.5 w-3.5', className)}>
      <path
        d="M5.3 5.7V5a3.7 3.7 0 1 1 7.4 0v.7"
        fill="none"
        stroke="#EE4D2D"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <rect x="3.2" y="5.4" width="11.6" height="9.4" rx="2.2" fill="#EE4D2D" />
      <text
        x="9"
        y="12.1"
        textAnchor="middle"
        fill="#FFFFFF"
        fontSize="7"
        fontWeight="700"
        fontFamily="ui-sans-serif, system-ui, -apple-system, sans-serif"
      >
        S
      </text>
    </svg>
  );
}

function ShopeeWordmark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 80 18" aria-hidden="true" className={cn('h-4.5 w-auto', className)}>
      <g transform="translate(0 1)">
        <path
          d="M6 4.6v-.4a3.1 3.1 0 1 1 6.2 0v.4"
          fill="none"
          stroke="#EE4D2D"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <rect x="3.8" y="4.4" width="10.6" height="9" rx="2" fill="#EE4D2D" />
        <text
          x="9.1"
          y="10.8"
          textAnchor="middle"
          fill="#FFFFFF"
          fontSize="7"
          fontWeight="700"
          fontFamily="ui-sans-serif, system-ui, -apple-system, sans-serif"
        >
          S
        </text>
      </g>
      <text
        x="20"
        y="12"
        fill="#EE4D2D"
        fontSize="11.5"
        fontWeight="700"
        fontFamily="ui-sans-serif, system-ui, -apple-system, sans-serif"
      >
        Shopee
      </text>
    </svg>
  );
}

function RakutenMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 18 18" aria-hidden="true" className={cn('h-3.5 w-3.5', className)}>
      <text
        x="4"
        y="12.2"
        fill="#BF0000"
        fontSize="11.5"
        fontWeight="800"
        fontFamily="ui-sans-serif, system-ui, -apple-system, sans-serif"
      >
        R
      </text>
      <path d="M3 14.4h10.5" stroke="#BF0000" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function RakutenWordmark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 82 18" aria-hidden="true" className={cn('h-4.5 w-auto', className)}>
      <text
        x="1"
        y="12.1"
        fill="#BF0000"
        fontSize="12.5"
        fontWeight="800"
        fontFamily="ui-sans-serif, system-ui, -apple-system, sans-serif"
      >
        Rakuten
      </text>
      <path d="M2.4 14.2h52" stroke="#BF0000" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function GenericMark({
  channel,
  className,
}: {
  channel: ChannelBrand;
  className?: string;
}) {
  const iconClassName = cn('size-3.5', className);

  if (channel === 'website') return <Globe2 aria-hidden="true" className={iconClassName} />;
  if (channel === 'tiktok') return <Sparkles aria-hidden="true" className={iconClassName} />;
  return <Wrench aria-hidden="true" className={iconClassName} />;
}

function normalizeChannel(channel: string): ChannelBrand {
  if (channel === 'amazon' || channel === 'shopee' || channel === 'rakuten' || channel === 'website' || channel === 'tiktok') {
    return channel;
  }

  return 'manual';
}

export function ChannelMark({ channel, className }: ChannelBrandProps) {
  const normalized = normalizeChannel(channel);

  if (normalized === 'amazon') return <AmazonMark className={className} />;
  if (normalized === 'shopee') return <ShopeeMark className={className} />;
  if (normalized === 'rakuten') return <RakutenMark className={className} />;
  return <GenericMark channel={normalized} className={className} />;
}

export function ChannelWordmark({ channel, className }: ChannelBrandProps) {
  const normalized = normalizeChannel(channel);

  if (normalized === 'amazon') return <AmazonWordmark className={className} />;
  if (normalized === 'shopee') return <ShopeeWordmark className={className} />;
  if (normalized === 'rakuten') return <RakutenWordmark className={className} />;

  return (
    <div className={cn('inline-flex items-center gap-1.5 text-sm font-semibold text-foreground', className)}>
      <ChannelMark channel={normalized} />
      <span>{normalized === 'website' ? 'Website' : normalized === 'tiktok' ? 'TikTok' : 'Manual'}</span>
    </div>
  );
}
