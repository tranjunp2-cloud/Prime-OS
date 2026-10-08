import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export function DemoModeTabs() {
  const location = useLocation();
  const isActive = location.pathname === '/demo/no-data';
  return <nav aria-label="Onboarding" className="flex shrink-0 items-center text-sm font-medium">
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        {/* TooltipTrigger merges className, so pass resolved classes rather than NavLink's render callback. */}
        <NavLink to="/demo/no-data" state={{ returnTo: `${location.pathname}${location.search}` }} className={cn('inline-flex h-11 shrink-0 items-center justify-center whitespace-nowrap rounded-lg border px-3.5 text-sm font-medium leading-5 text-primary transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary', isActive && 'border-primary/30 bg-primary/5')}>Onboarding</NavLink>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-72 text-sm leading-5">Luồng hướng dẫn thiết lập dành cho người dùng lần đầu vào hệ thống: workspace, kênh bán, hồ sơ bán hàng, kho và danh mục sản phẩm.</TooltipContent>
    </Tooltip>
  </nav>;
}
