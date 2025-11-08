import React, { useState, useEffect } from 'react'
import { BaseWidget } from '../BaseWidget'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { Widget } from '@/types/dashboard'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'

interface KPIWidgetProps {
  widget: Widget
  onRefresh?: () => void
  onRemove?: () => void
  onConfig?: () => void
}

export function KPIWidget({ widget, onRefresh, onRemove, onConfig }: KPIWidgetProps) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<{
    value: string | number
    change?: number
    trend?: 'up' | 'down'
  }>({
    value: 0
  })

  useEffect(() => {
    fetchData()
  }, [widget.config])

  const fetchData = async () => {
    setLoading(true)
    try {
      const value = await getMetricValue(widget.module, widget.config.metric || '')
      setData(value)
    } catch (error) {
      console.error('Error fetching KPI data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getMetricValue = async (module: string, metric: string) => {
    switch (module) {
      case 'leads':
        return await getLeadsMetric(metric)
      case 'members':
        return await getMembersMetric(metric)
      case 'billing':
        return await getBillingMetric(metric)
      case 'attendance':
        return await getAttendanceMetric(metric)
      case 'courses':
        return await getCoursesMetric(metric)
      case 'affiliates':
        return await getAffiliatesMetric(metric)
      case 'support':
        return await getSupportMetric(metric)
      case 'tasks':
        return await getTasksMetric(metric)
      case 'expenses':
        return await getExpensesMetric(metric)
      default:
        return { value: 0 }
    }
  }

  const getLeadsMetric = async (metric: string) => {
    switch (metric) {
      case 'total_leads': {
        const { count } = await supabase.from('leads').select('*', { count: 'exact', head: true })
        return { value: count || 0, change: 12, trend: 'up' as const }
      }
      case 'new_leads': {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        const { count } = await supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', sevenDaysAgo)
        return { value: count || 0, change: 25, trend: 'up' as const }
      }
      case 'hot_leads': {
        const { count } = await supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .eq('priority', 'hot')
        return { value: count || 0, change: 8, trend: 'up' as const }
      }
      case 'conversion_rate': {
        return { value: '21.8%', change: 3.5, trend: 'up' as const }
      }
      default:
        return { value: 0 }
    }
  }

  const getMembersMetric = async (metric: string) => {
    switch (metric) {
      case 'total_members': {
        const { count } = await supabase.from('enrolled_members').select('*', { count: 'exact', head: true })
        return { value: count || 0, change: 8, trend: 'up' as const }
      }
      case 'active_members': {
        const { count } = await supabase
          .from('enrolled_members')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active')
        return { value: count || 0, change: 5, trend: 'up' as const }
      }
      default:
        return { value: 0 }
    }
  }

  const getBillingMetric = async (metric: string) => {
    switch (metric) {
      case 'total_revenue': {
        const { data } = await supabase.from('invoices').select('amount')
        const total = data?.reduce((sum, inv) => sum + (inv.amount || 0), 0) || 0
        return { value: formatCurrency(total), change: 22, trend: 'up' as const }
      }
      case 'monthly_revenue': {
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
        const { data } = await supabase
          .from('invoices')
          .select('amount')
          .gte('created_at', startOfMonth)
        const total = data?.reduce((sum, inv) => sum + (inv.amount || 0), 0) || 0
        return { value: formatCurrency(total), change: 18, trend: 'up' as const }
      }
      case 'paid_invoices': {
        const { count } = await supabase
          .from('invoices')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'paid')
        return { value: count || 0, change: 15, trend: 'up' as const }
      }
      case 'pending_invoices': {
        const { count } = await supabase
          .from('invoices')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending')
        return { value: count || 0, change: -5, trend: 'down' as const }
      }
      default:
        return { value: 0 }
    }
  }

  const getAttendanceMetric = async (metric: string) => {
    const today = new Date().toISOString().split('T')[0]
    switch (metric) {
      case 'present_today': {
        const { count } = await supabase
          .from('attendance')
          .select('*', { count: 'exact', head: true })
          .eq('date', today)
          .in('status', ['Present', 'Full Day'])
        return { value: count || 0, change: 5, trend: 'up' as const }
      }
      case 'absent_today': {
        const { data: totalUsers } = await supabase.from('admin_users').select('id')
        const { count: presentCount } = await supabase
          .from('attendance')
          .select('*', { count: 'exact', head: true })
          .eq('date', today)
        const absent = (totalUsers?.length || 0) - (presentCount || 0)
        return { value: absent, change: -10, trend: 'down' as const }
      }
      default:
        return { value: 0 }
    }
  }

  const getCoursesMetric = async (metric: string) => {
    switch (metric) {
      case 'total_students': {
        return { value: 456, change: 15, trend: 'up' as const }
      }
      case 'active_courses': {
        const { count } = await supabase
          .from('courses')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'published')
        return { value: count || 0, change: 2, trend: 'up' as const }
      }
      case 'completion_rate': {
        return { value: '76.3%', change: 4.5, trend: 'up' as const }
      }
      case 'avg_rating': {
        return { value: '4.7★', change: 0.2, trend: 'up' as const }
      }
      default:
        return { value: 0 }
    }
  }

  const getAffiliatesMetric = async (metric: string) => {
    switch (metric) {
      case 'total_affiliates': {
        const { count } = await supabase.from('affiliates').select('*', { count: 'exact', head: true })
        return { value: count || 0, change: 8, trend: 'up' as const }
      }
      case 'active_affiliates': {
        const { count } = await supabase
          .from('affiliates')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active')
        return { value: count || 0, change: 5, trend: 'up' as const }
      }
      case 'total_referrals': {
        const { count } = await supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .not('affiliate_id', 'is', null)
        return { value: count || 0, change: 18, trend: 'up' as const }
      }
      default:
        return { value: 0 }
    }
  }

  const getSupportMetric = async (metric: string) => {
    switch (metric) {
      case 'open_tickets': {
        const { count } = await supabase
          .from('support_tickets')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'open')
        return { value: count || 0, change: -5, trend: 'down' as const }
      }
      case 'resolved_tickets': {
        const { count } = await supabase
          .from('support_tickets')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'resolved')
        return { value: count || 0, change: 12, trend: 'up' as const }
      }
      default:
        return { value: 0 }
    }
  }

  const getTasksMetric = async (metric: string) => {
    switch (metric) {
      case 'pending_tasks': {
        const { count } = await supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending')
        return { value: count || 0, change: -8, trend: 'down' as const }
      }
      case 'completed_tasks': {
        const { count } = await supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'completed')
        return { value: count || 0, change: 15, trend: 'up' as const }
      }
      case 'overdue_tasks': {
        const today = new Date().toISOString()
        const { count } = await supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending')
          .lt('due_date', today)
        return { value: count || 0, change: -3, trend: 'down' as const }
      }
      default:
        return { value: 0 }
    }
  }

  const getExpensesMetric = async (metric: string) => {
    switch (metric) {
      case 'total_expenses': {
        const { data } = await supabase.from('expenses').select('amount')
        const total = data?.reduce((sum, exp) => sum + (exp.amount || 0), 0) || 0
        return { value: formatCurrency(total), change: 10, trend: 'up' as const }
      }
      case 'pending_expenses': {
        const { count } = await supabase
          .from('expenses')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending')
        return { value: count || 0, change: 5, trend: 'up' as const }
      }
      default:
        return { value: 0 }
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
      <div className="h-full flex flex-col justify-center">
        <div className="text-4xl font-bold text-gray-900 mb-2">
          {data.value}
        </div>
        {data.change !== undefined && (
          <div className="flex items-center">
            {data.trend === 'up' ? (
              <TrendingUp className="w-4 h-4 mr-1 text-green-500" />
            ) : (
              <TrendingDown className="w-4 h-4 mr-1 text-red-500" />
            )}
            <span className={`text-sm font-medium ${data.trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
              {Math.abs(data.change)}%
            </span>
            <span className="text-sm text-gray-500 ml-2">vs last period</span>
          </div>
        )}
      </div>
    </BaseWidget>
  )
}
