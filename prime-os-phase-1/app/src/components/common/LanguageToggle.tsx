import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n/I18nContext';
import { SUPPORTED_LOCALES, type Locale } from '@/lib/i18n/dictionaries';

export interface LanguageToggleProps {
    className?: string;
}

const LANGUAGES: { code: string; flag: string; label: string }[] = [
    { code: 'en-US', flag: '🇺🇸', label: 'English (US)' },
    { code: 'ja-JP', flag: '🇯🇵', label: '日本語' },
    { code: 'vi-VN', flag: '🇻🇳', label: 'Tiếng Việt' },
].filter((language) => SUPPORTED_LOCALES.includes(language.code as Locale));

export function LanguageToggle({ className }: LanguageToggleProps) {
    const { locale, setLocale, t } = useI18n();

    return (
        <div
            role="radiogroup"
            aria-label={t('settings.languageTitle')}
            className={cn(
                "inline-flex items-center gap-1 rounded-full border border-edge-divider/80 bg-surface-toolbar/78 p-1 shadow-control backdrop-blur-glass",
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
                        aria-label={lang.label}
                        onClick={() => setLocale(lang.code as Locale)}
                        className={cn(
                            "relative flex h-8 w-10 items-center justify-center rounded-full text-base outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                            isActive
                                ? "border border-primary/20 bg-primary/90 text-white shadow-control"
                                : "text-muted-foreground hover:bg-surface-hover/70 hover:text-foreground",
                        )}
                        title={lang.label}
                    >
                        {lang.flag}
                    </button>
                );
            })}
        </div>
    );
}
