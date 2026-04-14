-- Expand the ingredient_catalog seed with common ingredients that were
-- missing from the original 0011-era seed. Idempotent via INSERT OR IGNORE
-- so this is safe to re-run and won't clobber rows that already exist from
-- the seed SQL or manual additions.
--
-- Categories follow the existing convention: aromatic, protein, vegetable,
-- spice, sauce, grain, dried, coconut, dairy, sweet, basic, paste, fruit.

-- ─── Additional vegetables ────────────────────────────────
INSERT OR IGNORE INTO ingredient_catalog (name, category, default_unit) VALUES
  ('Sweet potato', 'vegetable', 'pcs'),
  ('Yam', 'vegetable', 'g'),
  ('Capsicum', 'vegetable', 'pcs'),
  ('Red bell pepper', 'vegetable', 'pcs'),
  ('Green bell pepper', 'vegetable', 'pcs'),
  ('Zucchini', 'vegetable', 'pcs'),
  ('Pumpkin', 'vegetable', 'g'),
  ('Winter melon', 'vegetable', 'g'),
  ('Bitter gourd', 'vegetable', 'pcs'),
  ('Mushroom', 'vegetable', 'g'),
  ('Enoki mushroom', 'vegetable', 'g'),
  ('Button mushroom', 'vegetable', 'g'),
  ('Spinach', 'vegetable', 'g'),
  ('Lettuce', 'vegetable', 'g'),
  ('Celery', 'vegetable', 'stalk'),
  ('Broccoli', 'vegetable', 'g'),
  ('Cauliflower', 'vegetable', 'g'),
  ('Corn', 'vegetable', 'pcs'),
  ('Peas', 'vegetable', 'g'),
  ('Chinese cabbage', 'vegetable', 'g'),
  ('Napa cabbage', 'vegetable', 'g'),
  ('Radish', 'vegetable', 'pcs'),
  ('Daikon', 'vegetable', 'pcs'),
  ('Lotus root', 'vegetable', 'g'),
  ('Avocado', 'vegetable', 'pcs');

-- ─── Additional proteins ──────────────────────────────────
INSERT OR IGNORE INTO ingredient_catalog (name, category, default_unit) VALUES
  ('Chicken wings', 'protein', 'g'),
  ('Chicken drumstick', 'protein', 'pcs'),
  ('Whole chicken', 'protein', 'pcs'),
  ('Pork ribs', 'protein', 'g'),
  ('Minced beef', 'protein', 'g'),
  ('Beef short ribs', 'protein', 'g'),
  ('Lamb', 'protein', 'g'),
  ('Fish fillet', 'protein', 'g'),
  ('Whole fish', 'protein', 'pcs'),
  ('Salmon', 'protein', 'g'),
  ('Mackerel', 'protein', 'g'),
  ('Cod', 'protein', 'g'),
  ('Mussels', 'protein', 'g'),
  ('Clams', 'protein', 'g'),
  ('Crab', 'protein', 'pcs'),
  ('Tofu (soft)', 'protein', 'block');

-- ─── Additional fruits ────────────────────────────────────
INSERT OR IGNORE INTO ingredient_catalog (name, category, default_unit) VALUES
  ('Lemon', 'fruit', 'pcs'),
  ('Lime', 'fruit', 'pcs'),
  ('Calamansi', 'fruit', 'pcs'),
  ('Orange', 'fruit', 'pcs'),
  ('Apple', 'fruit', 'pcs'),
  ('Mango', 'fruit', 'pcs'),
  ('Pineapple', 'fruit', 'pcs'),
  ('Banana', 'fruit', 'pcs'),
  ('Papaya', 'fruit', 'pcs');

-- ─── Additional pantry staples ────────────────────────────
INSERT OR IGNORE INTO ingredient_catalog (name, category, default_unit) VALUES
  ('Olive oil', 'sauce', 'tbsp'),
  ('Vegetable oil', 'sauce', 'tbsp'),
  ('Peanut oil', 'sauce', 'tbsp'),
  ('Sesame seeds', 'spice', 'tsp'),
  ('Peanuts', 'basic', 'g'),
  ('Cashews', 'basic', 'g'),
  ('Almonds', 'basic', 'g'),
  ('Baking powder', 'basic', 'tsp'),
  ('Baking soda', 'basic', 'tsp'),
  ('Vanilla extract', 'basic', 'tsp'),
  ('Bread', 'grain', 'slice'),
  ('Breadcrumbs', 'grain', 'g'),
  ('Oats', 'grain', 'cup'),
  ('Quinoa', 'grain', 'cup'),
  ('Pasta', 'grain', 'g'),
  ('Tomato paste', 'paste', 'tbsp'),
  ('Curry paste (green)', 'paste', 'tbsp'),
  ('Curry paste (red)', 'paste', 'tbsp'),
  ('Cheddar cheese', 'dairy', 'g'),
  ('Mozzarella', 'dairy', 'g'),
  ('Cream', 'dairy', 'ml'),
  ('Yoghurt', 'dairy', 'ml'),
  ('Parmesan', 'dairy', 'g');

-- ─── Additional aromatics / herbs ─────────────────────────
INSERT OR IGNORE INTO ingredient_catalog (name, category, default_unit) VALUES
  ('Mint', 'aromatic', 'sprig'),
  ('Parsley', 'aromatic', 'sprig'),
  ('Rosemary', 'aromatic', 'sprig'),
  ('Thyme', 'aromatic', 'sprig'),
  ('Dill', 'aromatic', 'sprig'),
  ('Sage', 'aromatic', 'sprig'),
  ('Chives', 'aromatic', 'sprig'),
  ('Bay leaves', 'aromatic', 'pcs');
