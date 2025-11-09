import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  Users,
  Calendar,
  Download,
  Filter,
  Target,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react'
import { PageHeader } from '@/components/Common/PageHeader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import * as XLSX from 'xlsx'
import { BarChart, Bar, PieChart as RePieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface TaskMetrics {
  totalTasks: number
  completedTasks: number
  inProgressTasks: number
  overdueTasks: number
  completionRate: number
  averageCompletionTime: number
  totalEstimatedHours: number
  totalActualHours: number
  productivityRate: number
}

interface TaskByStatus {
  status: string
  count: number
}

interface TaskByPriority {
  priority: string
  count: number
}

interface TaskByCategory {
  category: string
  count: number
  completed: number
}

interface TeamMemberPerformance {
  name: string
  total_tasks: number
  completed_tasks: number
  in_progress_tasks: number
  completion_rate: number
  avg_completion_days: number
}

interface DailyTaskTrend {
  date: string
  created: number
  completed: number
}

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']
const STATUS_COLORS: Record<string, string> = {
  'To Do': '#94a3b8',
  'In Progress': '#3b82f6',
  'In Review': '#f59e0b',
  'Completed': '#22c55e',
  'Cancelled': '#ef4444'
}

const PRIORITY_COLORS: Record<string, string> = {
  'Low': '#94a3b8',
  'Medium': '#3b82f6',
  'High': '#f59e0b',
  'Urgent': '#ef4444'
}

export function TasksMIS() {
  const [metrics, setMetrics] = useState<TaskMetrics>({
    totalTasks: 0,
    completedTasks: 0,
    inProgressTasks: 0,
    overdueTasks: 0,
    completionRate: 0,
    averageCompletionTime: 0,
    totalEstimatedHours: 0,
    totalActualHours: 0,
    productivityRate: 100
  })
  const [tasksByStatus, setTasksByStatus] = useState<TaskByStatus[]>([])
  const [tasksByPriority, setTasksByPriority] = useState<TaskByPriority[]>([])
  const [tasksByCategory, setTasksByCategory] = useState<TaskByCategory[]>([])
  const [teamPerformance, setTeamPerformance] = useState<TeamMemberPerformance[]>([])
  const [dailyTrends, setDailyTrends] = useState<DailyTaskTrend[]>([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('thisMonth')

  useEffect(() => {
    fetchTasksData()
  }, [dateRange])

  const getDateRange = () => {
    const now = new Date()
    const start = new Date()

    switch (dateRange) {
      case 'today':
        start.setHours(0, 0, 0, 0)
        break
      case 'thisWeek':
        const dayOfWeek = start.getDay()
        start.setDate(start.getDate() - dayOfWeek)
        start.setHours(0, 0, 0, 0)
        break
      case 'thisMonth':
        start.setDate(1)
        start.setHours(0, 0, 0, 0)
        break
      case 'thisQuarter':
        const quarter = Math.floor(start.getMonth() / 3)
        start.setMonth(quarter * 3, 1)
        start.setHours(0, 0, 0, 0)
        break
      case 'thisYear':
        start.setMonth(0, 1)
        start.setHours(0, 0, 0, 0)
        break
      default:
        start.setDate(1)
        start.setHours(0, 0, 0, 0)
    }

    return {
      start: start.toISOString(),
      end: now.toISOString()
    }
  }

  const fetchTasksData = async () => {
    try {
      setLoading(true)
      const { start, end } = getDateRange()

      const { data: tasks, error } = await supabase
        .from('tasks')
        .select('*')
        .gte('created_at', start)
        .lte('created_at', end)

      if (error) throw error

      const allTasks = tasks || []
      const now = new Date()

      const completedTasks = allTasks.filter(t => t.status === 'Completed')
      const inProgressTasks = allTasks.filter(t => t.status === 'In Progress')
      const overdueTasks = allTasks.filter(t =>
        t.due_date &&
        new Date(t.due_date) < now &&
        t.status !== 'Completed' &&
        t.status !== 'Cancelled'
      )

      const completionTimes = completedTasks
        .filter(t => t.completion_date && t.created_at)
        .map(t => {
          const created = new Date(t.created_at).getTime()
          const completed = new Date(t.completion_date!).getTime()
          return (completed - created) / (1000 * 60 * 60 * 24)
        })

      const avgCompletionTime = completionTimes.length > 0
        ? completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length
        : 0

      const totalEstimated = allTasks.reduce((sum, t) => sum + (Number(t.estimated_hours) || 0), 0)
      const totalActual = allTasks.reduce((sum, t) => sum + (Number(t.actual_hours) || 0), 0)
      const productivityRate = totalEstimated > 0 ? (totalEstimated / totalActual) * 100 : 100

      setMetrics({
        totalTasks: allTasks.length,
        completedTasks: completedTasks.length,
        inProgressTasks: inProgressTasks.length,
        overdueTasks: overdueTasks.length,
        completionRate: allTasks.length > 0 ? (completedTasks.length / allTasks.length) * 100 : 0,
        averageCompletionTime: avgCompletionTime,
        totalEstimatedHours: totalEstimated,
        totalActualHours: totalActual,
        productivityRate: Math.min(productivityRate, 999)
      })

      const statusCounts = allTasks.reduce((acc, task) => {
        acc[task.status] = (acc[task.status] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      setTasksByStatus(
        Object.entries(statusCounts).map(([status, count]) => ({
          status,
          count
        }))
      )

      const priorityCounts = allTasks.reduce((acc, task) => {
        acc[task.priority] = (acc[task.priority] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      setTasksByPriority(
        Object.entries(priorityCounts).map(([priority, count]) => ({
          priority,
          count
        }))
      )

      const categoryCounts = allTasks.reduce((acc, task) => {
        const cat = task.category || 'Other'
        if (!acc[cat]) {
          acc[cat] = { count: 0, completed: 0 }
        }
        acc[cat].count += 1
        if (task.status === 'Completed') {
          acc[cat].completed += 1
        }
        return acc
      }, {} as Record<string, { count: number; completed: number }>)

      setTasksByCategory(
        Object.entries(categoryCounts).map(([category, data]) => ({
          category,
          count: data.count,
          completed: data.completed
        }))
      )

      const teamStats = allTasks.reduce((acc, task) => {
        const name = task.assigned_to_name || 'Unassigned'
        if (!acc[name]) {
          acc[name] = {
            total: 0,
            completed: 0,
            inProgress: 0,
            completionDays: []
          }
        }
        acc[name].total += 1
        if (task.status === 'Completed') {
          acc[name].completed += 1
          if (task.completion_date && task.created_at) {
            const days = (new Date(task.completion_date).getTime() - new Date(task.created_at).getTime()) / (1000 * 60 * 60 * 24)
            acc[name].completionDays.push(days)
          }
        }
        if (task.status === 'In Progress') {
          acc[name].inProgress += 1
        }
        return acc
      }, {} as Record<string, any>)

      setTeamPerformance(
        Object.entries(teamStats).map(([name, stats]) => ({
          name,
          total_tasks: stats.total,
          completed_tasks: stats.completed,
          in_progress_tasks: stats.inProgress,
          completion_rate: stats.total > 0 ? (stats.completed / stats.total) * 100 : 0,
          avg_completion_days: stats.completionDays.length > 0
            ? stats.completionDays.reduce((a: number, b: number) => a + b, 0) / stats.completionDays.length
            : 0
        }))
        .sort((a, b) => b.completion_rate - a.completion_rate)
      )

      const dailyStats = allTasks.reduce((acc, task) => {
        const createdDate = new Date(task.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        if (!acc[createdDate]) {
          acc[createdDate] = { created: 0, completed: 0 }
        }
        acc[createdDate].created += 1
        if (task.status === 'Completed' && task.completion_date) {
          const completedDate = new Date(task.completion_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          if (!acc[completedDate]) {
            acc[completedDate] = { created: 0, completed: 0 }
          }
          acc[completedDate].completed += 1
        }
        return acc
      }, {} as Record<string, { created: number; completed: number }>)

      setDailyTrends(
        Object.entries(dailyStats)
          .map(([date, data]) => ({
            date,
            created: data.created,
            completed: data.completed
          }))
          .slice(-14)
      )

    } catch (error) {
      console.error('Error fetching tasks data:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportToExcel = () => {
    const summaryData = [
      ['Tasks MIS Report'],
      ['Date Range', dateRange],
      [''],
      ['Key Metrics'],
      ['Total Tasks', metrics.totalTasks],
      ['Completed Tasks', metrics.completedTasks],
      ['In Progress Tasks', metrics.inProgressTasks],
      ['Overdue Tasks', metrics.overdueTasks],
      ['Completion Rate', `${metrics.completionRate.toFixed(1)}%`],
      ['Average Completion Time', `${metrics.averageCompletionTime.toFixed(1)} days`],
      ['Total Estimated Hours', metrics.totalEstimatedHours.toFixed(1)],
      ['Total Actual Hours', metrics.totalActualHours.toFixed(1)],
      ['Productivity Rate', `${metrics.productivityRate.toFixed(1)}%`],
      [''],
      ['Tasks by Status'],
      ['Status', 'Count'],
      ...tasksByStatus.map(s => [s.status, s.count]),
      [''],
      ['Tasks by Priority'],
      ['Priority', 'Count'],
      ...tasksByPriority.map(p => [p.priority, p.count]),
      [''],
      ['Tasks by Category'],
      ['Category', 'Total', 'Completed'],
      ...tasksByCategory.map(c => [c.category, c.count, c.completed]),
      [''],
      ['Team Performance'],
      ['Team Member', 'Total Tasks', 'Completed', 'In Progress', 'Completion Rate', 'Avg Days'],
      ...teamPerformance.map(t => [
        t.name,
        t.total_tasks,
        t.completed_tasks,
        t.in_progress_tasks,
        `${t.completion_rate.toFixed(1)}%`,
        t.avg_completion_days.toFixed(1)
      ])
    ]

    const ws = XLSX.utils.aoa_to_sheet(summaryData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Tasks MIS Report')
    XLSX.writeFile(wb, `Tasks_MIS_Report_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading tasks data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="Tasks MIS Report"
        description="Comprehensive task management analytics and team performance insights"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-gray-500" />
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
              >
                <option value="today">Today</option>
                <option value="thisWeek">This Week</option>
                <option value="thisMonth">This Month</option>
                <option value="thisQuarter">This Quarter</option>
                <option value="thisYear">This Year</option>
              </select>
            </div>
          </div>
          <Button onClick={exportToExcel} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export to Excel
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0 }}
          >
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardDescription>Total Tasks</CardDescription>
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">
                  {metrics.totalTasks}
                </div>
                <p className="text-sm text-gray-500 mt-1">All tasks created</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-l-4 border-l-green-500">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardDescription>Completed</CardDescription>
                  <div className="p-2 bg-green-50 rounded-lg">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">
                  {metrics.completedTasks}
                </div>
                <p className="text-sm text-green-600 mt-1">
                  {metrics.completionRate.toFixed(1)}% completion rate
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-l-4 border-l-orange-500">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardDescription>In Progress</CardDescription>
                  <div className="p-2 bg-orange-50 rounded-lg">
                    <Activity className="h-5 w-5 text-orange-600" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">
                  {metrics.inProgressTasks}
                </div>
                <p className="text-sm text-gray-500 mt-1">Currently active</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="border-l-4 border-l-red-500">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardDescription>Overdue</CardDescription>
                  <div className="p-2 bg-red-50 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">
                  {metrics.overdueTasks}
                </div>
                <p className="text-sm text-red-600 mt-1">Past due date</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardDescription>Avg Completion Time</CardDescription>
                  <Clock className="h-5 w-5 text-gray-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {metrics.averageCompletionTime.toFixed(1)}
                </div>
                <p className="text-sm text-gray-500 mt-1">Days per task</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardDescription>Total Hours</CardDescription>
                  <Clock className="h-5 w-5 text-gray-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {metrics.totalActualHours.toFixed(1)}
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  of {metrics.totalEstimatedHours.toFixed(1)} estimated
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardDescription>Productivity Rate</CardDescription>
                  <Target className="h-5 w-5 text-gray-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {metrics.productivityRate.toFixed(1)}%
                </div>
                <p className="text-sm text-gray-500 mt-1">Efficiency score</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Tasks by Status</CardTitle>
              <CardDescription>Distribution of tasks across statuses</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RePieChart>
                  <Pie
                    data={tasksByStatus}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ status, count }) => `${status}: ${count}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {tasksByStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status] || COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RePieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tasks by Priority</CardTitle>
              <CardDescription>Priority distribution of tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={tasksByPriority}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="priority" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6">
                    {tasksByPriority.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PRIORITY_COLORS[entry.priority] || COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Tasks by Category</CardTitle>
              <CardDescription>Completed vs total tasks per category</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={tasksByCategory}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" name="Total" fill="#3b82f6" />
                  <Bar dataKey="completed" name="Completed" fill="#22c55e" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Daily Task Trends</CardTitle>
              <CardDescription>Tasks created vs completed over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailyTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="created" stroke="#3b82f6" name="Created" strokeWidth={2} />
                  <Line type="monotone" dataKey="completed" stroke="#22c55e" name="Completed" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Team Performance</CardTitle>
            <CardDescription>Individual team member task completion metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Team Member</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Total Tasks</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Completed</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">In Progress</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Completion Rate</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Avg Days</th>
                  </tr>
                </thead>
                <tbody>
                  {teamPerformance.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-gray-500">
                        No team performance data available
                      </td>
                    </tr>
                  ) : (
                    teamPerformance.map((member, idx) => (
                      <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium text-gray-900">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-gray-400" />
                            {member.name}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center text-gray-900">{member.total_tasks}</td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                            {member.completed_tasks}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                            {member.in_progress_tasks}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${Math.min(member.completion_rate, 100)}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium text-gray-700">
                              {member.completion_rate.toFixed(0)}%
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center text-gray-900">
                          {member.avg_completion_days.toFixed(1)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
