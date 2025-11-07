import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Users, DollarSign, Clock, TrendingUp, Calendar,
  Download, Filter, Search, ChevronDown
} from 'lucide-react'
import { PageHeader } from '@/components/Common/PageHeader'
import { KPICard } from '@/components/Common/KPICard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns'

interface TeamMember {
  id: string
  full_name: string
  email: string
  role: string
  salary: number
}

interface AttendanceRecord {
  id: string
  admin_user_id: string
  date: string
  check_in_time: string
  check_out_time: string | null
  status: string
  actual_working_hours: number
  admin_user?: TeamMember
}

interface EmployeePayrollData {
  id: string
  name: string
  role: string
  totalDays: number
  presentDays: number
  halfDays: number
  fullDays: number
  overtime: number
  absentDays: number
  totalHours: number
  salary: number
  perDaySalary: number
  earnedSalary: number
}

export function PayrollMIS() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'))
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [payrollData, setPayrollData] = useState<EmployeePayrollData[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchData()
  }, [selectedMonth])

  const fetchData = async () => {
    setLoading(true)
    try {
      await Promise.all([fetchTeamMembers(), fetchAttendance()])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchTeamMembers = async () => {
    const { data, error } = await supabase
      .from('admin_users')
      .select('id, full_name, email, role')
      .order('full_name')

    if (error) {
      console.error('Error fetching team members:', error)
      return
    }

    // Mock salary data
    const membersWithSalary = (data || []).map(member => ({
      ...member,
      salary: Math.floor(Math.random() * (80000 - 30000 + 1)) + 30000
    }))

    setTeamMembers(membersWithSalary)
  }

  const fetchAttendance = async () => {
    const startDate = format(startOfMonth(new Date(selectedMonth)), 'yyyy-MM-dd')
    const endDate = format(endOfMonth(new Date(selectedMonth)), 'yyyy-MM-dd')

    const { data, error } = await supabase
      .from('attendance')
      .select(`
        *,
        admin_user:admin_users(id, full_name, email, role)
      `)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false })

    if (error) {
      console.error('Error fetching attendance:', error)
      return
    }

    setAttendance(data || [])
  }

  useEffect(() => {
    if (teamMembers.length > 0 && attendance.length >= 0) {
      calculatePayrollData()
    }
  }, [teamMembers, attendance, selectedMonth])

  const calculatePayrollData = () => {
    const monthStart = startOfMonth(new Date(selectedMonth))
    const monthEnd = endOfMonth(new Date(selectedMonth))
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd }).length

    const payroll: EmployeePayrollData[] = teamMembers.map(member => {
      const memberAttendance = attendance.filter(a => a.admin_user_id === member.id)

      const presentDays = memberAttendance.filter(a => a.status === 'Present').length
      const halfDays = memberAttendance.filter(a => a.status === 'Half Day').length
      const fullDays = memberAttendance.filter(a => a.status === 'Full Day').length
      const overtime = memberAttendance.filter(a => a.status === 'Overtime').length
      const absentDays = daysInMonth - (presentDays + halfDays + fullDays + overtime)

      const totalHours = memberAttendance.reduce((sum, a) => sum + (a.actual_working_hours || 0), 0)

      const perDaySalary = member.salary / daysInMonth

      // Calculate earned salary: Full Day = 1 day, Half Day = 0.5 day, Overtime = 1.5 day, Present = based on hours
      const earnedDays = fullDays + (halfDays * 0.5) + (overtime * 1.5) + presentDays
      const earnedSalary = Math.round(earnedDays * perDaySalary)

      return {
        id: member.id,
        name: member.full_name,
        role: member.role,
        totalDays: daysInMonth,
        presentDays,
        halfDays,
        fullDays,
        overtime,
        absentDays,
        totalHours: Math.round(totalHours * 10) / 10,
        salary: member.salary,
        perDaySalary: Math.round(perDaySalary),
        earnedSalary
      }
    })

    setPayrollData(payroll)
  }

  const filteredPayrollData = payrollData.filter(employee =>
    employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    employee.role.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const totalSalary = payrollData.reduce((sum, emp) => sum + emp.salary, 0)
  const totalEarnedSalary = payrollData.reduce((sum, emp) => sum + emp.earnedSalary, 0)
  const totalAbsent = payrollData.reduce((sum, emp) => sum + emp.absentDays, 0)
  const totalHours = payrollData.reduce((sum, emp) => sum + emp.totalHours, 0)

  const exportToCSV = () => {
    const headers = ['Employee', 'Role', 'Total Days', 'Present', 'Half Day', 'Full Day', 'Overtime', 'Absent', 'Total Hours', 'Monthly Salary', 'Per Day Salary', 'Earned Salary']
    const rows = filteredPayrollData.map(emp => [
      emp.name,
      emp.role,
      emp.totalDays,
      emp.presentDays,
      emp.halfDays,
      emp.fullDays,
      emp.overtime,
      emp.absentDays,
      emp.totalHours,
      emp.salary,
      emp.perDaySalary,
      emp.earnedSalary
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `payroll-mis-${selectedMonth}.csv`
    a.click()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4 mb-4">
            <Button
              onClick={() => navigate('/reports')}
              variant="outline"
              size="sm"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Reports
            </Button>
          </div>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Payroll MIS Dashboard</h1>
              <p className="text-gray-500 mt-1">Comprehensive attendance and payroll management</p>
            </div>
            <div className="flex items-center gap-3 mt-4 md:mt-0">
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
              <Button onClick={exportToCSV} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <KPICard
            title="Total Employees"
            value={payrollData.length}
            icon={Users}
            trend={{ value: 0, isPositive: true }}
          />
          <KPICard
            title="Total Salary Budget"
            value={`₹${(totalSalary / 1000).toFixed(0)}K`}
            icon={DollarSign}
            trend={{ value: 0, isPositive: true }}
          />
          <KPICard
            title="Earned Salary"
            value={`₹${(totalEarnedSalary / 1000).toFixed(0)}K`}
            icon={TrendingUp}
            trend={{ value: ((totalEarnedSalary / totalSalary) * 100).toFixed(1), isPositive: true }}
          />
          <KPICard
            title="Total Working Hours"
            value={`${totalHours.toFixed(0)}h`}
            icon={Clock}
            trend={{ value: 0, isPositive: true }}
          />
        </div>

        {/* Search Bar */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by employee name or role..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payroll Table */}
        <Card>
          <CardHeader>
            <CardTitle>Employee Payroll Details - {format(new Date(selectedMonth), 'MMMM yyyy')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Employee</th>
                    <th className="text-left py-3 px-4 font-medium">Role</th>
                    <th className="text-center py-3 px-4 font-medium">Present</th>
                    <th className="text-center py-3 px-4 font-medium">Half Day</th>
                    <th className="text-center py-3 px-4 font-medium">Full Day</th>
                    <th className="text-center py-3 px-4 font-medium">Overtime</th>
                    <th className="text-center py-3 px-4 font-medium">Absent</th>
                    <th className="text-center py-3 px-4 font-medium">Total Hours</th>
                    <th className="text-right py-3 px-4 font-medium">Monthly Salary</th>
                    <th className="text-right py-3 px-4 font-medium">Earned Salary</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={10} className="text-center py-8 text-gray-500">
                        Loading...
                      </td>
                    </tr>
                  ) : filteredPayrollData.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-8 text-gray-500">
                        No employees found
                      </td>
                    </tr>
                  ) : (
                    filteredPayrollData.map((employee) => (
                      <tr key={employee.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="font-medium text-gray-900">{employee.name}</div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline">{employee.role}</Badge>
                        </td>
                        <td className="text-center py-3 px-4">{employee.presentDays}</td>
                        <td className="text-center py-3 px-4">{employee.halfDays}</td>
                        <td className="text-center py-3 px-4">{employee.fullDays}</td>
                        <td className="text-center py-3 px-4">{employee.overtime}</td>
                        <td className="text-center py-3 px-4">
                          <span className={employee.absentDays > 5 ? 'text-red-600 font-semibold' : ''}>
                            {employee.absentDays}
                          </span>
                        </td>
                        <td className="text-center py-3 px-4">{employee.totalHours}h</td>
                        <td className="text-right py-3 px-4 font-medium">
                          ₹{employee.salary.toLocaleString()}
                        </td>
                        <td className="text-right py-3 px-4 font-semibold text-green-600">
                          ₹{employee.earnedSalary.toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {filteredPayrollData.length > 0 && (
                  <tfoot className="bg-gray-50 font-semibold">
                    <tr>
                      <td colSpan={2} className="py-3 px-4 text-right">Total:</td>
                      <td className="text-center py-3 px-4">
                        {filteredPayrollData.reduce((sum, emp) => sum + emp.presentDays, 0)}
                      </td>
                      <td className="text-center py-3 px-4">
                        {filteredPayrollData.reduce((sum, emp) => sum + emp.halfDays, 0)}
                      </td>
                      <td className="text-center py-3 px-4">
                        {filteredPayrollData.reduce((sum, emp) => sum + emp.fullDays, 0)}
                      </td>
                      <td className="text-center py-3 px-4">
                        {filteredPayrollData.reduce((sum, emp) => sum + emp.overtime, 0)}
                      </td>
                      <td className="text-center py-3 px-4">
                        {filteredPayrollData.reduce((sum, emp) => sum + emp.absentDays, 0)}
                      </td>
                      <td className="text-center py-3 px-4">
                        {filteredPayrollData.reduce((sum, emp) => sum + emp.totalHours, 0).toFixed(0)}h
                      </td>
                      <td className="text-right py-3 px-4">
                        ₹{filteredPayrollData.reduce((sum, emp) => sum + emp.salary, 0).toLocaleString()}
                      </td>
                      <td className="text-right py-3 px-4 text-green-600">
                        ₹{filteredPayrollData.reduce((sum, emp) => sum + emp.earnedSalary, 0).toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Salary Calculation Info */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Salary Calculation Logic</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Attendance Status Weight:</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• Full Day = 1.0 day</li>
                  <li>• Half Day = 0.5 day</li>
                  <li>• Overtime = 1.5 day</li>
                  <li>• Present = 1.0 day (based on hours worked)</li>
                  <li>• Absent = 0.0 day</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Calculation Formula:</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• Per Day Salary = Monthly Salary ÷ Total Days in Month</li>
                  <li>• Earned Days = (Full Days × 1) + (Half Days × 0.5) + (Overtime × 1.5) + Present</li>
                  <li>• Earned Salary = Earned Days × Per Day Salary</li>
                </ul>
              </div>
            </div>
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> This is a mock payroll calculation using random salary data for demonstration purposes.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
