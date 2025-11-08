export type WidgetType =
  | 'kpi_card'
  | 'line_chart'
  | 'bar_chart'
  | 'area_chart'
  | 'pie_chart'
  | 'table'
  | 'list'
  | 'funnel'
  | 'progress'
  | 'activity_feed'

export type ModuleType =
  | 'leads'
  | 'members'
  | 'billing'
  | 'attendance'
  | 'courses'
  | 'affiliates'
  | 'support'
  | 'tasks'
  | 'expenses'
  | 'products'
  | 'team'
  | 'automations'
  | 'appointments'

export type WidgetSize = 'small' | 'medium' | 'large' | 'full'

export interface WidgetPosition {
  x: number
  y: number
  w: number
  h: number
}

export interface WidgetConfig {
  metric?: string
  timeRange?: string
  filters?: Record<string, any>
  chartType?: string
  dataSource?: string
  displayMode?: string
  colorScheme?: string
  showLegend?: boolean
  showGrid?: boolean
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  [key: string]: any
}

export interface Widget {
  id: string
  dashboard_id: string
  widget_type: WidgetType
  module: ModuleType
  title: string
  config: WidgetConfig
  position: WidgetPosition
  refresh_interval?: number
  created_at?: string
  updated_at?: string
}

export interface Dashboard {
  id: string
  name: string
  description?: string
  layout_config: {
    cols: number
    rowHeight: number
  }
  is_default: boolean
  is_template: boolean
  created_by?: string
  shared_with_roles: string[]
  created_at?: string
  updated_at?: string
  widgets?: Widget[]
}

export interface DashboardTemplate {
  id: string
  name: string
  description: string
  category: 'executive' | 'sales' | 'hr' | 'finance' | 'operations' | 'custom'
  thumbnail_url?: string
  config: {
    dashboard: Omit<Dashboard, 'id' | 'created_at' | 'updated_at' | 'widgets'>
    widgets: Omit<Widget, 'id' | 'dashboard_id' | 'created_at' | 'updated_at'>[]
  }
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export interface WidgetDefinition {
  type: WidgetType
  module: ModuleType
  label: string
  description: string
  icon: string
  defaultSize: WidgetPosition
  defaultConfig: WidgetConfig
  configOptions?: {
    name: string
    label: string
    type: 'text' | 'number' | 'select' | 'multiselect' | 'date' | 'toggle'
    options?: { value: string; label: string }[]
    default?: any
  }[]
}
