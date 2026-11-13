// Maison Matcha — shop settings, menu and prices. Edit here; /menu, /matcha and /order all update.
/* ───────── Shop settings ───────── */
const SHOP_WHATSAPP = '8562051111711';          // shop WhatsApp with country code, digits only, e.g. '8562099999999'
const DELIVERY_ENABLED = true;     // false hides the delivery option
const OAT_PRICE = 10000;
const SWEETNESS = [0, 25, 50, 70, 100];
const STAFF = ['PHET', 'ALONG', 'NAMFON', 'BEE']; // staff who take dine-in orders
// Nutty Reserve on signature drinks = signature price + the collection's Nutty Reserve difference for the closest style
// (Pure/Coconut +26,000; Latte/Cold whisk +30,000 — from the Matcha Collection price card).
const NUTTY_SIGNATURE_PRICE = {
  'coconut-velvet': 119000 + 26000,    // coconut-water base
  'pure-oat': 110000 + 30000,          // cold whisk
  'earl-grey': 115000 + 30000,         // latte
  'maison-cold-whisk': 110000 + 30000, // cold whisk
  'on-cloud': 90000 + 30000,           // latte
};

/* ───────── Menu (from the current public menu, LAK) ───────── */
const WAYS = (p) => [
  { key: 'pure', lo: 'ມັດຊະໃສ', en: 'Pure', price: p[0], oat: false },
  { key: 'latte', lo: 'ລາເຕ້', en: 'Latte', price: p[1], oat: true },
  { key: 'cold_whisk', lo: 'ຕີເຢັນ', en: 'Cold whisk', price: p[2], oat: true },
  { key: 'coconut', lo: 'ນ້ຳໝາກພ້າວ', en: 'Coconut water', price: p[3], oat: false },
];
const MATCHAS = [
  { key: 'house', lo: 'ຕາມສູດຂອງຮ້ານ', en: 'House recipe' },
  { key: 'no1', code: 'Maison No.1', lo: 'ໂຣສເຕັດ ເວວເວັດ', en: 'Roasted Velvet' },
  { key: 'no2', code: 'Maison No.2', lo: 'ເອເມີຣັລ ອູມາມິ', en: 'Emerald Umami' },
  { key: 'no3', code: 'Maison No.3', lo: 'ນັດຕີ້ ຣີເຊີບ', en: 'Nutty Reserve' },
];
const CATEGORIES = [
  { id: 'classic', lo: 'ເມນູຄລາສສິກ', en: 'The classics' },
  { id: 'signature', lo: 'ເມນູຊິກເນເຈີ', en: 'Maison signatures' },
  { id: 'collection', lo: 'ຄໍເລັກຊັນມັດຊະ', en: 'Matcha collection', intro: { lo: 'ເລືອກມັດຊະທີ່ມັກ ແລ້ວຊົງໃນແບບຂອງທ່ານ.', en: 'Choose your matcha. Make it your way.' } },
];
// matcha: matcha choice offered; nutty: price with Nutty Reserve (from the collection prices for the same style);
// oat: oat milk swap (only drinks made with milk); sweet: sweetness level.
const PRODUCTS = [
  { id: 'original', cat: 'classic', lo: 'ມັດຊະໃສສູດດັ້ງເດີມ', en: 'Original', price: 79000, matcha: true, nutty: 105000, oat: false, sweet: true, img: '/assets/img/original.webp',
    d: { lo: 'ມັດຊະ ແລະ ນ້ຳບໍລິສຸດ ເພື່ອໃຫ້ສຳຜັດລົດຊາດທຳມະຊາດຂອງຊາແຕ່ລະຊະນິດ.', en: 'Just matcha and pure water, allowing each tea’s natural character to shine.' } },
  { id: 'latte', cat: 'classic', lo: 'ມັດຊະລາເຕ້', en: 'Matcha Latte', price: 95000, matcha: true, nutty: 125000, oat: true, sweet: true, img: '/assets/img/latte.webp',
    d: { lo: 'ມັດຊະເກຣດພິທີການປະສົມກັບນົມເນື້ອນຸ່ມ ໃຫ້ລົດຊາດລະມຸນ ແລະ ກົມກ່ອມ.', en: 'Ceremonial matcha blended with silky milk for a smooth, balanced cup.' } },
  { id: 'coconut-clear', cat: 'classic', lo: 'ມັດຊະໃສນ້ຳໝາກພ້າວ', en: 'Coconut Clear', price: 79000, matcha: true, nutty: 105000, oat: false, sweet: true, img: '/assets/img/coconut-clear.webp',
    d: { lo: 'ມັດຊະປະສົມກັບນ້ຳໝາກພ້າວ ໃຫ້ກິ່ນຫອມຊາ ແລະ ຄວາມຫວານອ່ອນໆຕາມທຳມະຊາດ.', en: 'Matcha and coconut water, bringing together natural tea character and gentle coconut sweetness.' } },
  { id: 'coconut-velvet', cat: 'signature', lo: 'ໂຄໂຄນັດ ເວວເວັດ', en: 'Coconut Velvet', price: 119000, matcha: true, oat: false, sweet: true, img: '/assets/img/coconut-clear.webp',
    taste: { lo: 'ຫອມຖົ່ວ · ກິ່ນຄວັນອ່ອນໆ · ອູມາມິ', en: 'Nutty · Smoky · Umami' },
    d: { lo: 'ມັດຊະ, ນ້ຳໝາກພ້າວ ແລະ ນົມໂອ໊ດ ໃຫ້ຄວາມຫອມມັນນຸ່ມນວນ, ຫວານອ່ອນໆ ແລະ ອູມາມິທີ່ລ້ຳເລິກ.', en: 'Matcha, coconut water and silky oat milk: naturally creamy, lightly sweet, deeply umami.' } },
  { id: 'pure-oat', cat: 'signature', lo: 'ເພີວໂອ໊ດ ໂຄລດ໌ວິສກ໌', en: 'Pure Oat Cold Whisk', price: 110000, matcha: true, oat: false, sweet: true, img: '/assets/img/oat-cold-whisk.webp',
    taste: { lo: 'ປານີດ · ອູມາມິ · ສະອາດ', en: 'Refined · Umami · Clean' },
    d: { lo: 'Emerald Umami ຊົງເຢັນປະສົມກັບນົມໂອ໊ດ ໃຫ້ລົດຊາດປານີດ, ສະອາດ ແລະ ຫວານນຸ່ມນວນຕາມທຳມະຊາດ.', en: 'Emerald Umami whisked cold with silky oat milk: refined, clean and naturally sweet.' } },
  { id: 'earl-grey', cat: 'signature', lo: 'ເອີລເກຣ ມັດຊະ', en: 'Earl Grey Matcha', price: 115000, matcha: true, oat: true, sweet: true, img: '/assets/img/earl-grey.webp',
    taste: { lo: 'ຫອມດອກໄມ້ · ຫອມມັນນົມ · ກິ່ນຫອມອົບອວນ', en: 'Floral · Creamy · Aromatic' },
    d: { lo: 'Roasted Velvet ປະສົມກັບນົມສູດພິເສດຂອງຮ້ານ ແລະ ໄຊຣັບຊາ Earl Grey ໃຫ້ກິ່ນຫອມອົບອວນ ແລະ ລົດຊາດຊາທີ່ນຸ່ມນວນ.', en: 'Roasted Velvet, our house milk blend and Earl Grey syrup: fragrant matcha with a delicate tea finish.' } },
  { id: 'maison-cold-whisk', cat: 'signature', lo: 'ເມຊົງ ໂຄລດ໌ວິສກ໌', en: 'Maison’s Cold Whisk', price: 110000, matcha: true, oat: true, sweet: true, img: '/assets/img/oat-cold-whisk.webp',
    taste: { lo: 'ນຸ່ມນວນ · ອູມາມິ · ນົວນົມ', en: 'Silky · Umami · Creamy' },
    d: { lo: 'ມັດຊະຕີເຢັນປະສົມກັບນົມສູດພິເສດຂອງຮ້ານ ໃຫ້ເນື້ອນຸ່ມນວນ, ອູມາມິທີ່ກົມກ່ອມ ແລະ ກິ່ນຫອມຊາ.', en: 'Matcha cold-whisked with our house milk blend for a silky texture, rich umami and delicate tea aroma.' } },
  { id: 'on-cloud', cat: 'signature', lo: 'ເມຊົງ ອອນຄລາວດ໌', en: 'Maison’s On Cloud', price: 90000, matcha: true, oat: true, sweet: true, img: '/assets/img/on-cloud.webp',
    d: { lo: 'ມັດຊະເຢັນສູດຊິກເນເຈີ ທັອບດ້ວຍຄຣີມວານິລາເນື້ອນຸ່ມ ລົດເຄັມອ່ອນໆ ໃຫ້ອູມາມິລ້ຳເລິກປະສານກັບຄວາມຫວານລະມຸນ.', en: 'Our signature iced matcha beneath a silky, lightly salted vanilla cream cloud, balancing deep umami and airy sweetness.' } },
  { id: 'roasted-velvet', cat: 'collection', code: 'Maison No.1', lo: 'ໂຣສເຕັດ ເວວເວັດ', en: 'Roasted Velvet', ways: WAYS([79000, 95000, 115000, 79000]), oat: true, sweet: true, img: '/assets/img/roasted-velvet.webp',
    taste: { lo: 'ເຂັ້ມຂຸ້ນ | ຫອມຖົ່ວ | ກິ່ນຄວັນ', en: 'Bold | Nutty | Smoky' },
    d: { lo: 'ມັດຊະເກຣດພິທີການລົດຊາດເຂັ້ມຂຸ້ນ ມີກິ່ນຫອມຖົ່ວຄົ່ວເດັ່ນຊັດ, ອູມາມິລ້ຳເລິກ ແລະ ກິ່ນຄວັນອ່ອນໆ.', en: 'A rich ceremonial matcha with pronounced roasted-nut character, deep umami and a gentle smoky aroma.' } },
  { id: 'emerald-umami', cat: 'collection', code: 'Maison No.2', lo: 'ເອເມີຣັລ ອູມາມິ', en: 'Emerald Umami', ways: WAYS([79000, 95000, 115000, 79000]), oat: true, sweet: true, img: '/assets/img/emerald-umami.webp',
    taste: { lo: 'ຫວານທຳມະຊາດ | ລ້ຳເລິກ | ປານີດ', en: 'Sweet | Deep | Refined' },
    d: { lo: 'ມັດຊະເກຣດພິທີການສີຂຽວເຂັ້ມ ເລີ່ມດ້ວຍຄວາມຫວານທຳມະຊາດ ແລະ ອູມາມິທີ່ຊັດເຈນ.', en: 'An intensely green ceremonial matcha with a naturally sweet opening and clear umami.' } },
  { id: 'nutty-reserve', cat: 'collection', code: 'Maison No.3', lo: 'ນັດຕີ້ ຣີເຊີບ', en: 'Nutty Reserve', ways: WAYS([105000, 125000, 145000, 105000]), oat: true, sweet: true, img: '/assets/img/nutty-reserve.webp',
    taste: { lo: 'ເຂັ້ມຂຸ້ນ | ຫອມຖົ່ວ | ກິ່ນຄວັນອ່ອນໆ', en: 'Rich | Nutty | Gently smoky' },
    d: { lo: 'ຫອມຖົ່ວດິນຄົ່ວ, ອູມາມິນຸ່ມນວນ ແລະ ກິ່ນຄວັນບາງໆ, ຂົມໜ້ອຍຫຼາຍ.', en: 'Single-cultivar ceremonial matcha from Uji, Kyoto, shaded 21 days before the first spring harvest. Roasted-peanut aroma, smooth umami.' } },
];
const BY_ID = new Map(PRODUCTS.map((p) => [p.id, p]));

// Longer descriptions for the Our matcha page (from the public menu).
const LONG = {
  'roasted-velvet': { lo: 'ມັດຊະເກຣດພິທີການລົດຊາດເຂັ້ມຂຸ້ນ ມີກິ່ນຫອມຖົ່ວຄົ່ວເດັ່ນຊັດ, ອູມາມິລ້ຳເລິກ ແລະ ກິ່ນຄວັນອ່ອນໆ. ເນື້ອສຳຜັດນຸ່ມນວນ ພ້ອມກິ່ນຫອມຄົ່ວທີ່ຕິດປາຍລີ້ນ.',
    en: 'A rich ceremonial matcha with pronounced roasted-nut character, deep umami and a gentle smoky aroma. Full-bodied and smooth, with a lingering roasted finish.' },
  'emerald-umami': { lo: 'ມັດຊະເກຣດພິທີການສີຂຽວເຂັ້ມ ເລີ່ມດ້ວຍຄວາມຫວານທຳມະຊາດ ແລະ ອູມາມິທີ່ຊັດເຈນ. ນຸ່ມນວນປານີດ, ລົດຊາດຫຼັງດື່ມສະອາດ ແລະ ຂົມໜ້ອຍຫຼາຍ.',
    en: 'An intensely green ceremonial matcha with a naturally sweet opening and clear umami. Smooth and refined, with a clean finish and very little bitterness.' },
  'nutty-reserve': { lo: 'ຫອມຖົ່ວດິນຄົ່ວ, ອູມາມິນຸ່ມນວນ ແລະ ກິ່ນຄວັນບາງໆ, ຂົມໜ້ອຍຫຼາຍ.',
    en: 'A single-cultivar ceremonial matcha from Uji, Kyoto, grown without pesticides and shaded for 21 days before the first spring harvest. Roasted-peanut and toasted-nut aromas unfold into smooth umami, with a delicate smoky finish and very little bitterness.' },
};
PRODUCTS.forEach((p) => { if (LONG[p.id]) p.long = LONG[p.id]; });
