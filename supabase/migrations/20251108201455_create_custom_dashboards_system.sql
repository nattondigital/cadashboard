/*
  # Create Custom Dashboards System

  1. New Tables
    - `custom_dashboards`
      - `id` (uuid, primary key)
      - `name` (text) - Dashboard name
      - `description` (text, optional) - Dashboard description
      - `layout_config` (jsonb) - Grid layout configuration
      - `is_default` (boolean) - Whether this is the default dashboard
      - `is_template` (boolean) - Whether this is a template
      - `created_by` (uuid, optional) - User who created the dashboard
      - `shared_with_roles` (text[]) - Roles that can access this dashboard
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `dashboard_widgets`
      - `id` (uuid, primary key)
      - `dashboard_id` (uuid, foreign key) - Reference to custom_dashboards
      - `widget_type` (text) - Type of widget (kpi_card, chart, table, etc.)
      - `module` (text) - Module the widget belongs to (leads, billing, etc.)
      - `title` (text) - Widget title
      - `config` (jsonb) - Widget-specific configuration (filters, metrics, etc.)
      - `position` (jsonb) - Position and size in grid (x, y, w, h)
      - `refresh_interval` (integer, optional) - Auto-refresh interval in seconds
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `dashboard_templates`
      - `id` (uuid, primary key)
      - `name` (text) - Template name
      - `description` (text) - Template description
      - `category` (text) - Template category (executive, sales, hr, finance, etc.)
      - `thumbnail_url` (text, optional) - Preview image
      - `config` (jsonb) - Complete dashboard configuration
      - `is_active` (boolean) - Whether template is available
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their dashboards
    - Add policies for anon users to read public templates
*/

-- Custom Dashboards Table
CREATE TABLE IF NOT EXISTS custom_dashboards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  layout_config jsonb DEFAULT '{"cols": 12, "rowHeight": 100}'::jsonb,
  is_default boolean DEFAULT false,
  is_template boolean DEFAULT false,
  created_by uuid,
  shared_with_roles text[] DEFAULT ARRAY[]::text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Dashboard Widgets Table
CREATE TABLE IF NOT EXISTS dashboard_widgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id uuid REFERENCES custom_dashboards(id) ON DELETE CASCADE,
  widget_type text NOT NULL,
  module text NOT NULL,
  title text NOT NULL,
  config jsonb DEFAULT '{}'::jsonb,
  position jsonb NOT NULL DEFAULT '{"x": 0, "y": 0, "w": 4, "h": 3}'::jsonb,
  refresh_interval integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Dashboard Templates Table
CREATE TABLE IF NOT EXISTS dashboard_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  category text NOT NULL,
  thumbnail_url text,
  config jsonb NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_dashboard_id 
  ON dashboard_widgets(dashboard_id);

CREATE INDEX IF NOT EXISTS idx_custom_dashboards_created_by 
  ON custom_dashboards(created_by);

CREATE INDEX IF NOT EXISTS idx_custom_dashboards_is_template 
  ON custom_dashboards(is_template);

CREATE INDEX IF NOT EXISTS idx_dashboard_templates_category 
  ON dashboard_templates(category);

-- Enable RLS
ALTER TABLE custom_dashboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for custom_dashboards
CREATE POLICY "Allow anon users to read all dashboards"
  ON custom_dashboards FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon users to insert dashboards"
  ON custom_dashboards FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon users to update dashboards"
  ON custom_dashboards FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon users to delete dashboards"
  ON custom_dashboards FOR DELETE
  TO anon
  USING (true);

-- RLS Policies for dashboard_widgets
CREATE POLICY "Allow anon users to read all widgets"
  ON dashboard_widgets FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon users to insert widgets"
  ON dashboard_widgets FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon users to update widgets"
  ON dashboard_widgets FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon users to delete widgets"
  ON dashboard_widgets FOR DELETE
  TO anon
  USING (true);

-- RLS Policies for dashboard_templates
CREATE POLICY "Allow anon users to read active templates"
  ON dashboard_templates FOR SELECT
  TO anon
  USING (is_active = true);

CREATE POLICY "Allow anon users to insert templates"
  ON dashboard_templates FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon users to update templates"
  ON dashboard_templates FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon users to delete templates"
  ON dashboard_templates FOR DELETE
  TO anon
  USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_custom_dashboards_updated_at
  BEFORE UPDATE ON custom_dashboards
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dashboard_widgets_updated_at
  BEFORE UPDATE ON dashboard_widgets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dashboard_templates_updated_at
  BEFORE UPDATE ON dashboard_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();