/**
 * Référentiel léger des AREF et de leurs provinces/préfectures.
 *
 * Les 12 académies suivent le découpage régional de l'Éducation nationale.
 * Les provinces et préfectures sont séparées dans l'interface pour éviter
 * qu'un professeur confonde la direction provinciale avec son établissement.
 */
export interface EducationProvince {
    id: string;
    label: string;
    arabicLabel: string;
    kind: 'province' | 'prefecture';
}

export interface EducationAcademy {
    id: string;
    label: string;
    arabicLabel: string;
    provinces: EducationProvince[];
}

const p = (id: string, label: string, arabicLabel: string, kind: EducationProvince['kind'] = 'province'): EducationProvince => ({ id, label, arabicLabel, kind });

export const MOROCCO_EDUCATION_ACADEMIES: EducationAcademy[] = [
    {
        id: 'tanger-tetouan-al-hoceima',
        label: 'Tanger-Tétouan-Al Hoceïma',
        arabicLabel: 'طنجة - تطوان - الحسيمة',
        provinces: [
            p('tanger-assilah', 'Tanger-Assilah', 'طنجة - أصيلة', 'prefecture'),
            p('tetouan', 'Tétouan', 'تطوان', 'prefecture'),
            p('mdiq-fnideq', 'M’diq-Fnideq', 'المضيق - الفنيدق', 'prefecture'),
            p('al-hoceima', 'Al Hoceïma', 'الحسيمة'),
            p('chefchaouen', 'Chefchaouen', 'شفشاون'),
            p('fahs-anjra', 'Fahs-Anjra', 'الفحص - أنجرة'),
            p('larache', 'Larache', 'العرائش'),
            p('ouezzane', 'Ouezzane', 'وزان'),
        ],
    },
    {
        id: 'oriental',
        label: 'L’Oriental',
        arabicLabel: 'الشرق',
        provinces: [
            p('oujda-angad', 'Oujda-Angad', 'وجدة - أنكاد', 'prefecture'),
            p('nador', 'Nador', 'الناظور'),
            p('driouch', 'Driouch', 'الدريوش'),
            p('berkane', 'Berkane', 'بركان'),
            p('taourirt', 'Taourirt', 'تاوريرت'),
            p('jerada', 'Jerada', 'جرادة'),
            p('figuig', 'Figuig', 'فكيك'),
            p('guercif', 'Guercif', 'جرسيف'),
        ],
    },
    {
        id: 'fes-meknes',
        label: 'Fès-Meknès',
        arabicLabel: 'فاس - مكناس',
        provinces: [
            p('fes', 'Fès', 'فاس', 'prefecture'),
            p('meknes', 'Meknès', 'مكناس', 'prefecture'),
            p('el-hajeb', 'El Hajeb', 'الحاجب'),
            p('ifrane', 'Ifrane', 'إفران'),
            p('sefrou', 'Sefrou', 'صفرو'),
            p('boulemane', 'Boulemane', 'بولمان'),
            p('moulay-yacoub', 'Moulay Yacoub', 'مولاي يعقوب'),
            p('taza', 'Taza', 'تازة'),
            p('taounate', 'Taounate', 'تاونات'),
        ],
    },
    {
        id: 'rabat-sale-kenitra',
        label: 'Rabat-Salé-Kénitra',
        arabicLabel: 'الرباط - سلا - القنيطرة',
        provinces: [
            p('rabat', 'Rabat', 'الرباط', 'prefecture'),
            p('sale', 'Salé', 'سلا', 'prefecture'),
            p('skhirate-temara', 'Skhirate-Témara', 'الصخيرات - تمارة', 'prefecture'),
            p('kenitra', 'Kénitra', 'القنيطرة'),
            p('khemisset', 'Khémisset', 'الخميسات'),
            p('sidi-kacem', 'Sidi Kacem', 'سيدي قاسم'),
            p('sidi-slimane', 'Sidi Slimane', 'سيدي سليمان'),
        ],
    },
    {
        id: 'beni-mellal-khenifra',
        label: 'Béni Mellal-Khénifra',
        arabicLabel: 'بني ملال - خنيفرة',
        provinces: [
            p('beni-mellal', 'Béni Mellal', 'بني ملال'),
            p('azilal', 'Azilal', 'أزيلال'),
            p('fquih-ben-salah', 'Fquih Ben Salah', 'الفقيه بن صالح'),
            p('khenifra', 'Khénifra', 'خنيفرة'),
            p('khouribga', 'Khouribga', 'خريبكة'),
        ],
    },
    {
        id: 'casablanca-settat',
        label: 'Casablanca-Settat',
        arabicLabel: 'الدار البيضاء - سطات',
        provinces: [
            p('casablanca', 'Casablanca', 'الدار البيضاء', 'prefecture'),
            p('mohammedia', 'Mohammedia', 'المحمدية', 'prefecture'),
            p('el-jadida', 'El Jadida', 'الجديدة'),
            p('nouaceur', 'Nouaceur', 'النواصر'),
            p('mediouna', 'Médiouna', 'مديونة'),
            p('benslimane', 'Benslimane', 'بنسليمان'),
            p('berrechid', 'Berrechid', 'برشيد'),
            p('settat', 'Settat', 'سطات'),
            p('sidi-bennour', 'Sidi Bennour', 'سيدي بنور'),
        ],
    },
    {
        id: 'marrakech-safi',
        label: 'Marrakech-Safi',
        arabicLabel: 'مراكش - آسفي',
        provinces: [
            p('marrakech', 'Marrakech', 'مراكش', 'prefecture'),
            p('chichaoua', 'Chichaoua', 'شيشاوة'),
            p('al-haouz', 'Al Haouz', 'الحوز'),
            p('el-kelaa-des-sraghna', 'El Kelaâ des Sraghna', 'قلعة السراغنة'),
            p('essaouira', 'Essaouira', 'الصويرة'),
            p('rehamna', 'Rehamna', 'الرحامنة'),
            p('safi', 'Safi', 'آسفي'),
            p('youssoufia', 'Youssoufia', 'اليوسفية'),
        ],
    },
    {
        id: 'draa-tafilalet',
        label: 'Drâa-Tafilalet',
        arabicLabel: 'درعة - تافيلالت',
        provinces: [
            p('errachidia', 'Errachidia', 'الرشيدية'),
            p('midelt', 'Midelt', 'ميدلت'),
            p('ouarzazate', 'Ouarzazate', 'ورزازات'),
            p('tinghir', 'Tinghir', 'تنغير'),
            p('zagora', 'Zagora', 'زاكورة'),
        ],
    },
    {
        id: 'souss-massa',
        label: 'Souss-Massa',
        arabicLabel: 'سوس - ماسة',
        provinces: [
            p('agadir-ida-outanane', 'Agadir-Ida-Ou-Tanane', 'أكادير إداوتنان', 'prefecture'),
            p('inezgane-ait-melloul', 'Inezgane-Aït Melloul', 'إنزكان - أيت ملول', 'prefecture'),
            p('chtouka-ait-baha', 'Chtouka-Aït Baha', 'اشتوكة أيت باها'),
            p('taroudant', 'Taroudant', 'تارودانت'),
            p('tiznit', 'Tiznit', 'تيزنيت'),
            p('tata', 'Tata', 'طاطا'),
        ],
    },
    {
        id: 'guelmim-oued-noun',
        label: 'Guelmim-Oued Noun',
        arabicLabel: 'كلميم - واد نون',
        provinces: [
            p('guelmim', 'Guelmim', 'كلميم'),
            p('assa-zag', 'Assa-Zag', 'أسا - الزاك'),
            p('tan-tan', 'Tan-Tan', 'طانطان'),
            p('sidi-ifni', 'Sidi Ifni', 'سيدي إفني'),
        ],
    },
    {
        id: 'laayoune-sakia-el-hamra',
        label: 'Laâyoune-Sakia El Hamra',
        arabicLabel: 'العيون - الساقية الحمراء',
        provinces: [
            p('laayoune', 'Laâyoune', 'العيون', 'prefecture'),
            p('boujdour', 'Boujdour', 'بوجدور'),
            p('tarfaya', 'Tarfaya', 'طرفاية'),
            p('es-semara', 'Es-Semara', 'السمارة'),
        ],
    },
    {
        id: 'dakhla-oued-ed-dahab',
        label: 'Dakhla-Oued Ed-Dahab',
        arabicLabel: 'الداخلة - وادي الذهب',
        provinces: [
            p('oued-ed-dahab', 'Oued Ed-Dahab', 'وادي الذهب'),
            p('aousserd', 'Aousserd', 'أوسرد'),
        ],
    },
];

export const getAcademyById = (id?: string): EducationAcademy | undefined =>
    MOROCCO_EDUCATION_ACADEMIES.find(academy => academy.id === id);

export const getProvincesForAcademy = (academyId?: string): EducationProvince[] =>
    getAcademyById(academyId)?.provinces ?? [];

