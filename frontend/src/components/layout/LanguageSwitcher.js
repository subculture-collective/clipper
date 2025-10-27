import { jsx as _jsx } from "react/jsx-runtime";
import { useTranslation } from 'react-i18next';
import { Button } from '../ui';
const languages = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
];
export function LanguageSwitcher() {
    const { i18n } = useTranslation();
    const changeLanguage = (lng) => {
        i18n.changeLanguage(lng);
    };
    return (_jsx("div", { className: "flex gap-1", children: languages.map((lang) => (_jsx(Button, { variant: "ghost", size: "sm", onClick: () => changeLanguage(lang.code), className: i18n.language === lang.code ? 'bg-primary-100 dark:bg-primary-900' : '', title: lang.name, children: lang.flag }, lang.code))) }));
}
