import { useCallback, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import en from "../locales/en.json";
import vi from "../locales/vi.json";

export type AppLanguage = "en" | "vi";
type Translation = typeof en;

const LANGUAGE_STORAGE_KEY = "app_language";

const translations: Record<AppLanguage, Translation> = {
  en,
  vi: vi as Translation,
};

let currentLanguage: AppLanguage = "en";
let hydrated = false;
const listeners = new Set<() => void>();

const emitChange = () => {
  listeners.forEach((listener) => listener());
};

const hydrateLanguage = async () => {
  if (hydrated) return;
  hydrated = true;

  const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
  if ((savedLanguage === "en" || savedLanguage === "vi") && savedLanguage !== currentLanguage) {
    currentLanguage = savedLanguage;
    emitChange();
  }
};

export const useTranslation = () => {
  const [language, setLanguageState] = useState<AppLanguage>(currentLanguage);

  useEffect(() => {
    const handleChange = () => setLanguageState(currentLanguage);
    listeners.add(handleChange);
    return () => {
      listeners.delete(handleChange);
    };
  }, []);

  useEffect(() => {
    hydrateLanguage();
  }, []);

  const setLanguage = useCallback(async (nextLanguage: AppLanguage) => {
    if (nextLanguage !== currentLanguage) {
      currentLanguage = nextLanguage;
      emitChange();
    }
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
  }, []);

  const t = useMemo(() => translations[language], [language]);

  return {
    language,
    setLanguage,
    t,
  };
};
