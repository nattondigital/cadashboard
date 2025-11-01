import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Users, UserPlus, TrendingUp, Calendar, Eye, Target, Award, Clock,
  DollarSign, BookOpen, MessageCircle, Zap, Shield, Link as LinkIcon,
  Star, Activity, CheckCircle, AlertCircle, Play, Pause, Bell,
  CreditCard, FileText, HelpCircle, Settings, BarChart3, PieChart,
  ArrowUpRight, ArrowDownRight, Sparkles, Globe, Smartphone,
  Mail, Phone, MapPin, Building, Crown, User
} from 'lucide-react'
import { PageHeader } from '@/components/Common/PageHeader'
import { KPICard } from '@/components/Common/KPICard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { makeApiCall, formatCurrency, formatDate } from '@/lib/utils'

// Mock data for comprehensive dashboard
const mockDashboardData = {
  // Lead Management KPIs
  leads: {
    total: 156,
    new7d: 45,
    hot: 23,
    contacted: 89,
    converted: 34,
    conversionRate: 21.8,
    sources: {
      'Facebook Ads': 45,
      'Website': 32,
      'Referrals': 28,
      'LinkedIn': 21,
      'Webinars': 18,
      'Cold Calls': 12
    }
  },
  
  // Member Management KPIs
  members: {
    total: 234,
    active: 198,
    new30d: 23,
    churnRate: 5.2,
    avgLifetime: 8.5,
    plans: {
      'Basic': 89,
      'Pro': 98,
      'Premium': 47
    },
    engagement: 78.5
  },
  
  // Course Management KPIs
  courses: {
    total: 12,
    published: 9,
    students: 456,
    completionRate: 76.3,
    avgRating: 4.7,
    revenue: 1250000,
    topCourses: [
      { name: 'AI Automation Mastery', students: 156, rating: 4.8 },
      { name: 'WhatsApp Business Automation', students: 134, rating: 4.9 },
      { name: 'Advanced CRM Integration', students: 98, rating: 4.6 }
    ]
  },
  
  // Billing & Revenue KPIs
  billing: {
    totalRevenue: 2450000,
    monthlyRevenue: 345000,
    outstandingAmount: 125000,
    paidInvoices: 89,
    pendingInvoices: 23,
    overdueInvoices: 8,
    avgInvoiceValue: 15000,
    paymentMethods: {
      'UPI': 45,
      'Credit Card': 32,
      'Bank Transfer': 28,
      'Cash': 15
    }
  },
  
  // Affiliate Management KPIs
  affiliates: {
    total: 45,
    active: 34,
    totalReferrals: 123,
    totalEarnings: 456000,
    pendingPayouts: 89000,
    avgCommission: 16.5,
    topPerformers: [
      { name: 'Rajesh Kumar', referrals: 23, earnings: 45000 },
      { name: 'Priya Sharma', referrals: 19, earnings: 38000 },
      { name: 'Amit Singh', referrals: 15, earnings: 32000 }
    ]
  },
  
  // Team Management KPIs
  team: {
    total: 12,
    active: 11,
    departments: 5,
    admins: 3,
    avgResponseTime: '2h 30m',
    productivity: 87.5
  },
  
  // Automation KPIs
  automations: {
    total: 15,
    active: 12,
    runsToday: 234,
    successRate: 94.2,
    totalRuns: 12456,
    categories: {
      'Lead Nurturing': 5,
      'Student Engagement': 4,
      'Payment Recovery': 3,
      'Demo Management': 2,
      'Affiliate Management': 1
    }
  },
  
  // Support KPIs
  support: {
    totalTickets: 89,
    openTickets: 23,
    resolvedTickets: 56,
    avgResponseTime: '4h 30m',
    satisfaction: 4.6,
    categories: {
      'Technical': 34,
      'Billing': 23,
      'Course': 18,
      'General': 14
    }
  }
}

const recentActivities = [
  { 
    type: 'lead', 
    message: 'New hot lead from Facebook Ad: Priya Sharma', 
    time: '2 mins ago',
    icon: Users,
    color: 'bg-blue-100 text-blue-600'
  },
  { 
    type: 'enrollment', 
    message: 'Arjun Kumar enrolled in Pro plan (₹15,000)', 
    time: '15 mins ago',
    icon: UserPlus,
    color: 'bg-green-100 text-green-600'
  },
  { 
    type: 'course', 
    message: 'AI Automation Mastery reached 150+ students', 
    time: '1 hour ago',
    icon: BookOpen,
    color: 'bg-purple-100 text-purple-600'
  },
  { 
    type: 'automation', 
    message: 'Welcome sequence sent to 12 new leads', 
    time: '2 hours ago',
    icon: Zap,
    color: 'bg-orange-100 text-orange-600'
  },
  { 
    type: 'payment', 
    message: 'Payment of ₹25,000 received from Vikash Kumar', 
    time: '3 hours ago',
    icon: CreditCard,
    color: 'bg-green-100 text-green-600'
  },
  { 
    type: 'support', 
    message: 'Support ticket resolved: Course access issue', 
    time: '4 hours ago',
    icon: HelpCircle,
    color: 'bg-yellow-100 text-yellow-600'
  }
]

export function Dashboard() {
  const [dashboardData, setDashboardData] = useState(mockDashboardData)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    // In production, this would load real dashboard data
    // For now, using mock data without delay
    setIsLoading(false)
  }, [])

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  }

  return (
    <div className="ppt-slide p-6 bg-gradient-to-br from-brand-surface via-white to-brand-surface/50 min-h-screen">
      {/* Hero KPI Cards */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants}>
          <KPICard
            title="Total Revenue"
            value={formatCurrency(dashboardData.billing.totalRevenue)}
            change={22}
            icon={DollarSign}
            category="success"
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <KPICard
            title="Active Members"
            value={dashboardData.members.active}
            change={8}
            icon={Users}
            category="success"
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <KPICard
            title="Course Students"
            value={dashboardData.courses.students}
            change={15}
            icon={BookOpen}
            category="secondary"
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <KPICard
            title="Automation Runs"
            value={dashboardData.automations.runsToday}
            change={12}
            icon={Zap}
            category="secondary"
          />
        </motion.div>
      </motion.div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Lead Funnel & Conversion */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2"
        >
          <Card className="shadow-xl bg-gradient-to-br from-white to-blue-50 border-0">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
              <CardTitle className="flex items-center space-x-2">
                <Target className="w-6 h-6" />
                <span>Lead Conversion Funnel</span>
                <Badge className="bg-white/20 text-white ml-auto">
                  {dashboardData.leads.conversionRate}% Conversion
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6">
                {[
                  { stage: 'Total Leads', count: dashboardData.leads.total, percentage: 100, color: 'from-blue-500 to-blue-600' },
                  { stage: 'Contacted', count: dashboardData.leads.contacted, percentage: 57, color: 'from-green-500 to-green-600' },
                  { stage: 'Hot Leads', count: dashboardData.leads.hot, percentage: 15, color: 'from-orange-500 to-orange-600' },
                  { stage: 'Converted', count: dashboardData.leads.converted, percentage: 22, color: 'from-purple-500 to-purple-600' }
                ].map((item, index) => (
                  <div key={item.stage} className="space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-3">
                        <div className={`w-4 h-4 rounded-full bg-gradient-to-r ${item.color}`} />
                        <span className="font-semibold text-gray-800">{item.stage}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-bold text-gray-900">{item.count}</span>
                        <span className="text-sm text-gray-500 ml-2">({item.percentage}%)</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                      <motion.div 
                        className={`h-3 rounded-full bg-gradient-to-r ${item.color} shadow-lg`}
                        initial={{ width: 0 }}
                        animate={{ width: `${item.percentage}%` }}
                        transition={{ delay: 0.5 + index * 0.2, duration: 0.8, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Activity Feed */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="shadow-xl bg-gradient-to-br from-white to-green-50 border-0 h-full">
            <CardHeader className="bg-gradient-to-r from-green-600 to-green-700 text-white rounded-t-lg">
              <CardTitle className="flex items-center space-x-2">
                <Activity className="w-6 h-6" />
                <span>Live Activity Feed</span>
                <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse ml-auto" />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {recentActivities.map((activity, index) => {
                  const Icon = activity.icon
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 + index * 0.1 }}
                      className="flex items-start space-x-3 p-3 rounded-lg bg-white shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100"
                    >
                      <div className={`p-2 rounded-lg ${activity.color} shadow-sm`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 leading-relaxed">{activity.message}</p>
                        <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Revenue & Financial Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="shadow-xl bg-gradient-to-br from-white to-purple-50 border-0">
            <CardHeader className="bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-t-lg">
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="w-6 h-6" />
                <span>Revenue Analytics</span>
                <ArrowUpRight className="w-5 h-5 ml-auto" />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div className="text-center p-4 bg-gradient-to-br from-green-100 to-green-200 rounded-xl">
                  <div className="text-3xl font-bold text-green-700 mb-2">
                    {formatCurrency(dashboardData.billing.monthlyRevenue)}
                  </div>
                  <div className="text-sm text-green-600 font-medium">Monthly Revenue</div>
                  <div className="flex items-center justify-center mt-2">
                    <ArrowUpRight className="w-4 h-4 text-green-600 mr-1" />
                    <span className="text-xs text-green-600">+18% vs last month</span>
                  </div>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl">
                  <div className="text-3xl font-bold text-blue-700 mb-2">
                    {formatCurrency(dashboardData.billing.avgInvoiceValue)}
                  </div>
                  <div className="text-sm text-blue-600 font-medium">Avg Invoice Value</div>
                  <div className="flex items-center justify-center mt-2">
                    <ArrowUpRight className="w-4 h-4 text-blue-600 mr-1" />
                    <span className="text-xs text-blue-600">+12% vs last month</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-white rounded-lg shadow-sm">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="font-medium">Paid Invoices</span>
                  </div>
                  <span className="text-xl font-bold text-green-600">{dashboardData.billing.paidInvoices}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-white rounded-lg shadow-sm">
                  <div className="flex items-center space-x-3">
                    <Clock className="w-5 h-5 text-yellow-500" />
                    <span className="font-medium">Pending Invoices</span>
                  </div>
                  <span className="text-xl font-bold text-yellow-600">{dashboardData.billing.pendingInvoices}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-white rounded-lg shadow-sm">
                  <div className="flex items-center space-x-3">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <span className="font-medium">Overdue Invoices</span>
                  </div>
                  <span className="text-xl font-bold text-red-600">{dashboardData.billing.overdueInvoices}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="shadow-xl bg-gradient-to-br from-white to-orange-50 border-0">
            <CardHeader className="bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-t-lg">
              <CardTitle className="flex items-center space-x-2">
                <BookOpen className="w-6 h-6" />
                <span>Course Performance</span>
                <Star className="w-5 h-5 text-yellow-300 ml-auto" />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="text-center p-4 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-xl">
                  <div className="text-3xl font-bold text-indigo-700 mb-2">{dashboardData.courses.avgRating}</div>
                  <div className="text-sm text-indigo-600 font-medium">Avg Rating</div>
                  <div className="flex justify-center mt-2">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star
                        key={i}
                        className={`w-3 h-3 ${i < Math.floor(dashboardData.courses.avgRating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                      />
                    ))}
                  </div>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-pink-100 to-pink-200 rounded-xl">
                  <div className="text-3xl font-bold text-pink-700 mb-2">{dashboardData.courses.completionRate}%</div>
                  <div className="text-sm text-pink-600 font-medium">Completion Rate</div>
                  <div className="w-full bg-pink-300 rounded-full h-2 mt-2">
                    <motion.div 
                      className="h-2 rounded-full bg-pink-600"
                      initial={{ width: 0 }}
                      animate={{ width: `${dashboardData.courses.completionRate}%` }}
                      transition={{ delay: 1, duration: 0.8 }}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-gray-800 mb-3">Top Performing Courses</h4>
                {dashboardData.courses.topCourses.map((course, index) => (
                  <div key={course.name} className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-orange-400 to-orange-500 flex items-center justify-center text-white font-bold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium text-gray-800 text-sm">{course.name}</div>
                        <div className="text-xs text-gray-500">{course.students} students</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <span className="text-sm font-bold text-gray-700">{course.rating}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Module-wise KPI Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
      >
        {/* Leads Module */}
        <Card className="shadow-xl bg-gradient-to-br from-blue-50 to-blue-100 border-0 hover:shadow-2xl transition-all duration-300">
          <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center space-x-2 text-lg">
              <Users className="w-5 h-5" />
              <span>Leads CRM</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Leads</span>
                <span className="text-xl font-bold text-blue-600">{dashboardData.leads.total}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">New (7d)</span>
                <span className="text-lg font-semibold text-green-600">{dashboardData.leads.new7d}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Hot Leads</span>
                <span className="text-lg font-semibold text-red-600">{dashboardData.leads.hot}</span>
              </div>
              <div className="pt-2 border-t">
                <div className="text-xs text-gray-500 mb-1">Conversion Rate</div>
                <div className="flex items-center space-x-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <motion.div 
                      className="h-2 rounded-full bg-gradient-to-r from-blue-400 to-blue-600"
                      initial={{ width: 0 }}
                      animate={{ width: `${dashboardData.leads.conversionRate}%` }}
                      transition={{ delay: 1.2, duration: 0.8 }}
                    />
                  </div>
                  <span className="text-sm font-bold text-blue-600">{dashboardData.leads.conversionRate}%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Members Module */}
        <Card className="shadow-xl bg-gradient-to-br from-green-50 to-green-100 border-0 hover:shadow-2xl transition-all duration-300">
          <CardHeader className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center space-x-2 text-lg">
              <UserPlus className="w-5 h-5" />
              <span>Members</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Members</span>
                <span className="text-xl font-bold text-green-600">{dashboardData.members.total}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Active</span>
                <span className="text-lg font-semibold text-green-600">{dashboardData.members.active}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">New (30d)</span>
                <span className="text-lg font-semibold text-blue-600">{dashboardData.members.new30d}</span>
              </div>
              <div className="pt-2 border-t">
                <div className="text-xs text-gray-500 mb-1">Engagement Rate</div>
                <div className="flex items-center space-x-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <motion.div 
                      className="h-2 rounded-full bg-gradient-to-r from-green-400 to-green-600"
                      initial={{ width: 0 }}
                      animate={{ width: `${dashboardData.members.engagement}%` }}
                      transition={{ delay: 1.3, duration: 0.8 }}
                    />
                  </div>
                  <span className="text-sm font-bold text-green-600">{dashboardData.members.engagement}%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Affiliates Module */}
        <Card className="shadow-xl bg-gradient-to-br from-purple-50 to-purple-100 border-0 hover:shadow-2xl transition-all duration-300">
          <CardHeader className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center space-x-2 text-lg">
              <LinkIcon className="w-5 h-5" />
              <span>Affiliates</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Affiliates</span>
                <span className="text-xl font-bold text-purple-600">{dashboardData.affiliates.total}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Active</span>
                <span className="text-lg font-semibold text-green-600">{dashboardData.affiliates.active}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Referrals</span>
                <span className="text-lg font-semibold text-blue-600">{dashboardData.affiliates.totalReferrals}</span>
              </div>
              <div className="pt-2 border-t">
                <div className="text-xs text-gray-500 mb-1">Total Earnings</div>
                <div className="text-sm font-bold text-purple-600">{formatCurrency(dashboardData.affiliates.totalEarnings)}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Support Module */}
        <Card className="shadow-xl bg-gradient-to-br from-yellow-50 to-yellow-100 border-0 hover:shadow-2xl transition-all duration-300">
          <CardHeader className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center space-x-2 text-lg">
              <HelpCircle className="w-5 h-5" />
              <span>Support</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Tickets</span>
                <span className="text-xl font-bold text-yellow-600">{dashboardData.support.totalTickets}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Open</span>
                <span className="text-lg font-semibold text-red-600">{dashboardData.support.openTickets}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Resolved</span>
                <span className="text-lg font-semibold text-green-600">{dashboardData.support.resolvedTickets}</span>
              </div>
              <div className="pt-2 border-t">
                <div className="text-xs text-gray-500 mb-1">Satisfaction Score</div>
                <div className="flex items-center space-x-2">
                  <div className="flex">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star
                        key={i}
                        className={`w-3 h-3 ${i < Math.floor(dashboardData.support.satisfaction) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                      />
                    ))}
                  </div>
                  <span className="text-sm font-bold text-yellow-600">{dashboardData.support.satisfaction}/5</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Bottom Section - Team & Automation Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.8 }}
        >
          <Card className="shadow-xl bg-gradient-to-br from-white to-indigo-50 border-0">
            <CardHeader className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-t-lg">
              <CardTitle className="flex items-center space-x-2">
                <Shield className="w-6 h-6" />
                <span>Team Performance</span>
                <Crown className="w-5 h-5 text-yellow-300 ml-auto" />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl">
                  <div className="text-2xl font-bold text-blue-700 mb-1">{dashboardData.team.total}</div>
                  <div className="text-xs text-blue-600 font-medium">Team Members</div>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-green-100 to-green-200 rounded-xl">
                  <div className="text-2xl font-bold text-green-700 mb-1">{dashboardData.team.departments}</div>
                  <div className="text-xs text-green-600 font-medium">Departments</div>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl">
                  <div className="text-2xl font-bold text-purple-700 mb-1">{dashboardData.team.productivity}%</div>
                  <div className="text-xs text-purple-600 font-medium">Productivity</div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm">
                  <div className="flex items-center space-x-3">
                    <Crown className="w-5 h-5 text-yellow-500" />
                    <span className="font-medium">Admin Users</span>
                  </div>
                  <span className="text-lg font-bold text-indigo-600">{dashboardData.team.admins}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm">
                  <div className="flex items-center space-x-3">
                    <Clock className="w-5 h-5 text-blue-500" />
                    <span className="font-medium">Avg Response Time</span>
                  </div>
                  <span className="text-lg font-bold text-blue-600">{dashboardData.team.avgResponseTime}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.9 }}
        >
          <Card className="shadow-xl bg-gradient-to-br from-white to-red-50 border-0">
            <CardHeader className="bg-gradient-to-r from-red-600 to-red-700 text-white rounded-t-lg">
              <CardTitle className="flex items-center space-x-2">
                <Zap className="w-6 h-6" />
                <span>Automation Center</span>
                <Sparkles className="w-5 h-5 text-yellow-300 ml-auto" />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-gradient-to-br from-orange-100 to-orange-200 rounded-xl">
                  <div className="text-2xl font-bold text-orange-700 mb-1">{dashboardData.automations.active}</div>
                  <div className="text-xs text-orange-600 font-medium">Active</div>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-green-100 to-green-200 rounded-xl">
                  <div className="text-2xl font-bold text-green-700 mb-1">{dashboardData.automations.runsToday}</div>
                  <div className="text-xs text-green-600 font-medium">Runs Today</div>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl">
                  <div className="text-2xl font-bold text-blue-700 mb-1">{dashboardData.automations.successRate}%</div>
                  <div className="text-xs text-blue-600 font-medium">Success Rate</div>
                </div>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-800 mb-3">Automation Categories</h4>
                {Object.entries(dashboardData.automations.categories).map(([category, count]) => (
                  <div key={category} className="flex items-center justify-between p-2 bg-white rounded-lg shadow-sm">
                    <span className="text-sm font-medium">{category}</span>
                    <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">
                      {count}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}