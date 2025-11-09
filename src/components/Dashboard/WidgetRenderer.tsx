import React from 'react'
import { Widget } from '@/types/dashboard'
import { KPIWidget } from './Widgets/KPIWidget'
import { GraphWidget } from './Widgets/GraphWidget'
import { FunnelWidget } from './Widgets/FunnelWidget'
import { ActivityFeedWidget } from './Widgets/ActivityFeedWidget'
import { TableWidget } from './Widgets/TableWidget'
import { ProgressBarWidget } from './Widgets/ProgressBarWidget'
import { DonutChartWidget } from './Widgets/DonutChartWidget'
import { GaugeWidget } from './Widgets/GaugeWidget'
import { ListWidget } from './Widgets/ListWidget'
import { CalendarWidget } from './Widgets/CalendarWidget'

interface WidgetRendererProps {
  widget: Widget
  onRefresh?: () => void
  onRemove?: () => void
  onConfig?: (config: any) => void
}

export function WidgetRenderer({ widget, onRefresh, onRemove, onConfig }: WidgetRendererProps) {
  const commonProps = { title: widget.title, config: widget.config }

  switch (widget.widget_type) {
    case 'kpi_card':
      return <KPIWidget widget={widget} onRefresh={onRefresh} onRemove={onRemove} onConfig={onConfig} />

    case 'bar_chart':
    case 'line_chart':
    case 'area_chart':
    case 'pie_chart':
      return <GraphWidget widget={widget} onRefresh={onRefresh} onRemove={onRemove} onConfig={onConfig} />

    case 'donut_chart':
      return <DonutChartWidget {...commonProps} />

    case 'funnel':
      return <FunnelWidget widget={widget} onRefresh={onRefresh} onRemove={onRemove} onConfig={onConfig} />

    case 'activity_feed':
      return <ActivityFeedWidget widget={widget} onRefresh={onRefresh} onRemove={onRemove} onConfig={onConfig} />

    case 'table':
      return <TableWidget widget={widget} onRefresh={onRefresh} onRemove={onRemove} onConfig={onConfig} />

    case 'progress_bar':
      return <ProgressBarWidget {...commonProps} />

    case 'gauge':
      return <GaugeWidget {...commonProps} />

    case 'list':
      return <ListWidget {...commonProps} />

    case 'calendar':
      return <CalendarWidget {...commonProps} />

    default:
      return (
        <div className="p-4 bg-gray-100 rounded-lg border border-gray-300">
          <p className="text-sm text-gray-600">Widget type "{widget.widget_type}" not implemented yet</p>
        </div>
      )
  }
}
