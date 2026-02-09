import React, {createContext, useContext, useEffect, useState} from 'react';

interface I18nContextType {
    t: (key: string, variables?: any[], hint?: string, defaultValue?: string) => string;
    isInitialized: boolean;
    locale: string;
}

const I18nContext = createContext<I18nContextType>({
    t: (key) => key,
    isInitialized: false,
    locale: 'en'
});

interface I18nProviderProps {
    children: React.ReactNode;
    fallbackLocale?: string;
}

export const I18nProvider: React.FC<I18nProviderProps> = ({
                                                              children,
                                                              fallbackLocale = 'en'
                                                          }) => {
    const [isInitialized, setIsInitialized] = useState(false);
    const [locale, setLocale] = useState(fallbackLocale);

    useEffect(() => {
        if (typeof window !== 'undefined' && window.Granite?.I18n) {
            const currentLocale = document.documentElement.lang || fallbackLocale;
            window.Granite.I18n.setLocale(currentLocale);
            setLocale(currentLocale);
            setIsInitialized(true);
        }
    }, [fallbackLocale]);

    const t = (key: string, variables: any[] = [], hint: string = '', defaultValue?: string): string => {

      if (!isInitialized || !window.Granite?.I18n) {
            return defaultValue ?? key; // fallback to key if not initialized
        }
      const text = window.Granite.I18n.get(key, variables, hint);
      return text === key && defaultValue ? defaultValue : text;
    };

    return (
        <I18nContext.Provider value={{t, isInitialized, locale}}>
            {children}
        </I18nContext.Provider>
    );
};

export const useI18n = () => {
    const context = useContext(I18nContext);
    if (!context) {
        throw new Error('useI18n must be used within an I18nProvider');
    }
    return context;
};
