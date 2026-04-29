export const VILOYATLAR_MAP: Record<string, string[]> = {
  andijon: ["Andijon shahri","Oltinko'l tumani","Andijon tumani","Asaka tumani","Baliqchi tumani","Bo'ston tumani","Buloqboshi tumani","Izboskan tumani","Jalaquduq tumani","Xo'jaobod tumani","Qo'rg'ontepa tumani","Marhamat tumani","Mirzaobod tumani","Paxtaobod tumani","Shahrixon tumani","Ulug'nor tumani"],
  buxoro: ["Buxoro shahri","Buxoro tumani","G'ijduvon tumani","Jondor tumani","Kogon shahri","Kogon tumani","Qorako'l tumani","Qorovulbozor tumani","Peshku tumani","Romitan tumani","Shofirkon tumani","Vobkent tumani"],
  fargona: ["Farg'ona shahri","Quvasoy shahri","Qo'qon shahri","Marg'ilon shahri","Oltiariq tumani","Bag'dod tumani","Beshariq tumani","Bo'z tumani","Buvayda tumani","Dang'ara tumani","Furqat tumani","Hamza tumani","O'zbekiston tumani","Qo'shtepa tumani","Rishton tumani","So'x tumani","Toshloq tumani","Uchko'prik tumani","Yozyovon tumani"],
  jizzax: ["Jizzax shahri","Arnasoy tumani","Baxmal tumani","Do'stlik tumani","Forish tumani","G'allaorol tumani","Mirzacho'l tumani","Paxtakor tumani","Yangiobod tumani","Zomin tumani","Zarbdor tumani"],
  xorazm: ["Urganch shahri","Bog'ot tumani","Gurlan tumani","Xazarasp tumani","Xiva tumani","Xiva shahri","Xonqa tumani","Qo'shko'pir tumani","Shovot tumani","Tuproqqal'a tumani","Urganch tumani","Yangiariq tumani","Yangibozor tumani"],
  namangan: ["Namangan shahri","Chortoq tumani","Chust tumani","Kosonsoy tumani","Mingbuloq tumani","Namangan tumani","Norin tumani","Pop tumani","To'raqo'rg'on tumani","Uchqo'rg'on tumani","Uychi tumani","Yangiqo'rg'on tumani"],
  navoiy: ["Navoiy shahri","Zarafshon shahri","Karmana tumani","Konimex tumani","Navbahor tumani","Nurota tumani","Qiziltepa tumani","Tomdi tumani","Uchquduq tumani","Xatirchi tumani"],
  qashqadaryo: ["Qarshi shahri","Chiroqchi tumani","Dehqonobod tumani","G'uzor tumani","Kamashi tumani","Kasbi tumani","Kitob tumani","Koson tumani","Mirishkor tumani","Muborak tumani","Nishon tumani","Qamashi tumani","Qarshi tumani","Shahrisabz tumani","Yakkabog' tumani"],
  qoraqalpogiston: ["Nukus shahri","Amudaryo tumani","Beruniy tumani","Bo'zatov tumani","Chimboy tumani","Ellikkala tumani","Kegeyli tumani","Mo'ynoq tumani","Nukus tumani","Qanliko'l tumani","Qo'ng'irot tumani","Qorao'zak tumani","Shumanay tumani","Taxtako'pir tumani","To'rtko'l tumani","Xo'jayli tumani"],
  samarqand: ["Samarqand shahri","Bulung'ur tumani","Ishtixon tumani","Jomboy tumani","Kattaqo'rg'on shahri","Kattaqo'rg'on tumani","Narpay tumani","Nurobod tumani","Oqdaryo tumani","Paxtachi tumani","Pastdarg'om tumani","Payariq tumani","Qo'shrabot tumani","Samarqand tumani","Toyloq tumani","Urgut tumani"],
  sirdaryo: ["Guliston shahri","Baxt tumani","Boyovut tumani","Guliston tumani","Hovos tumani","Mirzaobod tumani","Oqoltin tumani","Sardoba tumani","Sayxunobod tumani","Sirdaryo tumani"],
  surxondaryo: ["Termiz shahri","Angor tumani","Bandixon tumani","Boysun tumani","Denov tumani","Jarqo'rg'on tumani","Muzrabot tumani","Oltinsoy tumani","Qiziriq tumani","Qumqo'rg'on tumani","Sariosiyo tumani","Sherobod tumani","Shurchi tumani","Termiz tumani","Uzun tumani"],
  toshkent_viloyat: ["Nurafshon shahri","Angren shahri","Bekobod shahri","Chirchiq shahri","Olmaliq shahri","Ohangaron tumani","Bekobod tumani","Bo'ka tumani","Bo'stonliq tumani","Chinoz tumani","Chirchiq tumani","Hovos tumani","Iskandar tumani","Kibray tumani","Kuyichirchiq tumani","Oqqo'rg'on tumani","Parkent tumani","Piskent tumani","Quyichirchiq tumani","Toshkent tumani","Yangiyo'l tumani","Zangiota tumani"],
  toshkent_shahar: ["Bektemir tumani","Chilonzor tumani","Hamza tumani","Mirzo Ulug'bek tumani","Mirobod tumani","Sergeli tumani","Shayxontohur tumani","Olmazar tumani","Uchtepa tumani","Yakkasaroy tumani","Yunusobod tumani","Yashnobod tumani"],
};

export function getTumanlarForViloyat(viloyat: string): string[] {
  return VILOYATLAR_MAP[viloyat] ?? [];
}
