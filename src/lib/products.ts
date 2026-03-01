export interface Product {
  id: number;
  name: string;
  priceCategory: number;
  packQty: number;
}

export const PRODUCTS: Product[] = [
  // $2
  { id: 1,  name: 'Mots Cachés (vert)',    priceCategory: 2,  packQty: 10 },
  { id: 2,  name: 'Mots Cachés (violet)', priceCategory: 2,  packQty: 10 },
  { id: 3,  name: '777',                   priceCategory: 2,  packQty: 10 },
  { id: 4,  name: '3 en folie',            priceCategory: 2,  packQty: 10 },
  { id: 5,  name: 'Poule',                 priceCategory: 2,  packQty: 10 },

  // $3
  { id: 6,  name: 'Jeu de mots (noir)',    priceCategory: 3,  packQty: 10 },
  { id: 7,  name: 'Scrabble',              priceCategory: 3,  packQty: 10 },
  { id: 8,  name: 'Slingo en folie',       priceCategory: 3,  packQty: 10 },
  { id: 9,  name: 'Bingo',                 priceCategory: 3,  packQty: 10 },
  { id: 10, name: 'Zone tropicale',        priceCategory: 3,  packQty: 10 },
  { id: 11, name: 'Connection',            priceCategory: 3,  packQty: 10 },
  { id: 12, name: 'Le 31',                 priceCategory: 3,  packQty: 10 },

  // $5
  { id: 13, name: 'Mots Cachés (musique)', priceCategory: 5,  packQty: 10 },
  { id: 14, name: 'Gagnant à vie (bleu)',  priceCategory: 5,  packQty: 10 },
  { id: 15, name: '777',                   priceCategory: 5,  packQty: 5  },
  { id: 16, name: 'Poule',                 priceCategory: 5,  packQty: 5  },
  { id: 17, name: 'Améthyste',             priceCategory: 5,  packQty: 5  },

  // $10
  { id: 18, name: 'Ultra',                 priceCategory: 10, packQty: 5  },
  { id: 19, name: '50$ et 100$ en masse',  priceCategory: 10, packQty: 5  },
  { id: 20, name: 'Giga 360',              priceCategory: 10, packQty: 5  },

  // $20
  { id: 21, name: '2 millions$ diamant',   priceCategory: 20, packQty: 5  },
  { id: 22, name: 'Retour vers le futur',  priceCategory: 20, packQty: 5  },
  { id: 23, name: 'La course aux lingots', priceCategory: 20, packQty: 5  },
  { id: 24, name: 'Casino',               priceCategory: 20, packQty: 5  },

  // $30
  { id: 25, name: '30X',                   priceCategory: 30, packQty: 5  },

  // $50
  { id: 26, name: 'Extrême',               priceCategory: 50, packQty: 5  },
];

export const PRICE_CATEGORIES = [...new Set(PRODUCTS.map(p => p.priceCategory))].sort((a, b) => a - b);
