-- ============================================
-- Store Inventory App - Database Setup
-- Store: Voisin Shell / IGA Bromont #02641
-- ============================================

-- Products table
CREATE TABLE IF NOT EXISTS store_products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  price_category INTEGER NOT NULL, -- price in dollars: 2, 3, 5, 10, 20, 30, 50
  pack_quantity INTEGER NOT NULL DEFAULT 10,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Weeks table
CREATE TABLE IF NOT EXISTS store_weeks (
  id SERIAL PRIMARY KEY,
  week_start_date DATE NOT NULL UNIQUE, -- Monday of the week
  store_id TEXT NOT NULL DEFAULT '02641',
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inventory entries table
CREATE TABLE IF NOT EXISTS store_inventory_entries (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES store_products(id),
  week_start_date DATE NOT NULL,
  day_of_week INTEGER NOT NULL, -- 0=Lundi, 1=Mardi, 2=Mercredi, 3=Jeudi, 4=Vendredi, 5=Samedi, 6=Dimanche
  count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, week_start_date, day_of_week)
);

-- Enable RLS
ALTER TABLE store_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_inventory_entries ENABLE ROW LEVEL SECURITY;

-- Allow all operations (PIN auth is handled at app level)
CREATE POLICY "Allow all on store_products" ON store_products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on store_weeks" ON store_weeks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on store_inventory_entries" ON store_inventory_entries FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- Seed: Insert lottery ticket products
-- ============================================
INSERT INTO store_products (name, price_category, pack_quantity, sort_order) VALUES
  -- $2 tickets
  ('Mots Cachés (vert)', 2, 10, 10),
  ('Mots Cachés (violet)', 2, 10, 11),
  ('777', 2, 10, 12),
  ('3 en folie', 2, 10, 13),
  ('Poule', 2, 10, 14),

  -- $3 tickets
  ('Jeu de mots (noir)', 3, 10, 20),
  ('Scrabble', 3, 10, 21),
  ('Slingo en folie', 3, 10, 22),
  ('Bingo', 3, 10, 23),
  ('Zone tropicale', 3, 10, 24),
  ('Connection', 3, 10, 25),
  ('Le 31', 3, 10, 26),

  -- $5 tickets
  ('Mots Cachés (musique)', 5, 10, 30),
  ('Gagnant à vie (bleu)', 5, 10, 31),
  ('777', 5, 5, 32),
  ('Poule', 5, 5, 33),
  ('Améthyste', 5, 5, 34),

  -- $10 tickets
  ('Ultra', 10, 5, 40),
  ('50$ et 100$ en masse', 10, 5, 41),
  ('Giga 360', 10, 5, 42),

  -- $20 tickets
  ('2 millions$ diamant', 20, 5, 60),
  ('Retour vers le futur', 20, 5, 61),
  ('La course aux lingots', 20, 5, 62),
  ('Casino', 20, 5, 63),

  -- $30 tickets
  ('30X', 30, 5, 70),

  -- $50 tickets
  ('Extrême', 50, 5, 80)

ON CONFLICT DO NOTHING;
