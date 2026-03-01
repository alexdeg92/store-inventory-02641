export interface Product {
  id: number;
  name: string;
  priceCategory: number;
  packQty: number;
  category: 'lottery' | 'cigarette';
  supabaseId?: string; // populated at runtime
}

export const PRODUCTS: Product[] = [
  // $2
  { id: 1,  name: 'Mots Cachés (vert)',       priceCategory: 2,  packQty: 10, category: 'lottery' },
  { id: 2,  name: 'Mots Cachés (violet)',     priceCategory: 2,  packQty: 10, category: 'lottery' },
  { id: 3,  name: '777',                      priceCategory: 2,  packQty: 10, category: 'lottery' },
  { id: 4,  name: '3 en folie',               priceCategory: 2,  packQty: 10, category: 'lottery' },
  { id: 5,  name: 'Poule',                    priceCategory: 2,  packQty: 15, category: 'lottery' },
  // $3
  { id: 6,  name: 'Jeu de mots (noir)',       priceCategory: 3,  packQty: 10, category: 'lottery' },
  { id: 7,  name: 'Scrabble',                 priceCategory: 3,  packQty: 15, category: 'lottery' },
  { id: 8,  name: 'Slingoen folie',           priceCategory: 3,  packQty: 10, category: 'lottery' },
  { id: 9,  name: 'Bingo',                    priceCategory: 3,  packQty: 10, category: 'lottery' },
  { id: 10, name: 'Zone tropicale',           priceCategory: 3,  packQty: 10, category: 'lottery' },
  { id: 11, name: 'Connection',               priceCategory: 3,  packQty: 10, category: 'lottery' },
  { id: 12, name: 'le 31',                    priceCategory: 3,  packQty: 10, category: 'lottery' },
  // $5
  { id: 13, name: 'Mot caches (musique)',     priceCategory: 5,  packQty: 5,  category: 'lottery' },
  { id: 14, name: 'Gagnant a vie (bleu)',     priceCategory: 5,  packQty: 20, category: 'lottery' },
  { id: 15, name: '777',                      priceCategory: 5,  packQty: 10, category: 'lottery' },
  { id: 16, name: 'Poule',                    priceCategory: 5,  packQty: 15, category: 'lottery' },
  { id: 17, name: 'Amethyste',                priceCategory: 5,  packQty: 10, category: 'lottery' },
  // $10
  { id: 18, name: 'Ultra',                    priceCategory: 10, packQty: 5,  category: 'lottery' },
  { id: 19, name: '50$ et 100$ en masse',     priceCategory: 10, packQty: 10, category: 'lottery' },
  { id: 20, name: 'Giga 360',                 priceCategory: 10, packQty: 10, category: 'lottery' },
  // $20
  { id: 21, name: '2 million$ diamant',       priceCategory: 20, packQty: 10, category: 'lottery' },
  { id: 22, name: 'retour vers le future',    priceCategory: 20, packQty: 10, category: 'lottery' },
  { id: 23, name: 'La course aux lingots',    priceCategory: 20, packQty: 10, category: 'lottery' },
  { id: 24, name: 'Casino',                   priceCategory: 20, packQty: 10, category: 'lottery' },
  // $30
  { id: 25, name: '30X',                      priceCategory: 30, packQty: 10, category: 'lottery' },
  // $50
  { id: 26, name: 'Extreme',                  priceCategory: 50, packQty: 5,  category: 'lottery' },
  // Cigarettes
  { id: 27, name: 'du Maurier Signature',     priceCategory: 0,  packQty: 1,  category: 'cigarette' },
  { id: 28, name: 'du Maurier Distinct',      priceCategory: 0,  packQty: 1,  category: 'cigarette' },
  { id: 29, name: 'du Maurier Distinct Plus', priceCategory: 0,  packQty: 1,  category: 'cigarette' },
  { id: 30, name: 'du Maurier Original',      priceCategory: 0,  packQty: 1,  category: 'cigarette' },
  { id: 31, name: 'du Maurier Velouté',       priceCategory: 0,  packQty: 1,  category: 'cigarette' },
  { id: 32, name: 'du Maurier Riche',         priceCategory: 0,  packQty: 1,  category: 'cigarette' },
  { id: 33, name: 'du Maurier Duo 25',        priceCategory: 0,  packQty: 1,  category: 'cigarette' },
  { id: 34, name: "Player's Original",        priceCategory: 0,  packQty: 1,  category: 'cigarette' },
];

export const LOTTERY_PRODUCTS  = PRODUCTS.filter(p => p.category === 'lottery');
export const CIGARETTE_PRODUCTS = PRODUCTS.filter(p => p.category === 'cigarette');
export const PRICE_CATEGORIES  = [...new Set(LOTTERY_PRODUCTS.map(p => p.priceCategory))].sort((a, b) => a - b);
