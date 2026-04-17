import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { type Locale, type Dictionary, dictionaries } from './dictionaries';

interface I18nContextType {
    locale: Locale;
    setLocale: (l: Locale) => void;
    // A helper to traverse the dictionary with dot-notation e.g. t('sidebar.dashboardGroup')
    t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider = ({ children }: { children: ReactNode }) => {
    const [locale, setLocaleState] = useState<Locale>('en-US');

    useEffect(() => {
        try {
            const stored = localStorage.getItem('ech.locale') as Locale;
            if (stored && dictionaries[stored]) {
                setLocaleState(stored);
            }
        } catch (e) {
            // ignores localStorage errors
        }
    }, []);

    const setLocale = useCallback((l: Locale) => {
        setLocaleState(l);
        try {
            localStorage.setItem('ech.locale', l);
        } catch (e) {
            // ignores localStorage errors
        }
    }, []);

    const t = useCallback((key: string): string => {
        const dict = dictionaries[locale] || dictionaries['en-US'];
        const keys = key.split('.');

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let current: any = dict;
        for (const k of keys) {
            if (current[k] === undefined) {
                console.warn(`Translation missing for key: "${key}" in locale: "${locale}"`);
                return key; // Fallback to returning the key if missing
            }
            current = current[k];
        }

        return current as string;
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
