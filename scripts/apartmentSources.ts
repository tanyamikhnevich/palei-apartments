/**
 * The 15 real apartments — single source of truth for the import scripts.
 *
 * `folder` points at a directory under import/raw (the unpacked Google Drive
 * archives); `null` means we have no photos for that flat yet.
 * `slug` doubles as the apartment id and the public URL segment.
 * `skip` lists 1-based positions in the sorted folder listing that must not be
 * published (maps, screenshots, duplicates).
 */
import path from 'path';
import type { ApartmentLocaleCopy } from '@/types/apartment';
import type { Locale } from '@/i18n/types';

export const ROOT = path.join(__dirname, '..');
export const RAW_DIR = path.join(ROOT, 'import', 'raw');
export const PROCESSED_DIR = path.join(ROOT, 'import', 'processed');

export type ApartmentSource = {
  slug: string;
  folder: string | null;
  /** 1-based positions in the source folder that must not be published. */
  skip?: number[];
  /** 1-based position of the photo to use as the cover (defaults to the first). */
  cover?: number;
  guests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  tagIds: string[];
  locales: Record<Locale, ApartmentLocaleCopy>;
};

/** Every flat is priced the same for now and bookable from a single night. */
export const PRICE = 500;
export const MIN_NIGHTS = 1;

const SADEH = {
  en: 'Yitshak Sadeh St 3, Bat Yam',
  ru: 'ул. Ицхак Саде 3, Бат-Ям',
  he: 'יצחק שדה 3, בת ים',
  fr: 'Rue Yitshak Sadeh 3, Bat Yam',
};
const KUKIS = {
  en: 'HaRav Kukis St 16, Bat Yam',
  ru: 'ул. ха-Рав Кукис 16, Бат-Ям',
  he: 'הרב קוקיס 16, בת ים',
  fr: 'Rue HaRav Kukis 16, Bat Yam',
};
const BEN_GURION = {
  en: 'Derech Ben Gurion 81, Bat Yam',
  ru: 'Дерех Бен-Гурион 81, Бат-Ям',
  he: 'דרך בן גוריון 81, בת ים',
  fr: 'Derech Ben Gourion 81, Bat Yam',
};
const ATSMAUT = {
  en: "Ha'Atsmaut Blvd 23, Bat Yam",
  ru: 'бул. ха-Ацмаут 23, Бат-Ям',
  he: 'שדרות העצמאות 23, בת ים',
  fr: "Bd Ha'Atsmaut 23, Bat Yam",
};
const AGNON = {
  en: 'Shmuel Yosef Agnon St 3, Bat Yam',
  ru: 'ул. Шмуэль Йосеф Агнон 3, Бат-Ям',
  he: 'ש"י עגנון 3, בת ים',
  fr: 'Rue Shmuel Yosef Agnon 3, Bat Yam',
};
const BAT_YAM = { en: 'Bat Yam', ru: 'Бат-Ям', he: 'בת ים', fr: 'Bat Yam' };

export const APARTMENT_SOURCES: ApartmentSource[] = [
  {
    slug: 'sadeh-three-room-deluxe',
    folder: 'Yitshak Sadeh, Bat Yam - 3 Rooms ',
    skip: [14],
    cover: 6,
    guests: 4,
    bedrooms: 2,
    beds: 2,
    bathrooms: 1,
    tagIds: ['family', 'equipped', 'nearBeach'],
    locales: {
      en: {
        title: 'Sadeh Three-Room Deluxe',
        location: SADEH.en,
        description:
          'A calm three-room apartment for a family or two couples: a double bedroom, a second bedroom with single beds and a living room with a pull-out sofa.\n\nThe kitchen is fully equipped down to the kettle and the coffee, the shower room is new, and there is air conditioning, free Wi-Fi and Netflix throughout. Tel Aviv is 8 km up the coast.',
        photoLabel: '2 bedrooms · living room · family',
      },
      ru: {
        title: 'Sadeh Three-Room Deluxe',
        location: SADEH.ru,
        description:
          'Спокойная трёхкомнатная квартира для семьи или двух пар: спальня с двуспальной кроватью, вторая спальня с односпальными и гостиная с раскладным диваном.\n\nКухня укомплектована полностью, вплоть до чайника и кофе, душевая новая, во всей квартире кондиционер, бесплатный Wi-Fi и Netflix. До Тель-Авива 8 км вдоль берега.',
        photoLabel: '2 спальни · гостиная · для семьи',
      },
      he: {
        title: 'Sadeh Three-Room Deluxe',
        location: SADEH.he,
        description:
          'דירת שלושה חדרים שקטה למשפחה או לשני זוגות: חדר שינה עם מיטה זוגית, חדר שני עם מיטות יחיד וסלון עם ספה נפתחת.\n\nהמטבח מאובזר במלואו, חדר המקלחת חדש, ובכל הדירה מיזוג אוויר, Wi-Fi חופשי ו-Netflix. תל אביב במרחק 8 ק"מ לאורך החוף.',
        photoLabel: '2 חדרי שינה · סלון · משפחות',
      },
      fr: {
        title: 'Sadeh Three-Room Deluxe',
        location: SADEH.fr,
        description:
          'Un appartement de trois pièces au calme pour une famille ou deux couples : une chambre avec lit double, une seconde chambre avec lits simples et un salon avec canapé convertible.\n\nLa cuisine est entièrement équipée, jusqu’à la bouilloire et au café, la salle d’eau est neuve, et l’appartement dispose de la climatisation, du Wi-Fi gratuit et de Netflix. Tel Aviv est à 8 km le long de la côte.',
        photoLabel: '2 chambres · salon · familial',
      },
    },
  },
  {
    slug: 'kukis-sunny-suite',
    folder: 'HaRav Kokis 16, Bat Yam - 2 Rooms',
    skip: [19],
    cover: 1,
    guests: 3,
    bedrooms: 1,
    beds: 2,
    bathrooms: 1,
    tagIds: ['design', 'equipped', 'nearBeach'],
    locales: {
      en: {
        title: 'Kukis Sunny Suite',
        location: KUKIS.en,
        description:
          'A freshly renovated two-room apartment in bright white and yellow, with a wide corner sofa in the living room and a dining set by the window.\n\nThe kitchen has a fridge, hob, microwave, oven and washing machine; the bathroom is brand new with a walk-in shower. Air conditioning, free Wi-Fi and a Smart TV included.',
        photoLabel: 'renovated · bright · fully equipped',
      },
      ru: {
        title: 'Kukis Sunny Suite',
        location: KUKIS.ru,
        description:
          'Свежая двухкомнатная квартира после ремонта, в белых и жёлтых тонах, с большим угловым диваном в гостиной и обеденной зоной у окна.\n\nНа кухне холодильник, плита, микроволновка, духовка и стиральная машина; санузел новый, с душевой кабиной. Кондиционер, бесплатный Wi-Fi и Smart TV.',
        photoLabel: 'после ремонта · светлая · всё необходимое',
      },
      he: {
        title: 'Kukis Sunny Suite',
        location: KUKIS.he,
        description:
          'דירת שני חדרים משופצת בגוונים לבנים וצהובים, עם ספה פינתית רחבה בסלון ופינת אוכל ליד החלון.\n\nבמטבח מקרר, כיריים, מיקרוגל, תנור ומכונת כביסה; חדר הרחצה חדש עם מקלחון. מיזוג אוויר, Wi-Fi חופשי וסמארט טי-וי.',
        photoLabel: 'משופצת · מוארת · מאובזרת',
      },
      fr: {
        title: 'Kukis Sunny Suite',
        location: KUKIS.fr,
        description:
          'Un deux-pièces fraîchement rénové, en blanc lumineux et jaune, avec un large canapé d’angle au salon et un coin repas près de la fenêtre.\n\nLa cuisine dispose d’un réfrigérateur, de plaques, d’un micro-ondes, d’un four et d’un lave-linge ; la salle de bain est neuve avec douche à l’italienne. Climatisation, Wi-Fi gratuit et Smart TV inclus.',
        photoLabel: 'rénové · lumineux · entièrement équipé',
      },
    },
  },
  {
    slug: 'sadeh-golden-balcony',
    folder: 'Yitshak Sadeh, Bat Yam - 2 Rooms ',
    skip: [5, 17],
    cover: 1,
    guests: 3,
    bedrooms: 1,
    beds: 2,
    bathrooms: 1,
    tagIds: ['balcony', 'nearBeach', 'equipped'],
    locales: {
      en: {
        title: 'Sadeh Golden Balcony Suite',
        location: SADEH.en,
        description:
          'A warm two-room apartment in cream and gold, with its own balcony. The bedroom has a double bed; the living room has a sofa bed, so the flat sleeps three comfortably.\n\nKitchenette with induction hob, microwave and everything needed for breakfast; new shower room, fresh linen and towels, air conditioning and free Wi-Fi.',
        photoLabel: 'balcony · double bedroom · warm tones',
      },
      ru: {
        title: 'Sadeh Golden Balcony Suite',
        location: SADEH.ru,
        description:
          'Тёплая двухкомнатная квартира в кремово-золотых тонах, с собственным балконом. В спальне двуспальная кровать, в гостиной диван-кровать — комфортно размещаются трое.\n\nКухня с индукционной плитой, микроволновкой и всем нужным для завтрака; новая душевая, свежее бельё и полотенца, кондиционер и бесплатный Wi-Fi.',
        photoLabel: 'балкон · спальня · тёплые тона',
      },
      he: {
        title: 'Sadeh Golden Balcony Suite',
        location: SADEH.he,
        description:
          'דירת שני חדרים חמימה בגוונים שמנת וזהב, עם מרפסת פרטית. בחדר השינה מיטה זוגית, בסלון ספה נפתחת — מקום נוח לשלושה.\n\nמטבחון עם כיריים אינדוקציה ומיקרוגל, חדר מקלחת חדש, מצעים ומגבות, מיזוג אוויר ו-Wi-Fi חופשי.',
        photoLabel: 'מרפסת · חדר שינה · גוונים חמים',
      },
      fr: {
        title: 'Sadeh Golden Balcony Suite',
        location: SADEH.fr,
        description:
          'Un deux-pièces chaleureux dans des tons crème et or, avec son propre balcon. La chambre dispose d’un lit double et le salon d’un canapé-lit : l’appartement accueille confortablement trois personnes.\n\nKitchenette avec plaques à induction, micro-ondes et tout le nécessaire pour le petit-déjeuner ; salle d’eau neuve, linge et serviettes frais, climatisation et Wi-Fi gratuit.',
        photoLabel: 'balcon · chambre double · tons chauds',
      },
    },
  },
  {
    slug: 'boulevard-suite-109',
    folder: 'Derech Ben Gurion 81, Bat Yam - 109',
    skip: [16, 17],
    cover: 1,
    guests: 3,
    bedrooms: 1,
    beds: 2,
    bathrooms: 1,
    tagIds: ['seaView', 'nearBeach', 'equipped'],
    locales: {
      en: {
        title: 'Boulevard Suite 109',
        location: BEN_GURION.en,
        description:
          'A compact two-room apartment on the seafront boulevard — the promenade and the beach are across the road. Wooden floors, a grey corner sofa bed in the living room and a separate bedroom.\n\nKitchenette with fridge, hob, microwave and kettle, shower room with toiletries, air conditioning, free Wi-Fi and a flat-screen TV. Tel Aviv is 8 km away.',
        photoLabel: 'seafront boulevard · 2 rooms',
      },
      ru: {
        title: 'Boulevard Suite 109',
        location: BEN_GURION.ru,
        description:
          'Компактная двухкомнатная квартира на приморском бульваре — набережная и пляж через дорогу. Деревянный пол, серый угловой диван-кровать в гостиной и отдельная спальня.\n\nКухня с холодильником, плитой, микроволновкой и чайником, душевая с косметикой, кондиционер, бесплатный Wi-Fi и телевизор. До Тель-Авива 8 км.',
        photoLabel: 'приморский бульвар · 2 комнаты',
      },
      he: {
        title: 'Boulevard Suite 109',
        location: BEN_GURION.he,
        description:
          'דירת שני חדרים קומפקטית על שדרות הים — הטיילת והחוף ממול. רצפת פרקט, ספה פינתית נפתחת בסלון וחדר שינה נפרד.\n\nמטבחון עם מקרר, כיריים, מיקרוגל וקומקום, חדר מקלחת, מיזוג אוויר, Wi-Fi חופשי וטלוויזיה. תל אביב במרחק 8 ק"מ.',
        photoLabel: 'שדרות הים · 2 חדרים',
      },
      fr: {
        title: 'Boulevard Suite 109',
        location: BEN_GURION.fr,
        description:
          'Un deux-pièces compact sur le boulevard du front de mer — la promenade et la plage sont juste en face. Parquet, canapé-lit d’angle gris au salon et chambre séparée.\n\nKitchenette avec réfrigérateur, plaques, micro-ondes et bouilloire, salle d’eau avec produits d’accueil, climatisation, Wi-Fi gratuit et téléviseur à écran plat. Tel Aviv est à 8 km.',
        photoLabel: 'boulevard du front de mer · 2 pièces',
      },
    },
  },
  {
    slug: 'boulevard-suite-330',
    folder: null,
    guests: 3,
    bedrooms: 1,
    beds: 2,
    bathrooms: 1,
    tagIds: ['nearBeach', 'equipped', 'central'],
    locales: {
      en: {
        title: 'Boulevard Suite 330',
        location: BEN_GURION.en,
        description:
          'A two-room apartment on the seafront boulevard, a minute from the promenade. A separate bedroom with a double bed and a living room with a sofa bed.\n\nFully equipped kitchen, washing machine, shower room, air conditioning, free Wi-Fi and Netflix. Tel Aviv is 8 km up the coast.',
        photoLabel: 'seafront boulevard · 2 rooms',
      },
      ru: {
        title: 'Boulevard Suite 330',
        location: BEN_GURION.ru,
        description:
          'Двухкомнатная квартира на приморском бульваре, минута до набережной. Отдельная спальня с двуспальной кроватью и гостиная с диваном-кроватью.\n\nПолностью укомплектованная кухня, стиральная машина, душевая, кондиционер, бесплатный Wi-Fi и Netflix. До Тель-Авива 8 км вдоль берега.',
        photoLabel: 'приморский бульвар · 2 комнаты',
      },
      he: {
        title: 'Boulevard Suite 330',
        location: BEN_GURION.he,
        description:
          'דירת שני חדרים על שדרות הים, דקה מהטיילת. חדר שינה נפרד עם מיטה זוגית וסלון עם ספה נפתחת.\n\nמטבח מאובזר, מכונת כביסה, חדר מקלחת, מיזוג אוויר, Wi-Fi חופשי ו-Netflix. תל אביב במרחק 8 ק"מ.',
        photoLabel: 'שדרות הים · 2 חדרים',
      },
      fr: {
        title: 'Boulevard Suite 330',
        location: BEN_GURION.fr,
        description:
          'Un deux-pièces sur le boulevard du front de mer, à une minute de la promenade. Une chambre séparée avec lit double et un salon avec canapé convertible.\n\nCuisine entièrement équipée, lave-linge, salle d’eau, climatisation, Wi-Fi gratuit et Netflix. Tel Aviv est à 8 km le long de la côte.',
        photoLabel: 'boulevard du front de mer · 2 pièces',
      },
    },
  },
  {
    slug: 'boulevard-nightfall-216',
    folder: 'Derech Ben Gurion 81, Bat Yam - 216',
    skip: [20, 22, 23, 26],
    cover: 1,
    guests: 3,
    bedrooms: 1,
    beds: 2,
    bathrooms: 1,
    tagIds: ['nearBeach', 'design', 'equipped'],
    locales: {
      en: {
        title: 'Boulevard Nightfall 216',
        location: BEN_GURION.en,
        description:
          'A two-room apartment with character: deep navy velvet sofas, a coffered ceiling with hidden lighting and a separate bedroom behind a sliding door.\n\nThe kitchen has a full-height fridge, hob, microwave and washing machine. Air conditioning, free Wi-Fi, Smart TV — and the seafront promenade across the boulevard.',
        photoLabel: 'design interior · 2 rooms',
      },
      ru: {
        title: 'Boulevard Nightfall 216',
        location: BEN_GURION.ru,
        description:
          'Двухкомнатная квартира с характером: тёмно-синие бархатные диваны, потолок с подсветкой и отдельная спальня за раздвижной дверью.\n\nНа кухне высокий холодильник, плита, микроволновка и стиральная машина. Кондиционер, бесплатный Wi-Fi, Smart TV — и набережная через бульвар.',
        photoLabel: 'дизайнерский интерьер · 2 комнаты',
      },
      he: {
        title: 'Boulevard Nightfall 216',
        location: BEN_GURION.he,
        description:
          'דירת שני חדרים עם אופי: ספות קטיפה בכחול עמוק, תקרה עם תאורה נסתרת וחדר שינה נפרד מאחורי דלת הזזה.\n\nבמטבח מקרר גבוה, כיריים, מיקרוגל ומכונת כביסה. מיזוג אוויר, Wi-Fi חופשי, סמארט טי-וי — והטיילת ממול.',
        photoLabel: 'עיצוב מיוחד · 2 חדרים',
      },
      fr: {
        title: 'Boulevard Nightfall 216',
        location: BEN_GURION.fr,
        description:
          'Un deux-pièces qui a du caractère : canapés en velours bleu nuit, plafond à caissons avec éclairage indirect et chambre séparée derrière une porte coulissante.\n\nLa cuisine dispose d’un grand réfrigérateur, de plaques, d’un micro-ondes et d’un lave-linge. Climatisation, Wi-Fi gratuit, Smart TV — et la promenade du bord de mer de l’autre côté du boulevard.',
        photoLabel: 'intérieur design · 2 pièces',
      },
    },
  },
  {
    slug: 'boulevard-bright-219',
    folder: 'Derech Ben Gurion 81, Bat Yam - 219',
    skip: [11, 12],
    cover: 1,
    guests: 3,
    bedrooms: 1,
    beds: 2,
    bathrooms: 1,
    tagIds: ['seaView', 'nearBeach', 'equipped'],
    locales: {
      en: {
        title: 'Boulevard Bright 219',
        location: BEN_GURION.en,
        description:
          'A light, uncluttered two-room apartment: white walls, a round dining table, a sofa bed in the living room and a double bedroom with a large wardrobe.\n\nKitchenette with fridge, hob and microwave, a graphite-tiled shower room, air conditioning and free Wi-Fi. The beach is a two-minute walk.',
        photoLabel: 'bright · minimal · 2 rooms',
      },
      ru: {
        title: 'Boulevard Bright 219',
        location: BEN_GURION.ru,
        description:
          'Светлая лаконичная двухкомнатная квартира: белые стены, круглый обеденный стол, диван-кровать в гостиной и спальня с большим шкафом.\n\nКухня с холодильником, плитой и микроволновкой, душевая в графитовой плитке, кондиционер и бесплатный Wi-Fi. До пляжа две минуты пешком.',
        photoLabel: 'светлая · лаконичная · 2 комнаты',
      },
      he: {
        title: 'Boulevard Bright 219',
        location: BEN_GURION.he,
        description:
          'דירת שני חדרים מוארת ונקייה מעומס: קירות לבנים, שולחן אוכל עגול, ספה נפתחת בסלון וחדר שינה עם ארון גדול.\n\nמטבחון עם מקרר, כיריים ומיקרוגל, חדר מקלחת בגוון גרפיט, מיזוג אוויר ו-Wi-Fi חופשי. החוף במרחק שתי דקות הליכה.',
        photoLabel: 'מוארת · נקייה · 2 חדרים',
      },
      fr: {
        title: 'Boulevard Bright 219',
        location: BEN_GURION.fr,
        description:
          'Un deux-pièces clair et épuré : murs blancs, table à manger ronde, canapé convertible au salon et chambre avec lit double et grande armoire.\n\nKitchenette avec réfrigérateur, plaques et micro-ondes, salle d’eau carrelée gris graphite, climatisation et Wi-Fi gratuit. La plage est à deux minutes à pied.',
        photoLabel: 'lumineux · épuré · 2 pièces',
      },
    },
  },
  {
    slug: 'boulevard-monochrome-765',
    folder: 'Derech Ben Gurion 81, Bat Yam - 765',
    skip: [14, 18],
    cover: 2,
    guests: 3,
    bedrooms: 1,
    beds: 2,
    bathrooms: 1,
    tagIds: ['nearBeach', 'design', 'equipped'],
    locales: {
      en: {
        title: 'Boulevard Monochrome 765',
        location: BEN_GURION.en,
        description:
          'A black-and-white two-room apartment, styled down to the table setting: marble floors, a grey corner sofa, a laid dining table and a double bedroom with a dark headboard.\n\nWhite kitchen with fridge, hob, microwave and washing machine; shower room with toiletries. Air conditioning, free Wi-Fi, Smart TV, promenade across the road.',
        photoLabel: 'black & white · styled · 2 rooms',
      },
      ru: {
        title: 'Boulevard Monochrome 765',
        location: BEN_GURION.ru,
        description:
          'Чёрно-белая двухкомнатная квартира, продуманная до сервировки стола: мраморный пол, серый угловой диван, накрытый обеденный стол и спальня с тёмным изголовьем.\n\nБелая кухня с холодильником, плитой, микроволновкой и стиральной машиной; душевая с косметикой. Кондиционер, бесплатный Wi-Fi, Smart TV, набережная через дорогу.',
        photoLabel: 'чёрно-белая · стильная · 2 комнаты',
      },
      he: {
        title: 'Boulevard Monochrome 765',
        location: BEN_GURION.he,
        description:
          'דירת שני חדרים בשחור-לבן, מעוצבת עד לעריכת השולחן: רצפת שיש, ספה פינתית אפורה וחדר שינה עם ראש מיטה כהה.\n\nמטבח לבן עם מקרר, כיריים, מיקרוגל ומכונת כביסה; חדר מקלחת. מיזוג אוויר, Wi-Fi חופשי, סמארט טי-וי, הטיילת ממול.',
        photoLabel: 'שחור-לבן · מעוצבת · 2 חדרים',
      },
      fr: {
        title: 'Boulevard Monochrome 765',
        location: BEN_GURION.fr,
        description:
          'Un deux-pièces en noir et blanc, soigné jusqu’à la table dressée : sols en marbre, canapé d’angle gris, table à manger dressée et chambre avec tête de lit sombre.\n\nCuisine blanche avec réfrigérateur, plaques, micro-ondes et lave-linge ; salle d’eau avec produits d’accueil. Climatisation, Wi-Fi gratuit, Smart TV, promenade de l’autre côté de la rue.',
        photoLabel: 'noir et blanc · design · 2 pièces',
      },
    },
  },
  {
    slug: 'sunset-sea-view-101',
    folder: 'Derech Ben Gurion 81, Bat Yam - 101',
    guests: 3,
    bedrooms: 1,
    beds: 2,
    bathrooms: 1,
    tagIds: ['seaView', 'nearBeach', 'equipped'],
    locales: {
      en: {
        title: 'Sunset Sea View 101',
        location: BEN_GURION.en,
        description:
          'The sea is right there in the window: this two-room apartment looks straight out at the water, and the sunsets are the reason guests come back.\n\nA double bedroom, a living room with a sofa bed and a dining corner, kitchenette with fridge, hob, microwave and washing machine. Air conditioning, free Wi-Fi, TV. The beach is across the boulevard.',
        photoLabel: 'sea view · sunsets · 2 rooms',
      },
      ru: {
        title: 'Sunset Sea View 101',
        location: BEN_GURION.ru,
        description:
          'Море прямо в окне: двухкомнатная квартира смотрит на воду, и закаты здесь — отдельная причина вернуться.\n\nСпальня с двуспальной кроватью, гостиная с диваном-кроватью и обеденной зоной, кухня с холодильником, плитой, микроволновкой и стиральной машиной. Кондиционер, бесплатный Wi-Fi, телевизор. Пляж через бульвар.',
        photoLabel: 'вид на море · закаты · 2 комнаты',
      },
      he: {
        title: 'Sunset Sea View 101',
        location: BEN_GURION.he,
        description:
          'הים ממש בחלון: דירת שני חדרים עם מבט ישיר למים, והשקיעות הן סיבה בפני עצמה לחזור.\n\nחדר שינה זוגי, סלון עם ספה נפתחת ופינת אוכל, מטבחון עם מקרר, כיריים, מיקרוגל ומכונת כביסה. מיזוג אוויר, Wi-Fi חופשי, טלוויזיה. החוף ממול.',
        photoLabel: 'נוף לים · שקיעות · 2 חדרים',
      },
      fr: {
        title: 'Sunset Sea View 101',
        location: BEN_GURION.fr,
        description:
          'La mer est là, dans la fenêtre : ce deux-pièces donne directement sur l’eau, et les couchers de soleil sont la raison pour laquelle nos hôtes reviennent.\n\nUne chambre avec lit double, un salon avec canapé convertible et coin repas, une kitchenette avec réfrigérateur, plaques, micro-ondes et lave-linge. Climatisation, Wi-Fi gratuit, téléviseur. La plage est de l’autre côté du boulevard.',
        photoLabel: 'vue mer · couchers de soleil · 2 pièces',
      },
    },
  },
  {
    slug: 'panorama-sea-view-542',
    folder: 'Derech Ben Gurion 81, Bat Yam - 542',
    cover: 3,
    guests: 3,
    bedrooms: 1,
    beds: 2,
    bathrooms: 1,
    tagIds: ['seaView', 'premium', 'nearBeach'],
    locales: {
      en: {
        title: 'Panorama Sea View 542',
        location: BEN_GURION.en,
        description:
          'A high-floor apartment with a panoramic view over the promenade, the palm-lined boulevard and the open sea — floor-to-ceiling windows on two sides.\n\nBright living room with a sofa and a reading chair, a double bedroom, a full kitchen, air conditioning, free Wi-Fi and a large Smart TV. The beach is a three-minute walk down.',
        photoLabel: 'panoramic sea view · high floor',
      },
      ru: {
        title: 'Panorama Sea View 542',
        location: BEN_GURION.ru,
        description:
          'Квартира на высоком этаже с панорамой на набережную, бульвар с пальмами и открытое море — окна во всю стену с двух сторон.\n\nСветлая гостиная с диваном и креслом для чтения, спальня, полноценная кухня, кондиционер, бесплатный Wi-Fi и большой Smart TV. До пляжа три минуты вниз.',
        photoLabel: 'панорама моря · высокий этаж',
      },
      he: {
        title: 'Panorama Sea View 542',
        location: BEN_GURION.he,
        description:
          'דירה בקומה גבוהה עם נוף פנורמי לטיילת, לשדרה ולים הפתוח — חלונות גדולים משני כיוונים.\n\nסלון מואר עם ספה וכורסה, חדר שינה זוגי, מטבח מלא, מיזוג אוויר, Wi-Fi חופשי וסמארט טי-וי גדול. החוף במרחק שלוש דקות.',
        photoLabel: 'נוף פנורמי לים · קומה גבוהה',
      },
      fr: {
        title: 'Panorama Sea View 542',
        location: BEN_GURION.fr,
        description:
          'Un appartement en étage élevé avec vue panoramique sur la promenade, le boulevard bordé de palmiers et la mer ouverte — baies vitrées sur deux côtés.\n\nSalon lumineux avec canapé et fauteuil de lecture, une chambre avec lit double, une cuisine complète, la climatisation, le Wi-Fi gratuit et un grand Smart TV. La plage est à trois minutes à pied.',
        photoLabel: 'vue mer panoramique · étage élevé',
      },
    },
  },
  {
    slug: 'independence-blue-suite',
    folder: 'Ha_Atsmaut Blvd 23 - 2.5 Rooms',
    skip: [4, 17],
    cover: 6,
    guests: 3,
    bedrooms: 1,
    beds: 2,
    bathrooms: 1,
    tagIds: ['family', 'equipped', 'central'],
    locales: {
      en: {
        title: 'Independence Blue Suite',
        location: ATSMAUT.en,
        description:
          'Two and a half rooms on the city’s main boulevard: a double bedroom, a living room with a deep blue sofa and dining table, and a small extra room with a day bed.\n\nKitchen with fridge, hob, microwave and everything for cooking, a new shower room, air conditioning and free Wi-Fi. Shops, cafés and the bus to Tel Aviv are at the door.',
        photoLabel: '2.5 rooms · extra room · central',
      },
      ru: {
        title: 'Independence Blue Suite',
        location: ATSMAUT.ru,
        description:
          'Две с половиной комнаты на главном бульваре города: спальня, гостиная с синим диваном и обеденным столом и маленькая дополнительная комната с кушеткой.\n\nКухня с холодильником, плитой, микроволновкой и всей утварью, новая душевая, кондиционер и бесплатный Wi-Fi. Магазины, кафе и автобус до Тель-Авива — у подъезда.',
        photoLabel: '2.5 комнаты · доп. комната · центр',
      },
      he: {
        title: 'Independence Blue Suite',
        location: ATSMAUT.he,
        description:
          'שניים וחצי חדרים על השדרה המרכזית: חדר שינה זוגי, סלון עם ספה כחולה ושולחן אוכל, וחדרון נוסף עם מיטת יום.\n\nמטבח עם מקרר, כיריים ומיקרוגל, חדר מקלחת חדש, מיזוג אוויר ו-Wi-Fi חופשי. חנויות, בתי קפה והאוטובוס לתל אביב ליד הבית.',
        photoLabel: '2.5 חדרים · חדר נוסף · מרכזי',
      },
      fr: {
        title: 'Independence Blue Suite',
        location: ATSMAUT.fr,
        description:
          'Deux pièces et demie sur le boulevard principal de la ville : une chambre avec lit double, un salon avec canapé bleu profond et table à manger, et une petite pièce supplémentaire avec lit de repos.\n\nCuisine avec réfrigérateur, plaques, micro-ondes et tout le nécessaire pour cuisiner, salle d’eau neuve, climatisation et Wi-Fi gratuit. Commerces, cafés et le bus pour Tel Aviv sont au pied de l’immeuble.',
        photoLabel: '2,5 pièces · pièce en plus · central',
      },
    },
  },
  {
    slug: 'independence-magenta-studio',
    folder: 'Ha_Atsmaut Blvd 23 - Studio',
    skip: [4, 12],
    cover: 1,
    guests: 2,
    bedrooms: 1,
    beds: 1,
    bathrooms: 1,
    tagIds: ['central', 'equipped', 'design'],
    locales: {
      en: {
        title: 'Independence Magenta Studio',
        location: ATSMAUT.en,
        description:
          'A studio for two with a magenta feature wall, a double bed, a wardrobe and a little bistro table set for dinner.\n\nKitchenette with hob, fridge and microwave, private shower room, fresh towels, air conditioning and free Wi-Fi — right on the boulevard, ten minutes from the sea.',
        photoLabel: 'studio for two · central',
      },
      ru: {
        title: 'Independence Magenta Studio',
        location: ATSMAUT.ru,
        description:
          'Студия для двоих с акцентной стеной цвета фуксии, двуспальной кроватью, шкафом и маленьким сервированным столиком.\n\nКухонный уголок с плитой, холодильником и микроволновкой, свой душ, свежие полотенца, кондиционер и бесплатный Wi-Fi — прямо на бульваре, десять минут до моря.',
        photoLabel: 'студия для двоих · центр',
      },
      he: {
        title: 'Independence Magenta Studio',
        location: ATSMAUT.he,
        description:
          'סטודיו לזוג עם קיר בגוון מג׳נטה, מיטה זוגית, ארון ושולחן קטן ערוך לארוחה.\n\nמטבחון עם כיריים, מקרר ומיקרוגל, חדר מקלחת פרטי, מגבות, מיזוג אוויר ו-Wi-Fi חופשי — על השדרה, עשר דקות מהים.',
        photoLabel: 'סטודיו לזוג · מרכזי',
      },
      fr: {
        title: 'Independence Magenta Studio',
        location: ATSMAUT.fr,
        description:
          'Un studio pour deux avec un mur magenta, un lit double, une armoire et une petite table bistro dressée pour le dîner.\n\nKitchenette avec plaques, réfrigérateur et micro-ondes, salle d’eau privée, serviettes fraîches, climatisation et Wi-Fi gratuit — sur le boulevard même, à dix minutes de la mer.',
        photoLabel: 'studio pour deux · central',
      },
    },
  },
  {
    slug: 'agnon-grand-studio',
    folder: 'Shay Agnon 3 Bat Yam - Studio',
    skip: [3, 10, 11],
    cover: 1,
    guests: 2,
    bedrooms: 1,
    beds: 1,
    bathrooms: 1,
    tagIds: ['equipped', 'central', 'design'],
    locales: {
      en: {
        title: 'Agnon Grand Studio',
        location: AGNON.en,
        description:
          'A generous studio in black and white: a double bed with a tufted headboard, an armchair, a work-and-dining table and a full-length mirror.\n\nGranite-topped kitchen with fridge, hob, microwave and kettle, a bright shower room with toiletries, air conditioning and free Wi-Fi. Quiet street, five minutes from the boulevard.',
        photoLabel: 'large studio · black & white',
      },
      ru: {
        title: 'Agnon Grand Studio',
        location: AGNON.ru,
        description:
          'Просторная студия в чёрно-белой гамме: двуспальная кровать с каретным изголовьем, кресло, стол для работы и еды, зеркало в полный рост.\n\nКухня со столешницей из гранита, холодильником, плитой, микроволновкой и чайником, светлая душевая с косметикой, кондиционер и бесплатный Wi-Fi. Тихая улица, пять минут до бульвара.',
        photoLabel: 'большая студия · чёрно-белая',
      },
      he: {
        title: 'Agnon Grand Studio',
        location: AGNON.he,
        description:
          'סטודיו מרווח בשחור-לבן: מיטה זוגית עם ראש מיטה מרופד, כורסה, שולחן לעבודה ולארוחות ומראה גדולה.\n\nמטבח עם משטח גרניט, מקרר, כיריים, מיקרוגל וקומקום, חדר מקלחת מואר, מיזוג אוויר ו-Wi-Fi חופשי. רחוב שקט, חמש דקות מהשדרה.',
        photoLabel: 'סטודיו גדול · שחור-לבן',
      },
      fr: {
        title: 'Agnon Grand Studio',
        location: AGNON.fr,
        description:
          'Un studio spacieux en noir et blanc : lit double avec tête de lit capitonnée, fauteuil, table pour travailler et dîner, et miroir pleine hauteur.\n\nCuisine avec plan de travail en granit, réfrigérateur, plaques, micro-ondes et bouilloire, salle d’eau claire avec produits d’accueil, climatisation et Wi-Fi gratuit. Rue calme, à cinq minutes du boulevard.',
        photoLabel: 'grand studio · noir et blanc',
      },
    },
  },
  {
    slug: 'seaside-designer-five',
    folder: '14 - Spacious 5-Room with Balcony',
    cover: 8,
    guests: 8,
    bedrooms: 4,
    beds: 4,
    bathrooms: 2,
    tagIds: ['balcony', 'family', 'premium', 'design', 'equipped'],
    locales: {
      en: {
        title: 'Seaside Designer Five',
        location: BAT_YAM.en,
        description:
          'A five-room designer apartment for a large family or two families travelling together — four bedrooms, two bathrooms (one with a bathtub) and a wide balcony with a gas grill and a city view.\n\nThe kitchen is the heart of it: a deep-blue fitted kitchen with an island and induction hob. Air conditioning throughout, free Wi-Fi, Smart TVs, washing machine. A short walk to the sea.',
        photoLabel: '5 rooms · balcony with grill · design',
      },
      ru: {
        title: 'Seaside Designer Five',
        location: BAT_YAM.ru,
        description:
          'Пятикомнатная дизайнерская квартира для большой семьи или двух семей вместе — четыре спальни, два санузла (в одном ванна) и широкий балкон с грилем и видом на город.\n\nГлавное здесь — кухня: глубокий синий гарнитур с островом и индукционной плитой. Кондиционеры во всех комнатах, бесплатный Wi-Fi, Smart TV, стиральная машина. До моря — короткая прогулка.',
        photoLabel: '5 комнат · балкон с грилем · дизайн',
      },
      he: {
        title: 'Seaside Designer Five',
        location: BAT_YAM.he,
        description:
          'דירת חמישה חדרים מעוצבת למשפחה גדולה או לשתי משפחות — ארבעה חדרי שינה, שני חדרי רחצה (באחד אמבטיה) ומרפסת רחבה עם גריל גז ונוף לעיר.\n\nלב הדירה הוא המטבח: מטבח כחול עמוק עם אי וכיריים אינדוקציה. מיזוג בכל החדרים, Wi-Fi חופשי, סמארט טי-וי ומכונת כביסה. הליכה קצרה לים.',
        photoLabel: '5 חדרים · מרפסת עם גריל · עיצוב',
      },
      fr: {
        title: 'Seaside Designer Five',
        location: BAT_YAM.fr,
        description:
          'Un appartement de cinq pièces au design soigné, pour une grande famille ou deux familles voyageant ensemble — quatre chambres, deux salles de bain (dont une avec baignoire) et un large balcon avec barbecue à gaz et vue sur la ville.\n\nLa cuisine en est le cœur : bleu profond, avec îlot et plaques à induction. Climatisation dans toutes les pièces, Wi-Fi gratuit, Smart TV, lave-linge. La mer est à quelques minutes à pied.',
        photoLabel: '5 pièces · balcon avec barbecue · design',
      },
    },
  },
  {
    slug: 'sky26-pool-penthouse',
    folder: '15 - Sky26 Mini Penthouse',
    skip: [20, 22, 25],
    cover: 18,
    guests: 10,
    bedrooms: 5,
    beds: 5,
    bathrooms: 2,
    tagIds: ['premium', 'terrace', 'seaView', 'design', 'equipped'],
    locales: {
      en: {
        title: 'Sky26 Pool Penthouse',
        location: BAT_YAM.en,
        description:
          'A six-room mini-penthouse at the top of the Sky26 tower, with a private pool and a furnished roof terrace with sun loungers and a lounge area.\n\nInside: an open living and dining space the length of the flat, five bedrooms (the master with its own bathroom), two bathrooms, a designer kitchen, laundry room, air conditioning and free Wi-Fi. The best address we let.',
        photoLabel: 'private pool · roof terrace · penthouse',
      },
      ru: {
        title: 'Sky26 Pool Penthouse',
        location: BAT_YAM.ru,
        description:
          'Шестикомнатный мини-пентхаус на верху башни Sky26, с собственным бассейном и обустроенной террасой на крыше — шезлонги и лаундж-зона.\n\nВнутри: сквозная гостиная-столовая во всю длину квартиры, пять спален (в главной свой санузел), два санузла, дизайнерская кухня, постирочная, кондиционеры и бесплатный Wi-Fi. Лучший адрес из всех, что мы сдаём.',
        photoLabel: 'бассейн · терраса на крыше · пентхаус',
      },
      he: {
        title: 'Sky26 Pool Penthouse',
        location: BAT_YAM.he,
        description:
          'מיני-פנטהאוז בן שישה חדרים בראש מגדל Sky26, עם בריכה פרטית ומרפסת גג מרוהטת עם מיטות שיזוף ופינת ישיבה.\n\nבפנים: חלל סלון ואוכל פתוח לאורך הדירה, חמישה חדרי שינה (בחדר ההורים חדר רחצה צמוד), שני חדרי רחצה, מטבח מעוצב, חדר כביסה, מיזוג ו-Wi-Fi חופשי. הכתובת הטובה ביותר שלנו.',
        photoLabel: 'בריכה פרטית · מרפסת גג · פנטהאוז',
      },
      fr: {
        title: 'Sky26 Pool Penthouse',
        location: BAT_YAM.fr,
        description:
          'Un mini-penthouse de six pièces au sommet de la tour Sky26, avec piscine privée et terrasse sur le toit aménagée : transats et coin salon.\n\nÀ l’intérieur : un espace salon-salle à manger ouvert sur toute la longueur de l’appartement, cinq chambres (la principale avec sa propre salle de bain), deux salles de bain, une cuisine design, une buanderie, la climatisation et le Wi-Fi gratuit. La plus belle adresse que nous louons.',
        photoLabel: 'piscine privée · terrasse sur le toit · penthouse',
      },
    },
  },
];
