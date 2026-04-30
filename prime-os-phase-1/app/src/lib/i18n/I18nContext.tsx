import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, type Dispatch } from 'react';
import { DEFAULT_LOCALE, type Locale, type Dictionary, dictionaries, isSupportedLocale } from './dictionaries';

// eslint-disable-next-line no-unused-vars
type Translate = (key: string) => string;

interface I18nContextType {
    locale: Locale;
    setLocale: Dispatch<Locale>;
    // A helper to traverse the dictionary with dot-notation e.g. t('sidebar.dashboardGroup')
    t: Translate;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

function readStoredLocale(): Locale {
    try {
        if (typeof localStorage === 'undefined') {
            return DEFAULT_LOCALE;
        }

        const stored = localStorage.getItem('ech.locale');
        return isSupportedLocale(stored) ? stored : DEFAULT_LOCALE;
    } catch {
        return DEFAULT_LOCALE;
    }
}

function resolveTranslation(dict: Dictionary, key: string): string | undefined {
    const keys = key.split('.');
    let current: unknown = dict;

    for (const k of keys) {
        if (typeof current !== 'object' || current === null || !(k in current)) {
            return undefined;
        }

        current = (current as Record<string, unknown>)[k];
    }

    return typeof current === 'string' ? current : undefined;
}

export const I18nProvider = ({ children }: { children: ReactNode }) => {
    const [locale, setLocaleState] = useState<Locale>(readStoredLocale);

    useEffect(() => {
        setLocaleState(readStoredLocale());
    }, []);

    const setLocale = useCallback((l: Locale) => {
        setLocaleState(l);
        try {
            localStorage.setItem('ech.locale', l);
        } catch {
            // ignores localStorage errors
        }
    }, []);

    const t = useCallback((key: string): string => {
        const localized = resolveTranslation(dictionaries[locale], key);

        if (localized !== undefined) {
            return localized;
        }

        const fallback = resolveTranslation(dictionaries[DEFAULT_LOCALE], key);

        if (fallback !== undefined) {
            console.warn(`Translation missing for key: "${key}" in locale: "${locale}". Falling back to ${DEFAULT_LOCALE}.`);
            return fallback;
        }

        console.warn(`Translation missing for key: "${key}" in locale: "${locale}" and fallback locale: "${DEFAULT_LOCALE}".`);
        return key;
    }, [locale]);

    return (
        <I18nContext.Provider value={{ locale, setLocale, t }}>
            {children}
        </I18nContext.Provider>
    );
};

export const useI18n = () => {
    const context = useContext(I18nContext);
    if (context === undefined) {
        throw new Error('useI18n must be used within an I18nProvider');
    }
    return context;
};
