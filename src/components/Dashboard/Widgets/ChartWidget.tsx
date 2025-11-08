import React, { useState, useEffect } from 'react'
import { BaseWidget } from '../BaseWidget'
import { Widget } from '@/types/dashboard'
import { supabase } from '@/lib/supabase'
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'

interface ChartWidgetProps {
  widget: Widget
  onRefresh?: () => void
  onRemove?: () => void
  onConfig?: () => void
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6']

export function ChartWidget({ widget, onRefresh, onRemove, onConfig }: ChartWidgetProps) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any[]>([])

  useEffect(() => {
    fetchData()
  }, [widget.config])

  const fetchData = async () => {
    setLoading(true)
    try {
      const chartData = await getChartData(widget.module, widget.config.metric || '', widget.widget_type)
      setData(chartData)
    } catch (error) {
      console.error('Error fetching chart data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getChartData = async (module: string, metric: string, chartType: string) => {
    switch (module) {
      case 'leads':
        return await getLeadsChartData(metric, chartType)
      case 'billing':
        return await getBillingChartData(metric, chartType)
      case 'attendance':
        return await getAttendanceChartData(metric, chartType)
      case 'members':
        return await getMembersChartData(metric, chartType)
      case 'support':
        return await getSupportChartData(metric, chartType)
      default:
        return []
    }
  }

  const getLeadsChartData = async (metric: string, chartType: string) => {
    if (metric === 'lead_sources') {
      return [
        { name: 'Facebook Ads', value: 45 },
        { name: 'Website', value: 32 },
        { name: 'Referrals', value: 28 },
        { name: 'LinkedIn', value: 21 },
        { name: 'Webinars', value: 18 }
      ]
    }
    return [
      { date: 'Mon', leads: 12 },
      { date: 'Tue', leads: 19 },
      { date: 'Wed', leads: 15 },
      { date: 'Thu', leads: 22 },
      { date: 'Fri', leads: 18 },
      { date: 'Sat', leads: 8 },
      { date: 'Sun', leads: 5 }
    ]
  }

  const getBillingChartData = async (metric: string, chartType: string) => {
    if (metric === 'revenue_trend') {
      return [
        { month: 'Jan', revenue: 245 },
        { month: 'Feb', revenue: 289 },
        { month: 'Mar', revenue: 315 },
        { month: 'Apr', revenue: 298 },
        { month: 'May', revenue: 345 },
        { month: 'Jun', revenue: 378 }
      ]
    }
    return []
  }

  const getAttendanceChartData = async (metric: string, chartType: string) => {
    return [
      { date: 'Mon', present: 45, absent: 3 },
      { date: 'Tue', present: 47, absent: 1 },
      { date: 'Wed', present: 44, absent: 4 },
      { date: 'Thu', present: 46, absent: 2 },
      { date: 'Fri', present: 43, absent: 5 },
      { date: 'Sat', present: 25, absent: 23 },
      { date: 'Sun', present: 12, absent: 36 }
    ]
  }

  const getMembersChartData = async (metric: string, chartType: string) => {
    if (metric === 'plans_distribution') {
      return [
        { name: 'Basic', value: 89 },
        { name: 'Pro', value: 98 },
        { name: 'Premium', value: 47 }
      ]
    }
    return []
  }

  const getSupportChartData = async (metric: string, chartType: string) => {
    if (metric === 'tickets_by_status') {
      return [
        { name: 'Open', value: 23 },
        { name: 'In Progress', value: 34 },
        { name: 'Resolved', value: 56 },
        { name: 'Closed', value: 12 }
      ]
    }
    return []
  }

  const renderChart = () => {
    switch (widget.widget_type) {
      case 'bar_chart':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
              />
              <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )

      case 'line_chart':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} tickLine={false} />
              <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="leads" stroke="#3b82f6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        )

      case 'area_chart':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#3b82f6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorRevenue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )

      case 'pie_chart':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        )

      default:
        return <div className="text-center text-gray-500">Chart type not supported</div>
    }
  }

  const handleRefresh = () => {
    fetchData()
    onRefresh?.()
  }

  return (
    <BaseWidget
      title={widget.title}
      onRefresh={handleRefresh}
      onRemove={onRemove}
      onConfig={onConfig}
      isLoading={loading}
      colorScheme={widget.config.colorScheme}
    >
      <div className="h-full min-h-[200px]">
        {renderChart()}
      </div>
    </BaseWidget>
  )
}
