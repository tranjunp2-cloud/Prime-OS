import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n/I18nContext';
import { getLocaleMeta, SUPPORTED_LOCALES, type Locale } from '@/lib/i18n/dictionaries';

export interface LanguageToggleProps {
    className?: string;
    compact?: boolean;
}

const LANGUAGES = SUPPORTED_LOCALES.map((code) => ({
    code,
    ...getLocaleMeta(code),
}));

export function LanguageToggle({ className, compact = false }: LanguageToggleProps) {
    const { locale, setLocale, t } = useI18n();

    return (
        <div
            role="radiogroup"
            aria-label={t('settings.languageTitle')}
            className={cn(
                "inline-flex items-center gap-1 rounded-md border border-border bg-card p-1 shadow-sm",
                className,
            )}
        >
            {LANGUAGES.map((lang) => {
                const isActive = locale === lang.code;
                return (
                    <button
                        key={lang.code}
                        role="radio"
                        aria-checked={isActive}
                        aria-label={lang.nativeName}
                        onClick={() => setLocale(lang.code as Locale)}
                        className={cn(
                            "relative flex h-8 min-w-10 cursor-pointer items-center justify-center rounded text-[11px] font-semibold tracking-[0.08em] outline-none transition-[background-color,border-color,color,box-shadow] duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                            compact && "h-7 min-w-8 text-[10px]",
                            isActive
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                        title={lang.nativeName}
                    >
                        {lang.shortLabel}
                    </button>
                );
            })}
        </div>
    );
}
