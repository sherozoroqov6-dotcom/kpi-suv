import type { Lang } from "./lang-context";
import { translitToKril } from "./lang-context";

const UNITS_LOTIN: { value: string; label: string; rus: string }[] = [
  // Uzunlik
  { value: "mm",      label: "mm — millimetr",          rus: "мм — миллиметр" },
  { value: "sm",      label: "sm — santimetr",           rus: "см — сантиметр" },
  { value: "m",       label: "m — metr",                 rus: "м — метр" },
  { value: "km",      label: "km — kilometr",            rus: "км — километр" },
  // Yuza
  { value: "m²",      label: "m² — kvadrat metr",        rus: "м² — квадратный метр" },
  { value: "km²",     label: "km² — kvadrat kilometr",   rus: "км² — квадратный километр" },
  { value: "ga",      label: "ga — gektar",              rus: "га — гектар" },
  // Hajm
  { value: "ml",      label: "ml — millilitr",           rus: "мл — миллилитр" },
  { value: "l",       label: "l — litr",                 rus: "л — литр" },
  { value: "m³",      label: "m³ — kub metr",            rus: "м³ — кубометр" },
  { value: "ming m³", label: "ming m³",                  rus: "тыс. м³" },
  { value: "mln m³",  label: "mln m³ — million kub metr", rus: "млн м³ — миллион кубометров" },
  // Oqim
  { value: "l/s",     label: "l/s — litr/soniya",        rus: "л/с — литр/секунду" },
  { value: "m³/s",    label: "m³/s — kub metr/soniya",   rus: "м³/с — кубометр/секунду" },
  { value: "m³/soat", label: "m³/soat — kub metr/soat",  rus: "м³/ч — кубометр/час" },
  { value: "m³/kun",  label: "m³/kun — kub metr/kun",    rus: "м³/сут — кубометр/сутки" },
  // Massa
  { value: "g",       label: "g — gramm",                rus: "г — грамм" },
  { value: "kg",      label: "kg — kilogramm",           rus: "кг — килограмм" },
  { value: "t",       label: "t — tonna",                rus: "т — тонна" },
  { value: "ming t",  label: "ming t — ming tonna",      rus: "тыс. т — тысяча тонн" },
  // Bosim / Temperatura
  { value: "atm",     label: "atm — atmosfera",          rus: "атм — атмосфера" },
  { value: "bar",     label: "bar",                      rus: "бар" },
  { value: "MPa",     label: "MPa — megapaskal",         rus: "МПа — мегапаскаль" },
  { value: "°C",      label: "°C — daraja Selsiy",       rus: "°C — градус Цельсия" },
  // Elektr
  { value: "kVt",     label: "kVt — kilovat",            rus: "кВт — киловатт" },
  { value: "MVt",     label: "MVt — megavat",            rus: "МВт — мегаватт" },
  { value: "kVt·soat", label: "kVt·soat — kilovatt-soat", rus: "кВт·ч — киловатт-час" },
  { value: "MVt·soat", label: "MVt·soat — megavatt-soat", rus: "МВт·ч — мегаватт-час" },
  // Sanoq
  { value: "dona",     label: "dona",                    rus: "штук" },
  { value: "ta",       label: "ta",                      rus: "ед." },
  { value: "nafar",    label: "nafar — kishi",           rus: "чел. — человек" },
  { value: "oila",     label: "oila",                    rus: "семья" },
  { value: "uy-joy",   label: "uy-joy",                  rus: "жилое помещение" },
  { value: "xonadon",  label: "xonadon",                 rus: "квартира" },
  { value: "abonent",  label: "abonent",                 rus: "абонент" },
  { value: "iste'molchi", label: "iste'molchi",          rus: "потребитель" },
  { value: "tashkilot", label: "tashkilot",              rus: "организация" },
  { value: "korxona",  label: "korxona",                 rus: "предприятие" },
  { value: "manzil",   label: "manzil",                  rus: "адрес" },
  { value: "nuqta",    label: "nuqta",                   rus: "точка" },
  { value: "quduq",    label: "quduq",                   rus: "скважина" },
  { value: "stansiya", label: "stansiya",                rus: "станция" },
  { value: "inshoot",  label: "inshoot",                 rus: "сооружение" },
  { value: "agregat",  label: "agregat",                 rus: "агрегат" },
  { value: "nasos",    label: "nasos",                   rus: "насос" },
  { value: "truba",    label: "truba",                   rus: "труба" },
  { value: "kran",     label: "kran",                    rus: "кран" },
  { value: "hisoblagich", label: "hisoblagich (schyotchik)", rus: "счётчик" },
  // Vaqt
  { value: "daqiqa",   label: "daqiqa",                  rus: "минута" },
  { value: "soat",     label: "soat",                    rus: "час" },
  { value: "kun",      label: "kun",                     rus: "сутки" },
  { value: "hafta",    label: "hafta",                   rus: "неделя" },
  { value: "oy",       label: "oy",                      rus: "месяц" },
  { value: "yil",      label: "yil",                     rus: "год" },
  { value: "marta",    label: "marta",                   rus: "раз" },
  { value: "seans",    label: "seans",                   rus: "сеанс" },
  { value: "muddat",   label: "muddat",                  rus: "срок" },
  // Hujjat / faoliyat
  { value: "loyiha",    label: "loyiha",                 rus: "проект" },
  { value: "hujjat",    label: "hujjat",                 rus: "документ" },
  { value: "tadbir",    label: "tadbir",                 rus: "мероприятие" },
  { value: "dastur",    label: "dastur",                 rus: "программа" },
  { value: "shartnoma", label: "shartnoma",              rus: "договор" },
  { value: "buyurtma",  label: "buyurtma",               rus: "заказ" },
  { value: "ariza",     label: "ariza",                  rus: "заявление" },
  { value: "shikoyat",  label: "shikoyat",               rus: "жалоба" },
  { value: "tekshiruv", label: "tekshiruv",              rus: "проверка" },
  { value: "hisobot",   label: "hisobot",                rus: "отчёт" },
  // Foiz / koeffitsient
  { value: "%",        label: "%",                       rus: "%" },
  { value: "ball",     label: "ball",                    rus: "балл" },
  { value: "koef",     label: "koef",                    rus: "коэфф." },
  { value: "indeks",   label: "indeks",                  rus: "индекс" },
  // Pul
  { value: "so'm",     label: "so'm",                    rus: "сум" },
  { value: "ming so'm", label: "ming so'm",              rus: "тыс. сум" },
  { value: "mln so'm", label: "mln so'm",                rus: "млн сум" },
  { value: "mlrd so'm", label: "mlrd so'm",              rus: "млрд сум" },
  // Boshqa
  { value: "km/soat",  label: "km/soat",                 rus: "км/ч" },
  { value: "m/s",      label: "m/s",                     rus: "м/с" },
];

export function getUnitOptions(lang: Lang): { value: string; label: string }[] {
  return UNITS_LOTIN.map((u) => {
    if (lang === "rus") return { value: u.value, label: u.rus };
    if (lang === "kril") return { value: u.value, label: translitToKril(u.label) };
    return { value: u.value, label: u.label };
  });
}
