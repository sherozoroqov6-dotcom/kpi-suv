import type { Lang } from "@/lib/lang-context";

export const VILOYATLAR: {
  value: string;
  label: string;
  labelKril: string;
  labelRus: string;
  tumanlar: string[];
}[] = [
  {
    value: "andijon",
    label: "Andijon viloyati",
    labelKril: "Андижон вилояти",
    labelRus: "Андижанская область",
    tumanlar: [
      "Andijon shahri", "Oltinko'l tumani", "Andijon tumani", "Asaka tumani",
      "Baliqchi tumani", "Bo'ston tumani", "Buloqboshi tumani", "Izboskan tumani",
      "Jalaquduq tumani", "Xo'jaobod tumani", "Qo'rg'ontepa tumani",
      "Marhamat tumani", "Mirzaobod tumani", "Paxtaobod tumani",
      "Shahrixon tumani", "Ulug'nor tumani",
    ],
  },
  {
    value: "buxoro",
    label: "Buxoro viloyati",
    labelKril: "Бухоро вилояти",
    labelRus: "Бухарская область",
    tumanlar: [
      "Buxoro shahri", "Buxoro tumani", "G'ijduvon tumani", "Jondor tumani",
      "Kogon shahri", "Kogon tumani", "Qorako'l tumani", "Qorovulbozor tumani",
      "Peshku tumani", "Romitan tumani", "Shofirkon tumani", "Vobkent tumani",
    ],
  },
  {
    value: "fargona",
    label: "Farg'ona viloyati",
    labelKril: "Фарғона вилояти",
    labelRus: "Ферганская область",
    tumanlar: [
      "Farg'ona shahri", "Quvasoy shahri", "Qo'qon shahri", "Marg'ilon shahri",
      "Oltiariq tumani", "Bag'dod tumani", "Beshariq tumani", "Bo'z tumani",
      "Buvayda tumani", "Dang'ara tumani", "Furqat tumani", "Hamza tumani",
      "O'zbekiston tumani", "Qo'shtepa tumani", "Rishton tumani", "So'x tumani",
      "Toshloq tumani", "Uchko'prik tumani", "Yozyovon tumani",
    ],
  },
  {
    value: "jizzax",
    label: "Jizzax viloyati",
    labelKril: "Жиззах вилояти",
    labelRus: "Джизакская область",
    tumanlar: [
      "Jizzax shahri", "Arnasoy tumani", "Baxmal tumani", "Do'stlik tumani",
      "Forish tumani", "G'allaorol tumani", "Mirzacho'l tumani", "Paxtakor tumani",
      "Yangiobod tumani", "Zomin tumani", "Zarbdor tumani",
    ],
  },
  {
    value: "xorazm",
    label: "Xorazm viloyati",
    labelKril: "Хоразм вилояти",
    labelRus: "Хорезмская область",
    tumanlar: [
      "Urganch shahri", "Bog'ot tumani", "Gurlan tumani", "Xazarasp tumani",
      "Xiva tumani", "Xiva shahri", "Xonqa tumani", "Qo'shko'pir tumani",
      "Shovot tumani", "Tuproqqal'a tumani", "Urganch tumani", "Yangiariq tumani",
      "Yangibozor tumani",
    ],
  },
  {
    value: "namangan",
    label: "Namangan viloyati",
    labelKril: "Наманган вилояти",
    labelRus: "Наманганская область",
    tumanlar: [
      "Namangan shahri", "Chortoq tumani", "Chust tumani", "Kosonsoy tumani",
      "Mingbuloq tumani", "Namangan tumani", "Norin tumani", "Pop tumani",
      "To'raqo'rg'on tumani", "Uchqo'rg'on tumani", "Uychi tumani",
      "Yangiqo'rg'on tumani",
    ],
  },
  {
    value: "navoiy",
    label: "Navoiy viloyati",
    labelKril: "Навоий вилояти",
    labelRus: "Навоийская область",
    tumanlar: [
      "Navoiy shahri", "Zarafshon shahri", "Karmana tumani", "Konimex tumani",
      "Navbahor tumani", "Nurota tumani", "Qiziltepa tumani",
      "Tomdi tumani", "Uchquduq tumani", "Xatirchi tumani",
    ],
  },
  {
    value: "qashqadaryo",
    label: "Qashqadaryo viloyati",
    labelKril: "Қашқадарё вилояти",
    labelRus: "Кашкадарьинская область",
    tumanlar: [
      "Qarshi shahri", "Chiroqchi tumani", "Dehqonobod tumani", "G'uzor tumani",
      "Kamashi tumani", "Kasbi tumani", "Kitob tumani", "Koson tumani",
      "Mirishkor tumani", "Muborak tumani", "Nishon tumani", "Qamashi tumani",
      "Qarshi tumani", "Shahrisabz tumani", "Yakkabog' tumani",
    ],
  },
  {
    value: "qoraqalpogiston",
    label: "Qoraqalpog'iston Respublikasi",
    labelKril: "Қорақалпоғистон Республикаси",
    labelRus: "Республика Каракалпакстан",
    tumanlar: [
      "Nukus shahri", "Amudaryo tumani", "Beruniy tumani", "Bo'zatov tumani",
      "Chimboy tumani", "Ellikkala tumani", "Kegeyli tumani", "Mo'ynoq tumani",
      "Nukus tumani", "Qanliko'l tumani", "Qo'ng'irot tumani", "Qorao'zak tumani",
      "Shumanay tumani", "Taxtako'pir tumani", "To'rtko'l tumani", "Xo'jayli tumani",
    ],
  },
  {
    value: "samarqand",
    label: "Samarqand viloyati",
    labelKril: "Самарқанд вилояти",
    labelRus: "Самаркандская область",
    tumanlar: [
      "Samarqand shahri", "Bulung'ur tumani", "Ishtixon tumani", "Jomboy tumani",
      "Kattaqo'rg'on shahri", "Kattaqo'rg'on tumani", "Narpay tumani", "Nurobod tumani",
      "Oqdaryo tumani", "Paxtachi tumani", "Pastdarg'om tumani", "Payariq tumani",
      "Qo'shrabot tumani", "Samarqand tumani", "Toyloq tumani", "Urgut tumani",
    ],
  },
  {
    value: "sirdaryo",
    label: "Sirdaryo viloyati",
    labelKril: "Сирдарё вилояти",
    labelRus: "Сырдарьинская область",
    tumanlar: [
      "Guliston shahri", "Baxt tumani", "Boyovut tumani", "Guliston tumani",
      "Hovos tumani", "Mirzaobod tumani", "Oqoltin tumani", "Sardoba tumani",
      "Sayxunobod tumani", "Sirdaryo tumani",
    ],
  },
  {
    value: "surxondaryo",
    label: "Surxondaryo viloyati",
    labelKril: "Сурхондарё вилояти",
    labelRus: "Сурхандарьинская область",
    tumanlar: [
      "Termiz shahri", "Angor tumani", "Bandixon tumani", "Boysun tumani",
      "Denov tumani", "Jarqo'rg'on tumani", "Muzrabot tumani", "Oltinsoy tumani",
      "Qiziriq tumani", "Qumqo'rg'on tumani", "Sariosiyo tumani", "Sherobod tumani",
      "Shurchi tumani", "Termiz tumani", "Uzun tumani",
    ],
  },
  {
    value: "toshkent_viloyat",
    label: "Toshkent viloyati",
    labelKril: "Тошкент вилояти",
    labelRus: "Ташкентская область",
    tumanlar: [
      "Nurafshon shahri", "Angren shahri", "Bekobod shahri", "Chirchiq shahri",
      "Olmaliq shahri", "Ohangaron tumani", "Bekobod tumani", "Bo'ka tumani",
      "Bo'stonliq tumani", "Chinoz tumani", "Chirchiq tumani", "Hovos tumani",
      "Iskandar tumani", "Kibray tumani", "Kuyichirchiq tumani", "Oqqo'rg'on tumani",
      "Parkent tumani", "Piskent tumani", "Quyichirchiq tumani", "Toshkent tumani",
      "Yangiyo'l tumani", "Zangiota tumani",
    ],
  },
  {
    value: "toshkent_shahar",
    label: "Toshkent shahri",
    labelKril: "Тошкент шаҳри",
    labelRus: "город Ташкент",
    tumanlar: [
      "Bektemir tumani", "Chilonzor tumani", "Hamza tumani", "Mirzo Ulug'bek tumani",
      "Mirobod tumani", "Sergeli tumani", "Shayxontohur tumani", "Olmazar tumani",
      "Uchtepa tumani", "Yakkasaroy tumani", "Yunusobod tumani", "Yashnobod tumani",
    ],
  },
];

export function getTumanlarByViloyat(viloyatKey: string): string[] {
  const v = VILOYATLAR.find((v) => v.value === viloyatKey);
  return v ? v.tumanlar : [];
}

export function getViloyatLabel(viloyatKey: string, lang?: Lang): string {
  const v = VILOYATLAR.find((v) => v.value === viloyatKey);
  if (!v) return viloyatKey;
  if (lang === "kril") return v.labelKril;
  if (lang === "rus") return v.labelRus;
  return v.label;
}
