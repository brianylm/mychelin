-- Seed the ingredient_catalog table with Singapore home-cooking staples.
-- Safe to run multiple times — uses INSERT OR IGNORE so existing entries
-- (matched by unique name) are skipped.
--
-- Categories: aromatic, protein, vegetable, spice, sauce, grain, dried,
-- coconut, dairy, sweet, basic, paste

-- ─── Aromatics ─────────────────────────────────────────────
INSERT OR IGNORE INTO ingredient_catalog (name, category, default_unit) VALUES
  ('Garlic', 'aromatic', 'clove'),
  ('Ginger', 'aromatic', 'g'),
  ('Shallot', 'aromatic', 'pcs'),
  ('Onion', 'aromatic', 'pcs'),
  ('Spring onion', 'aromatic', 'stalk'),
  ('Lemongrass', 'aromatic', 'stalk'),
  ('Galangal', 'aromatic', 'g'),
  ('Pandan leaves', 'aromatic', 'pcs'),
  ('Kaffir lime leaves', 'aromatic', 'pcs'),
  ('Curry leaves', 'aromatic', 'sprig'),
  ('Laksa leaves (daun kesum)', 'aromatic', 'sprig'),
  ('Coriander', 'aromatic', 'sprig'),
  ('Thai basil', 'aromatic', 'sprig'),
  ('Turmeric (fresh)', 'aromatic', 'g');

-- ─── Proteins ──────────────────────────────────────────────
INSERT OR IGNORE INTO ingredient_catalog (name, category, default_unit) VALUES
  ('Chicken', 'protein', 'g'),
  ('Chicken thigh', 'protein', 'g'),
  ('Chicken breast', 'protein', 'g'),
  ('Pork', 'protein', 'g'),
  ('Pork belly', 'protein', 'g'),
  ('Minced pork', 'protein', 'g'),
  ('Beef', 'protein', 'g'),
  ('Fish', 'protein', 'g'),
  ('Prawn', 'protein', 'g'),
  ('Squid', 'protein', 'g'),
  ('Egg', 'protein', 'pcs'),
  ('Tau kwa (firm tofu)', 'protein', 'block'),
  ('Tau pok (puffed tofu)', 'protein', 'pcs'),
  ('Silken tofu', 'protein', 'block'),
  ('Tempeh', 'protein', 'g');

-- ─── Sauces & condiments ───────────────────────────────────
INSERT OR IGNORE INTO ingredient_catalog (name, category, default_unit) VALUES
  ('Light soy sauce', 'sauce', 'tbsp'),
  ('Dark soy sauce', 'sauce', 'tbsp'),
  ('Kecap manis', 'sauce', 'tbsp'),
  ('Fish sauce', 'sauce', 'tbsp'),
  ('Oyster sauce', 'sauce', 'tbsp'),
  ('Sesame oil', 'sauce', 'tsp'),
  ('Shaoxing wine', 'sauce', 'tbsp'),
  ('Hoisin sauce', 'sauce', 'tbsp'),
  ('Chinese black vinegar', 'sauce', 'tbsp'),
  ('Rice vinegar', 'sauce', 'tbsp');

-- ─── Pastes & fermented ────────────────────────────────────
INSERT OR IGNORE INTO ingredient_catalog (name, category, default_unit) VALUES
  ('Belacan', 'paste', 'g'),
  ('Sambal', 'paste', 'tbsp'),
  ('Rojak paste', 'paste', 'tbsp'),
  ('Cincaluk (fermented shrimp)', 'paste', 'tbsp'),
  ('Taucheo (fermented bean paste)', 'paste', 'tbsp'),
  ('Miso', 'paste', 'tbsp'),
  ('Gochujang', 'paste', 'tbsp');

-- ─── Dried ingredients ─────────────────────────────────────
INSERT OR IGNORE INTO ingredient_catalog (name, category, default_unit) VALUES
  ('Hae bi (dried shrimp)', 'dried', 'g'),
  ('Dried chili', 'dried', 'g'),
  ('Dried shiitake mushroom', 'dried', 'g'),
  ('Buah keluak', 'dried', 'pcs'),
  ('Salted fish', 'dried', 'g'),
  ('Dried anchovies (ikan bilis)', 'dried', 'g'),
  ('Dried scallops', 'dried', 'g');

-- ─── Spices ────────────────────────────────────────────────
INSERT OR IGNORE INTO ingredient_catalog (name, category, default_unit) VALUES
  ('Five-spice powder (ng hiong)', 'spice', 'tsp'),
  ('White pepper', 'spice', 'tsp'),
  ('Black pepper', 'spice', 'tsp'),
  ('Turmeric powder', 'spice', 'tsp'),
  ('Cumin', 'spice', 'tsp'),
  ('Coriander powder', 'spice', 'tsp'),
  ('Star anise', 'spice', 'pcs'),
  ('Cinnamon stick', 'spice', 'pcs'),
  ('Cardamom', 'spice', 'pcs'),
  ('Cloves', 'spice', 'pcs'),
  ('Chili powder', 'spice', 'tsp'),
  ('Curry powder', 'spice', 'tbsp');

-- ─── Vegetables ────────────────────────────────────────────
INSERT OR IGNORE INTO ingredient_catalog (name, category, default_unit) VALUES
  ('Chilli (fresh)', 'vegetable', 'pcs'),
  ('Bird''s eye chilli', 'vegetable', 'pcs'),
  ('Bean sprouts', 'vegetable', 'g'),
  ('Kangkong', 'vegetable', 'g'),
  ('Bok choy', 'vegetable', 'g'),
  ('Choy sum', 'vegetable', 'g'),
  ('Long beans', 'vegetable', 'g'),
  ('Cabbage', 'vegetable', 'g'),
  ('Tomato', 'vegetable', 'pcs'),
  ('Cucumber', 'vegetable', 'pcs'),
  ('Potato', 'vegetable', 'pcs'),
  ('Carrot', 'vegetable', 'pcs'),
  ('Eggplant', 'vegetable', 'pcs'),
  ('Lady''s finger (okra)', 'vegetable', 'g');

-- ─── Rice, noodles & grains ────────────────────────────────
INSERT OR IGNORE INTO ingredient_catalog (name, category, default_unit) VALUES
  ('Jasmine rice', 'grain', 'cup'),
  ('Glutinous rice', 'grain', 'cup'),
  ('Rice flour', 'grain', 'g'),
  ('Glutinous rice flour', 'grain', 'g'),
  ('Plain flour', 'grain', 'g'),
  ('Kway teow', 'grain', 'g'),
  ('Bee hoon (rice vermicelli)', 'grain', 'g'),
  ('Egg noodles', 'grain', 'g'),
  ('Hokkien noodles', 'grain', 'g'),
  ('Laksa noodles', 'grain', 'g');

-- ─── Coconut & dairy ───────────────────────────────────────
INSERT OR IGNORE INTO ingredient_catalog (name, category, default_unit) VALUES
  ('Coconut milk', 'coconut', 'ml'),
  ('Coconut cream', 'coconut', 'ml'),
  ('Grated coconut', 'coconut', 'g'),
  ('Condensed milk', 'dairy', 'tbsp'),
  ('Evaporated milk', 'dairy', 'ml'),
  ('Butter', 'dairy', 'g'),
  ('Milk', 'dairy', 'ml');

-- ─── Sweeteners ────────────────────────────────────────────
INSERT OR IGNORE INTO ingredient_catalog (name, category, default_unit) VALUES
  ('Gula melaka (palm sugar)', 'sweet', 'g'),
  ('Brown sugar', 'sweet', 'g'),
  ('Rock sugar', 'sweet', 'g'),
  ('Honey', 'sweet', 'tbsp'),
  ('Kaya', 'sweet', 'tbsp');

-- ─── Basics ────────────────────────────────────────────────
INSERT OR IGNORE INTO ingredient_catalog (name, category, default_unit) VALUES
  ('Salt', 'basic', 'tsp'),
  ('Sugar', 'basic', 'tsp'),
  ('Cooking oil', 'basic', 'tbsp'),
  ('Water', 'basic', 'ml'),
  ('Cornflour', 'basic', 'tbsp');
