/*
  # Update Product Types to CA Practice Categories Only

  1. Changes
    - Drop existing product_type check constraint
    - Update constraint to only allow the 3 CA practice categories:
      * Business Registration
      * Statutory Compliance
      * Business License
    - Remove AI Automation product types

  2. Notes
    - This restricts the products table to only CA practice services
*/

-- Drop the existing check constraint
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_product_type_check;

-- Add new check constraint with only CA practice categories
ALTER TABLE products ADD CONSTRAINT products_product_type_check 
  CHECK (product_type IN (
    'Business Registration',
    'Statutory Compliance',
    'Business License'
  ));

-- Update comment
COMMENT ON COLUMN products.product_type IS 'Product type: Business Registration, Statutory Compliance, or Business License';
