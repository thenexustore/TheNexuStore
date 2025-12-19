/*
  # Create Products and Categories Tables

  1. New Tables
    - `categories`
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `description` (text)
      - `created_at` (timestamp)
    - `products`
      - `id` (uuid, primary key)
      - `name` (text)
      - `description` (text)
      - `price` (numeric)
      - `category_id` (uuid, foreign key)
      - `image_url` (text)
      - `stock` (integer)
      - `type` (text: 'hardware' or 'software')
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policy for public read access
    - Restrict write access to authenticated users (future admin panel)

  3. Important Notes
    - Categories and Products are read-only for most users
    - Public can browse all products
    - Future: Admin users can manage inventory
*/

CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price numeric NOT NULL CHECK (price > 0),
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  image_url text,
  stock integer DEFAULT 0 CHECK (stock >= 0),
  type text NOT NULL CHECK (type IN ('hardware', 'software')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view categories"
  ON categories FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can view products"
  ON products FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Only authenticated users can insert categories"
  ON categories FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Only authenticated users can insert products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Only authenticated users can update products"
  ON products FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Only authenticated users can delete products"
  ON products FOR DELETE
  TO authenticated
  USING (true);
