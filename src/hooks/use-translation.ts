import { useLanguageStore } from "@/store/language-store";
import { translations } from "@/lib/translations";

export function useTranslation() {
  const language = useLanguageStore((state) => state.language);
  
  const t = (key: string): string => {
    const keys = key.split(".");
    let value: unknown = translations[language];
    
    for (const k of keys) {
      if (value && typeof value === "object" && k in value) {
        value = (value as Record<string, unknown>)[k];
      } else {
        return key;
      }
    }
    
    return typeof value === "string" ? value : key;
  };
  
  return { t, language };
}
