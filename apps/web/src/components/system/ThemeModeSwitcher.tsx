import { Moon, Sun } from 'lucide-react';
import { useTheme, type Theme } from '@/components/theme-provider';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import ThemeSwitch from '@/components/ui/theme-switch';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n/I18nContext';
import { formatMessage } from '@/lib/i18n/format';

interface ThemeModeSwitcherProps {
  compact?: boolean;
  className?: string;
}

const THEME_OPTIONS: Array<{
  value: Theme;
  icon: typeof Sun;
}> = [
  { value: 'light', icon: Sun },
  { value: 'dark', icon: Moon },
];

export function ThemeModeSwitcher({ compact = false, className }: ThemeModeSwitcherProps) {
  const { theme, setTheme } = useTheme();
  const { t } = useI18n();
  const themeLabels = {
    light: t('sidebar.lightMode'),
    dark: t('sidebar.darkMode'),
  } as const;

  if (compact) {
    return (
      <ThemeSwitch className={className} />
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="space-y-0.5">
        <p className="text-sm font-medium text-foreground">{t('settings.appearanceTitle')}</p>
        <p className="text-xs text-muted-foreground">
          {formatMessage(t('settings.currentTheme'), {
            theme: themeLabels[theme].toLowerCase(),
          })}
        </p>
      </div>

      <ToggleGroup
        type="single"
        value={theme}
        onValueChange={(value) => {
          if (!value) return;
          setTheme(value as Theme);
        }}
        variant="outline"
        size={compact ? 'sm' : 'default'}
        className={cn(
          'w-full rounded-xl border border-border/70 bg-background/80 p-1',
          compact ? 'justify-start' : 'justify-between',
        )}
        aria-label={t('settings.appearanceTitle')}
      >
        {THEME_OPTIONS.map(({ value, icon: Icon }) => (
          <ToggleGroupItem
            key={value}
            value={value}
            aria-label={themeLabels[value]}
            className={cn(
              'gap-2 rounded-lg data-[state=on]:bg-primary/12 data-[state=on]:text-primary',
              compact ? 'h-8 flex-1 px-2' : 'h-10 flex-1 px-3',
            )}
          >
            <Icon className="size-4" />
            <span className={cn('truncate', compact ? 'text-[11px]' : 'text-xs')}>{themeLabels[value]}</span>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}
