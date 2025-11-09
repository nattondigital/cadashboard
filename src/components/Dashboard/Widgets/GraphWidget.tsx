import React, { useState, useEffect } from 'react'
import { BaseWidget } from '../BaseWidget'
import { Widget } from '@/types/dashboard'
import { supabase } from '@/lib/supabase'
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface GraphWidgetProps {
  widget: Widget
  onRefresh?: () => void
  onRemove?: () => void
  onConfig?: (config: any) => void
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6']

const CHART_TYPES = [
  { value: 'bar', label: 'Bar Chart' },
  { value: 'line', label: 'Line Chart' },
  { value: 'area', label: 'Area Chart' },
  { value: 'pie', label: 'Pie Chart' }
]

export function GraphWidget({ widget, onRefresh, onRemove, onConfig }: GraphWidgetProps) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any[]>([])
  const [showSettings, setShowSettings] = useState(false)
  const [chartType, setChartType] = useState(widget.config.chartType || 'bar')

  useEffect(() => {
    fetchData()
  }, [widget.config])

  const fetchData = async () => {
    setLoading(true)
    try {
      const chartData = await getChartData(widget.module, widget.config.metric || '', chartType)
      setData(chartData)
    } catch (error) {
      console.error('Error fetching chart data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getChartData = async (module: string, metric: string, type: string) => {
    switch (module) {
      case 'leads':
        return await getLeadsChartData(metric, type)
      case 'billing':
        return await getBillingChartData(metric, type)
      case 'attendance':
        return await getAttendanceChartData(metric, type)
      case 'members':
        return await getMembersChartData(metric, type)
      case 'support':
        return await getSupportChartData(metric, type)
      case 'payroll':
        return await getPayrollChartData(metric, type)
      case 'contacts':
        return await getContactsChartData(metric, type)
      case 'appointments':
        return await getAppointmentsChartData(metric, type)
      case 'products':
        return await getProductsChartData(metric, type)
      case 'expenses':
        return await getExpensesChartData(metric, type)
      case 'tasks':
        return await getTasksChartData(metric, type)
      case 'leave':
        return await getLeaveChartData(metric, type)
      case 'team':
        return await getTeamChartData(metric, type)
      default:
        return []
    }
  }

  const getLeadsChartData = async (metric: string, type: string) => {
    if (metric === 'lead_sources') {
      const { data: leads } = await supabase
        .from('leads')
        .select('source')

      const sourceCount: Record<string, number> = {}
      leads?.forEach(lead => {
        sourceCount[lead.source || 'Unknown'] = (sourceCount[lead.source || 'Unknown'] || 0) + 1
      })

      return Object.entries(sourceCount).map(([name, value]) => ({ name, value }))
    }

    if (metric === 'leads_by_stage') {
      const { data: leads } = await supabase
        .from('leads')
        .select('stage')

      const stageCount: Record<string, number> = {}
      leads?.forEach(lead => {
        stageCount[lead.stage || 'Unknown'] = (stageCount[lead.stage || 'Unknown'] || 0) + 1
      })

      return Object.entries(stageCount).map(([name, value]) => ({ name, value }))
    }

    const { data: leads } = await supabase
      .from('leads')
      .select('created_at')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at')

    const dayCount: Record<string, number> = {}
    leads?.forEach(lead => {
      const day = new Date(lead.created_at).toLocaleDateString('en-US', { weekday: 'short' })
      dayCount[day] = (dayCount[day] || 0) + 1
    })

    return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => ({
      date: day,
      leads: dayCount[day] || 0
    }))
  }

  const getBillingChartData = async (metric: string, type: string) => {
    if (metric === 'revenue_trend') {
      const { data: invoices } = await supabase
        .from('billing_invoices')
        .select('invoice_date, total_amount')
        .order('invoice_date')

      const monthlyRevenue: Record<string, number> = {}
      invoices?.forEach(invoice => {
        const month = new Date(invoice.invoice_date).toLocaleDateString('en-US', { month: 'short' })
        monthlyRevenue[month] = (monthlyRevenue[month] || 0) + (invoice.total_amount || 0)
      })

      return Object.entries(monthlyRevenue).map(([month, revenue]) => ({
        month,
        revenue: Math.round(revenue)
      }))
    }

    if (metric === 'invoice_status') {
      const { data: invoices } = await supabase
        .from('billing_invoices')
        .select('status')

      const statusCount: Record<string, number> = {}
      invoices?.forEach(invoice => {
        statusCount[invoice.status || 'Unknown'] = (statusCount[invoice.status || 'Unknown'] || 0) + 1
      })

      return Object.entries(statusCount).map(([name, value]) => ({ name, value }))
    }

    return []
  }

  const getAttendanceChartData = async (metric: string, type: string) => {
    const today = new Date()
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0]

    if (metric === 'attendance_stats') {
      const { data: attendance } = await supabase
        .from('attendance')
        .select('date, status')
        .gte('date', startOfMonth)
        .lte('date', endOfMonth)
        .order('date')

      const weeklyData = [
        { date: 'Week 1', present: 0, absent: 0 },
        { date: 'Week 2', present: 0, absent: 0 },
        { date: 'Week 3', present: 0, absent: 0 },
        { date: 'Week 4', present: 0, absent: 0 }
      ]

      attendance?.forEach(record => {
        const day = new Date(record.date).getDate()
        const weekIndex = Math.min(Math.floor((day - 1) / 7), 3)

        if (['Present', 'Full Day', 'Half Day', 'Overtime'].includes(record.status)) {
          weeklyData[weekIndex].present++
        } else if (record.status === 'Absent') {
          weeklyData[weekIndex].absent++
        }
      })

      return weeklyData
    }

    if (metric === 'attendance_today') {
      const { data: attendance } = await supabase
        .from('attendance')
        .select('status')
        .eq('date', new Date().toISOString().split('T')[0])

      const statusCount: Record<string, number> = {}
      attendance?.forEach(record => {
        statusCount[record.status || 'Unknown'] = (statusCount[record.status || 'Unknown'] || 0) + 1
      })

      return Object.entries(statusCount).map(([name, value]) => ({ name, value }))
    }

    return []
  }

  const getMembersChartData = async (metric: string, type: string) => {
    if (metric === 'plans_distribution') {
      const { data: members } = await supabase
        .from('enrolled_members')
        .select('plan_type')

      const planCount: Record<string, number> = {}
      members?.forEach(member => {
        planCount[member.plan_type || 'Unknown'] = (planCount[member.plan_type || 'Unknown'] || 0) + 1
      })

      return Object.entries(planCount).map(([name, value]) => ({ name, value }))
    }

    return []
  }

  const getSupportChartData = async (metric: string, type: string) => {
    if (metric === 'tickets_by_status') {
      const { data: tickets } = await supabase
        .from('support_tickets')
        .select('status')

      const statusCount: Record<string, number> = {}
      tickets?.forEach(ticket => {
        statusCount[ticket.status || 'Unknown'] = (statusCount[ticket.status || 'Unknown'] || 0) + 1
      })

      return Object.entries(statusCount).map(([name, value]) => ({ name, value }))
    }

    return []
  }

  const getPayrollChartData = async (metric: string, type: string) => {
    const today = new Date()
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0]

    if (metric === 'attendance_stats') {
      const { data: attendance } = await supabase
        .from('attendance')
        .select('date, status')
        .gte('date', startOfMonth)
        .lte('date', endOfMonth)
        .order('date')

      const weeklyData = [
        { date: 'Week 1', present: 0, absent: 0 },
        { date: 'Week 2', present: 0, absent: 0 },
        { date: 'Week 3', present: 0, absent: 0 },
        { date: 'Week 4', present: 0, absent: 0 }
      ]

      attendance?.forEach(record => {
        const day = new Date(record.date).getDate()
        const weekIndex = Math.min(Math.floor((day - 1) / 7), 3)

        if (['Present', 'Full Day', 'Half Day', 'Overtime'].includes(record.status)) {
          weeklyData[weekIndex].present++
        } else if (record.status === 'Absent') {
          weeklyData[weekIndex].absent++
        }
      })

      return weeklyData
    }

    if (metric === 'salary_overview' || metric === 'salary_by_employee') {
      const { data: teamMembers } = await supabase
        .from('admin_users')
        .select('id, full_name, salary')
        .limit(widget.config.limit || 10)

      const { data: attendance } = await supabase
        .from('attendance')
        .select('admin_user_id, status')
        .gte('date', startOfMonth)
        .lte('date', endOfMonth)

      const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()

      return teamMembers?.map(member => {
        const memberAttendance = attendance?.filter(a => a.admin_user_id === member.id) || []
        const fullDays = memberAttendance.filter(a => a.status === 'Full Day').length
        const halfDays = memberAttendance.filter(a => a.status === 'Half Day').length
        const overtime = memberAttendance.filter(a => a.status === 'Overtime').length
        const present = memberAttendance.filter(a => a.status === 'Present').length

        const salary = typeof member.salary === 'string' ? parseFloat(member.salary) : (member.salary || 0)
        const perDaySalary = salary / daysInMonth
        const earnedDays = fullDays + (halfDays * 0.5) + (overtime * 1.5) + present
        const earned = Math.round(earnedDays * perDaySalary)

        return {
          name: member.full_name?.split(' ')[0] || 'Employee',
          earned: metric === 'salary_overview' ? Math.round(earned / 1000) : earned,
          budget: metric === 'salary_overview' ? Math.round(salary / 1000) : salary
        }
      }) || []
    }

    if (metric === 'attendance_breakdown') {
      const { data: attendance } = await supabase
        .from('attendance')
        .select('status')
        .gte('date', startOfMonth)
        .lte('date', endOfMonth)

      const statusCount: Record<string, number> = {}
      attendance?.forEach(record => {
        statusCount[record.status || 'Unknown'] = (statusCount[record.status || 'Unknown'] || 0) + 1
      })

      return Object.entries(statusCount).map(([name, value]) => ({ name, value }))
    }

    return []
  }

  const getContactsChartData = async (metric: string, type: string) => {
    const { data: contacts } = await supabase
      .from('contacts_master')
      .select('created_at')
      .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at')

    const monthlyCount: Record<string, number> = {}
    contacts?.forEach(contact => {
      const month = new Date(contact.created_at).toLocaleDateString('en-US', { month: 'short' })
      monthlyCount[month] = (monthlyCount[month] || 0) + 1
    })

    return Object.entries(monthlyCount).map(([date, contacts]) => ({ date, contacts }))
  }

  const getAppointmentsChartData = async (metric: string, type: string) => {
    const { data: appointments } = await supabase
      .from('appointments')
      .select('appointment_date')
      .gte('appointment_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('appointment_date')

    const dayCount: Record<string, number> = {}
    appointments?.forEach(appointment => {
      const day = new Date(appointment.appointment_date).toLocaleDateString('en-US', { weekday: 'short' })
      dayCount[day] = (dayCount[day] || 0) + 1
    })

    return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => ({
      date: day,
      appointments: dayCount[day] || 0
    }))
  }

  const getProductsChartData = async (metric: string, type: string) => {
    if (metric === 'products_by_category') {
      const { data: products } = await supabase
        .from('products_master')
        .select('product_type')

      const categoryCount: Record<string, number> = {}
      products?.forEach(product => {
        categoryCount[product.product_type || 'Unknown'] = (categoryCount[product.product_type || 'Unknown'] || 0) + 1
      })

      return Object.entries(categoryCount).map(([name, value]) => ({ name, value }))
    }

    return []
  }

  const getExpensesChartData = async (metric: string, type: string) => {
    if (metric === 'expenses_by_category') {
      const { data: expenses } = await supabase
        .from('expenses')
        .select('expense_type, amount')
        .gte('expense_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

      const categorySum: Record<string, number> = {}
      expenses?.forEach(expense => {
        const category = expense.expense_type || 'Other'
        categorySum[category] = (categorySum[category] || 0) + (expense.amount || 0)
      })

      return Object.entries(categorySum).map(([name, value]) => ({ name, value: Math.round(value) }))
    }

    return []
  }

  const getTasksChartData = async (metric: string, type: string) => {
    if (metric === 'tasks_by_status') {
      const { data: tasks } = await supabase
        .from('tasks')
        .select('status')

      const statusCount: Record<string, number> = {}
      tasks?.forEach(task => {
        statusCount[task.status || 'Unknown'] = (statusCount[task.status || 'Unknown'] || 0) + 1
      })

      return Object.entries(statusCount).map(([name, value]) => ({ name, value }))
    }

    return []
  }

  const getLeaveChartData = async (metric: string, type: string) => {
    if (metric === 'leave_by_category') {
      const { data: leaves } = await supabase
        .from('leave_requests')
        .select('leave_category')
        .eq('status', 'approved')

      const categoryCount: Record<string, number> = {}
      leaves?.forEach(leave => {
        categoryCount[leave.leave_category || 'Unknown'] = (categoryCount[leave.leave_category || 'Unknown'] || 0) + 1
      })

      return Object.entries(categoryCount).map(([name, value]) => ({ name, value }))
    }

    return []
  }

  const getTeamChartData = async (metric: string, type: string) => {
    if (metric === 'team_by_role') {
      const { data: team } = await supabase
        .from('admin_users')
        .select('role')

      const roleCount: Record<string, number> = {}
      team?.forEach(member => {
        roleCount[member.role || 'Unknown'] = (roleCount[member.role || 'Unknown'] || 0) + 1
      })

      return Object.entries(roleCount).map(([name, value]) => ({ name, value }))
    }

    return []
  }

  const renderChart = () => {
    const metric = widget.config.metric || ''

    if (data.length === 0) {
      return <div className="flex items-center justify-center h-full text-gray-500">No data available</div>
    }

    switch (chartType) {
      case 'bar':
        if (metric === 'attendance_stats' || metric === 'salary_by_employee' || metric === 'salary_overview') {
          return (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey={metric === 'attendance_stats' ? 'date' : 'name'} stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} iconType="circle" />
                {metric === 'attendance_stats' ? (
                  <>
                    <Bar dataKey="present" fill="#3b82f6" radius={[8, 8, 0, 0]} name="Present" />
                    <Bar dataKey="absent" fill="#f87171" radius={[8, 8, 0, 0]} name="Absent" />
                  </>
                ) : (
                  <>
                    <Bar dataKey="earned" fill="#3b82f6" radius={[8, 8, 0, 0]} name="Earned" />
                    <Bar dataKey="budget" fill="#10b981" radius={[8, 8, 0, 0]} name="Budget" />
                  </>
                )}
              </BarChart>
            </ResponsiveContainer>
          )
        }
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

      case 'line':
        const lineDataKey = data[0]?.leads ? 'leads' : data[0]?.contacts ? 'contacts' : data[0]?.appointments ? 'appointments' : 'value'
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
              <Line type="monotone" dataKey={lineDataKey} stroke="#3b82f6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        )

      case 'area':
        if (metric === 'salary_overview') {
          return (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorEarned" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorBudget" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Area type="monotone" dataKey="earned" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorEarned)" name="Earned" />
                <Area type="monotone" dataKey="budget" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorBudget)" name="Budget" />
              </AreaChart>
            </ResponsiveContainer>
          )
        }
        const areaDataKey = data[0]?.revenue ? 'revenue' : data[0]?.leads ? 'leads' : data[0]?.contacts ? 'contacts' : 'value'
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey={data[0]?.month ? 'month' : 'date'} stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
              <Area type="monotone" dataKey={areaDataKey} stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorArea)" />
            </AreaChart>
          </ResponsiveContainer>
        )

      case 'pie':
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

  const handleChartTypeChange = (newType: string) => {
    setChartType(newType)
    if (onConfig) {
      onConfig({
        ...widget.config,
        chartType: newType
      })
    }
  }

  return (
    <>
      <BaseWidget
        title={widget.title}
        onRefresh={handleRefresh}
        onRemove={onRemove}
        onConfig={() => setShowSettings(!showSettings)}
        isLoading={loading}
        colorScheme={widget.config.colorScheme}
      >
        <div className="h-full min-h-[200px] relative">
          {showSettings && (
            <div className="absolute top-0 left-0 right-0 z-10 bg-white border border-gray-200 rounded-lg shadow-lg p-4 m-2">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-sm">Chart Settings</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSettings(false)}
                  className="h-6 w-6 p-0"
                >
                  ×
                </Button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-1">
                    Chart Type
                  </label>
                  <select
                    value={chartType}
                    onChange={(e) => handleChartTypeChange(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {CHART_TYPES.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
          {renderChart()}
        </div>
      </BaseWidget>
    </>
  )
}
