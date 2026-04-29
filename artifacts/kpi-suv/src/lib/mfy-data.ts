export type LocationOption = { value: string; label: string };

const KATTAQURGON_MFYLAR: LocationOption[] = [
  { value: "Butun tuman", label: "Butun tuman" },
  { value: "Kattaqo'rg'on shahri", label: "Kattaqo'rg'on shahri" },
  { value: "Ahangaron MFY", label: "Ahangaron MFY" },
  { value: "Bozorboshi MFY", label: "Bozorboshi MFY" },
  { value: "Do'stlik MFY", label: "Do'stlik MFY" },
  { value: "Istiqbol MFY", label: "Istiqbol MFY" },
  { value: "Mehnat MFY", label: "Mehnat MFY" },
  { value: "Mustaqillik MFY", label: "Mustaqillik MFY" },
  { value: "Navro'z MFY", label: "Navro'z MFY" },
  { value: "O'zbekiston MFY", label: "O'zbekiston MFY" },
  { value: "Tinchlik MFY", label: "Tinchlik MFY" },
  { value: "Yangiobod MFY", label: "Yangiobod MFY" },
  { value: "Hamkorlik MFY", label: "Hamkorlik MFY" },
  { value: "Baxt MFY", label: "Baxt MFY" },
  { value: "Guliston MFY", label: "Guliston MFY" },
  { value: "Zarafshon MFY", label: "Zarafshon MFY" },
  { value: "Bog'iston MFY", label: "Bog'iston MFY" },
  { value: "Yangi hayot q.", label: "Yangi hayot qishlog'i" },
  { value: "Sayhun q.", label: "Sayhun qishlog'i" },
  { value: "Qorabag' q.", label: "Qorabag' qishlog'i" },
  { value: "Qo'rg'ontepa q.", label: "Qo'rg'ontepa qishlog'i" },
  { value: "Paxtazor q.", label: "Paxtazor qishlog'i" },
  { value: "Gulbahor q.", label: "Gulbahor qishlog'i" },
  { value: "Madaniyat q.", label: "Madaniyat qishlog'i" },
  { value: "Xo'jaobod q.", label: "Xo'jaobod qishlog'i" },
  { value: "Sho'rtepa q.", label: "Sho'rtepa qishlog'i" },
  { value: "Oqtepa q.", label: "Oqtepa qishlog'i" },
  { value: "Bog'ishamol q.", label: "Bog'ishamol qishlog'i" },
  { value: "Chimbay q.", label: "Chimbay qishlog'i" },
  { value: "Ko'ktepa q.", label: "Ko'ktepa qishlog'i" },
  { value: "Yangi toshloq q.", label: "Yangi toshloq qishlog'i" },
  { value: "Qoratosh q.", label: "Qoratosh qishlog'i" },
  { value: "Toshloq q.", label: "Toshloq qishlog'i" },
  { value: "Xurmo q.", label: "Xurmo qishlog'i" },
  { value: "Beshqo'ton q.", label: "Beshqo'ton qishlog'i" },
  { value: "Qorovulbozor q.", label: "Qorovulbozor qishlog'i" },
  { value: "Mingchinor q.", label: "Mingchinor qishlog'i" },
  { value: "Ariq q.", label: "Ariq qishlog'i" },
  { value: "1-zona", label: "1-xizmat zonasi" },
  { value: "2-zona", label: "2-xizmat zonasi" },
  { value: "3-zona", label: "3-xizmat zonasi" },
  { value: "4-zona", label: "4-xizmat zonasi" },
];

function buildDefault(tuman: string): LocationOption[] {
  return [
    { value: "Butun tuman", label: "Butun tuman" },
    { value: tuman, label: tuman },
    { value: "Markaz MFY", label: "Markaz MFY" },
    { value: "Yangi hayot MFY", label: "Yangi hayot MFY" },
    { value: "Mustaqillik MFY", label: "Mustaqillik MFY" },
    { value: "Navro'z MFY", label: "Navro'z MFY" },
    { value: "Do'stlik MFY", label: "Do'stlik MFY" },
    { value: "Tinchlik MFY", label: "Tinchlik MFY" },
    { value: "Mehnat MFY", label: "Mehnat MFY" },
    { value: "Guliston MFY", label: "Guliston MFY" },
    { value: "Baxt MFY", label: "Baxt MFY" },
    { value: "Istiqbol MFY", label: "Istiqbol MFY" },
  ];
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\u2018\u2019\u02BC\u0060]/g, "'")
    .trim();
}

export const TUMAN_MFYLAR_LIST: { keywords: string[]; data: LocationOption[] }[] = [
  {
    keywords: ["kattaqo", "kattaqurg", "kattaqo'rg'on"],
    data: KATTAQURGON_MFYLAR,
  },
];

export const VILOYAT_LABELS: Record<string, string> = {
  andijon: "Andijon viloyati",
  buxoro: "Buxoro viloyati",
  fargona: "Farg'ona viloyati",
  jizzax: "Jizzax viloyati",
  xorazm: "Xorazm viloyati",
  namangan: "Namangan viloyati",
  navoiy: "Navoiy viloyati",
  qashqadaryo: "Qashqadaryo viloyati",
  qoraqalpogiston: "Qoraqalpog'iston Respublikasi",
  samarqand: "Samarqand viloyati",
  sirdaryo: "Sirdaryo viloyati",
  surxondaryo: "Surxondaryo viloyati",
  toshkent_viloyat: "Toshkent viloyati",
  toshkent_shahar: "Toshkent shahri",
};

export function getMfylarForTuman(tuman: string): LocationOption[] {
  if (!tuman) return KATTAQURGON_MFYLAR;

  const norm = normalize(tuman);

  for (const entry of TUMAN_MFYLAR_LIST) {
    if (entry.keywords.some((kw) => norm.includes(normalize(kw)))) {
      return entry.data;
    }
  }

  return buildDefault(tuman);
}

export { KATTAQURGON_MFYLAR };
