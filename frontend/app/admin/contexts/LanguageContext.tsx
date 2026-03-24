import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { ReactNode, createContext, useContext, useEffect, useState } from 'react';
import translations from '../Languages/translations'; // adjust path if needed

export type Language = 'en' | 'ar';

type Translations = typeof translations['en'];

interface LanguageContextValue {
    language: Language;
    t: Translations;
    isRTL: boolean;
    setLanguage: (lang: Language) => Promise<void>;
}

const LangContext = createContext<LanguageContextValue>({
    language: 'en',
    t: translations['en'],
    isRTL: false,
    setLanguage: async () => {},
});

export function LanguageProvider({ children }: { children: ReactNode }): React.JSX.Element {
    const [language, setLang] = useState<Language>('en');

    useEffect(() => {
        AsyncStorage.getItem('panelLanguage')
            .then((saved) => {
                if (saved === 'ar' || saved === 'en') setLang(saved);
            })
            .catch(() => {});
    }, []);

    const setLanguage = async (lang: Language): Promise<void> => {
        setLang(lang);
        try {
            await AsyncStorage.setItem('panelLanguage', lang);
        } catch (_) {}
    };

    return (
        <LangContext.Provider
            value={{
                language,
                t: translations[language],
                isRTL: language === 'ar',
                setLanguage,
            }}
        >
            {children}
        </LangContext.Provider>
    );
}

export function useLanguage(): LanguageContextValue {
    return useContext(LangContext);
}