declare global {
    interface Window {
        Granite?: {
            I18n: {
                setLocale: (locale: string) => void;
                get: (key: string, variables?: any[], hint?: string) => string;
            };
        };
    }
}

export {};
