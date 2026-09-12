import { useId } from 'react';
import { cn } from '@/lib/utils';

export function ChannelLogo({ channel, size = 'md', muted = false }: { channel: { key: string; label?: string }; size?: 'sm' | 'md' | 'lg'; muted?: boolean }) {
  const gradientId = useId();
  const logo = (() => {
    switch (channel.key) {
      case 'primeweb':
        return <svg viewBox="0 0 48 48" className="size-full"><rect width="48" height="48" rx="12" fill="#EEF2FF" /><circle cx="24" cy="24" r="14" fill="none" stroke="#4F46E5" strokeWidth="3" /><path d="M10 24h28M24 10c5 5 7 9 7 14s-2 9-7 14c-5-5-7-9-7-14s2-9 7-14Z" fill="none" stroke="#4F46E5" strokeWidth="2.5" /></svg>;
      case 'pos':
        return <svg viewBox="0 0 48 48" className="size-full"><rect width="48" height="48" rx="12" fill="#ECFEFF" /><path d="M12 20h24l-2.5-8h-19L12 20Z" fill="#0891B2" /><path d="M14 22v13h20V22M19 35v-8h10v8" fill="none" stroke="#0891B2" strokeWidth="3" strokeLinejoin="round" /></svg>;
      case 'shopee':
        return <svg viewBox="0 0 48 48" className="size-full"><path d="M10 16h28l-2 27H12l-2-27Z" fill="#EE4D2D" /><path d="M17 17v-4a7 7 0 0 1 14 0v4" fill="none" stroke="#EE4D2D" strokeWidth="3" /><path d="M29.5 23.5c-1.4-1.1-3-1.7-5.2-1.7-3 0-5 1.5-5 3.8 0 5.5 10.2 2.1 10.2 7.4 0 2.3-2.1 4-5.4 4-2.2 0-4.1-.7-5.6-2" fill="none" stroke="white" strokeWidth="2.6" strokeLinecap="round" /></svg>;
      case 'lazada':
        return <svg viewBox="0 0 48 48" className="size-full"><defs><linearGradient id={gradientId} x1="8" y1="8" x2="40" y2="40"><stop stopColor="#F97316" /><stop offset=".5" stopColor="#EC4899" /><stop offset="1" stopColor="#4F46E5" /></linearGradient></defs><path d="M24 5 42 15v18L24 43 6 33V15L24 5Z" fill={`url(#${gradientId})`} /><path d="M15 19.5c0-4.6 5.7-6.5 9-2.8 3.3-3.7 9-1.8 9 2.8 0 5-5.4 8.7-9 11.8-3.6-3.1-9-6.8-9-11.8Z" fill="white" /></svg>;
      case 'amazon':
        return <svg viewBox="0 0 48 48" className="size-full"><rect width="48" height="48" rx="12" fill="#111827" /><path d="M27.7 27.1c-2 1.5-3.8 2.3-5.8 2.3-2.7 0-4.5-1.7-4.5-4.3 0-2 .9-3.5 2.6-4.4 1.5-.8 3.7-1.2 7.5-1.6v-1c0-2-1-2.8-3.1-2.8-1.8 0-3.1.7-3.6 2.2l-2.7-.3c.5-2.7 2.7-4.3 6.6-4.3 2.2 0 4 .6 4.9 1.7.7.8.9 1.8.9 3.6v6.4c0 1.4.2 1.7 1.2 1.7h.5v2.4c-.6.2-1.1.2-1.7.2-1.6 0-2.4-.5-2.8-1.8Zm-.2-5.8c-4.9.4-7 1.4-7 3.7 0 1.3.9 2.1 2.4 2.1 1.6 0 3.3-.7 4.6-2v-3.8Z" fill="white" /><path d="M13 34c7.5 4.3 15.7 4.7 23.5.6" fill="none" stroke="#FF9900" strokeWidth="2.6" strokeLinecap="round" /></svg>;
      case 'rakuten':
        return <svg viewBox="0 0 48 48" className="size-full"><rect width="48" height="48" rx="12" fill="#FFF1F2" /><path d="M15 10h10.5c7 0 10.5 3.2 10.5 8.3 0 3.8-2.1 6.5-6.1 7.6L37 36h-7.4l-6.1-9.1h-2.2V36H15V10Zm6.3 5.2v6.5h3.8c3 0 4.5-1.1 4.5-3.3 0-2.1-1.5-3.2-4.5-3.2h-3.8Z" fill="#BF0000" /><path d="M11 40h27" stroke="#BF0000" strokeWidth="3" /></svg>;
      case 'tiktok':
        return <svg viewBox="0 0 48 48" className="size-full"><rect width="48" height="48" rx="12" fill="#111827"/><path d="M28 10v21a8 8 0 1 1-7-8" fill="none" stroke="#25F4EE" strokeWidth="5" transform="translate(-1 1)"/><path d="M28 10c0 7 5 10 10 10M28 10v21a8 8 0 1 1-7-8" fill="none" stroke="#FE2C55" strokeWidth="5" transform="translate(1 0)"/><path d="M28 10c0 7 5 10 10 10M28 10v21a8 8 0 1 1-7-8" fill="none" stroke="white" strokeWidth="3"/></svg>;
      default:
        return <span className="text-xs font-semibold text-slate-600">{(channel.label || channel.key).slice(0, 2).toUpperCase()}</span>;
    }
  })();
  return <span className={cn('inline-flex shrink-0 items-center justify-center overflow-hidden rounded-md bg-white', size === 'sm' ? 'size-6' : size === 'lg' ? 'size-9' : 'size-7', muted && 'grayscale opacity-35')} aria-hidden="true">{logo}</span>;
}
