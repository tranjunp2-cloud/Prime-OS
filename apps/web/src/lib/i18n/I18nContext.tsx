import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback, type Dispatch } from 'react';
import { DEFAULT_LOCALE, type Locale, type Dictionary, dictionaries } from './dictionaries';

// eslint-disable-next-line no-unused-vars
type Translate = (key: string) => string;

interface I18nContextType {
    locale: Locale;
    setLocale: Dispatch<Locale>;
    // A helper to traverse the dictionary with dot-notation e.g. t('sidebar.dashboardGroup')
    t: Translate;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

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
    const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

    useEffect(() => {
        document.documentElement.lang = 'en';
        try {
            localStorage.removeItem('ech.locale');
        } catch {
            // Local storage can be unavailable in privacy-restricted browsers.
        }
    }, []);

    const setLocale = useCallback((nextLocale: Locale) => {
        setLocaleState(nextLocale);
        document.documentElement.lang = nextLocale.split('-')[0];
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
