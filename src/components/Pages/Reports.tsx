import React from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  DollarSign, TrendingUp, BarChart3, FileText, Users, Calendar,
  LayoutDashboard, Sparkles, Plus
} from 'lucide-react'
import { PageHeader } from '@/components/Common/PageHeader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface ReportCard {
  id: string
  title: string
  description: string
  icon: React.ElementType
  color: string
  bgColor: string
  route: string
  available: boolean
  featured?: boolean
}

const reportCards: ReportCard[] = [
  {
    id: 'custom-dashboard',
    title: 'Custom Dashboard Builder',
    description: 'Build your own custom MIS dashboard with module-wise widgets tailored to your needs',
    icon: LayoutDashboard,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    route: '/reports/custom-dashboard',
    available: true,
    featured: true
  },
  {
    id: 'dashboard-templates',
    title: 'Dashboard Templates',
    description: 'Choose from pre-built dashboard templates for Executive, Sales, HR, Finance, and Operations',
    icon: Sparkles,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    route: '/reports/templates',
    available: true,
    featured: true
  },
  {
    id: 'payroll-mis',
    title: 'Payroll MIS',
    description: 'Comprehensive attendance and payroll management reports with employee metrics',
    icon: DollarSign,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    route: '/reports/payroll-mis',
    available: true
  },
  {
    id: 'sales-report',
    title: 'Sales Report',
    description: 'Track sales performance, revenue, and conversion metrics',
    icon: TrendingUp,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    route: '/reports/sales',
    available: false
  },
  {
    id: 'analytics',
    title: 'Business Analytics',
    description: 'Detailed business insights and KPI tracking',
    icon: BarChart3,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    route: '/reports/analytics',
    available: false
  },
  {
    id: 'financial',
    title: 'Financial Report',
    description: 'Comprehensive financial statements and expense analysis',
    icon: FileText,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    route: '/reports/financial',
    available: false
  }
]

export function Reports() {
  const navigate = useNavigate()

  const handleCardClick = (report: ReportCard) => {
    if (report.available) {
      navigate(report.route)
    }
  }

  const featuredReports = reportCards.filter(r => r.featured)
  const standardReports = reportCards.filter(r => !r.featured)

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="MIS Reports & Dashboards"
        description="Build custom dashboards or choose from pre-built reports"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Custom Dashboard Builder</h2>
            <span className="text-xs font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
              New Feature
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {featuredReports.map((report, index) => {
              const Icon = report.icon
              return (
                <motion.div
                  key={report.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.02, y: -4 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Card
                    className="h-full cursor-pointer transition-all duration-200 hover:shadow-xl border-2 border-blue-200 hover:border-blue-500 bg-gradient-to-br from-white to-blue-50"
                    onClick={() => handleCardClick(report)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className={`p-4 rounded-xl ${report.bgColor} ring-2 ring-blue-200`}>
                          <Icon className={`h-10 w-10 ${report.color}`} />
                        </div>
                      </div>
                      <CardTitle className="mt-4 text-xl">{report.title}</CardTitle>
                      <CardDescription className="text-sm mt-2">
                        {report.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button className="w-full flex items-center justify-center gap-2">
                        <Plus className="w-4 h-4" />
                        Get Started
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </div>

        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Pre-Built Reports</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {standardReports.map((report, index) => {
            const Icon = report.icon
            return (
              <motion.div
                key={report.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: (featuredReports.length * 0.1) + (index * 0.1) }}
                whileHover={report.available ? { scale: 1.02, y: -4 } : {}}
                whileTap={report.available ? { scale: 0.98 } : {}}
              >
                <Card
                  className={`h-full cursor-pointer transition-all duration-200 ${
                    report.available
                      ? 'hover:shadow-xl border-2 border-transparent hover:border-brand-primary'
                      : 'opacity-60 cursor-not-allowed'
                  }`}
                  onClick={() => handleCardClick(report)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className={`p-3 rounded-xl ${report.bgColor}`}>
                        <Icon className={`h-8 w-8 ${report.color}`} />
                      </div>
                      {!report.available && (
                        <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                          Coming Soon
                        </span>
                      )}
                    </div>
                    <CardTitle className="mt-4 text-xl">{report.title}</CardTitle>
                    <CardDescription className="text-sm mt-2">
                      {report.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {report.available ? (
                      <div className="flex items-center text-sm text-brand-primary font-medium">
                        View Report
                        <svg
                          className="ml-1 w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-400">
                        This report will be available soon
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>

        <div className="mt-12 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl shadow-sm border border-blue-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">About Custom Dashboards</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="text-3xl font-bold text-blue-600">50+</div>
              <div className="text-sm text-gray-600 mt-1">Available Widgets</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-purple-600">6</div>
              <div className="text-sm text-gray-600 mt-1">Dashboard Templates</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-green-600">12</div>
              <div className="text-sm text-gray-600 mt-1">Module Categories</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
