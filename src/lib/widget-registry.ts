import { WidgetDefinition } from '@/types/dashboard'

export const WIDGET_REGISTRY: WidgetDefinition[] = [
  {
    type: 'kpi_card',
    module: 'leads',
    label: 'Leads KPI Card',
    description: 'Display key lead metrics like total leads, conversion rate, etc.',
    icon: 'Users',
    defaultSize: { x: 0, y: 0, w: 3, h: 2 },
    defaultConfig: {
      metric: 'total_leads',
      timeRange: '30d',
      colorScheme: 'blue'
    },
    configOptions: [
      {
        name: 'metric',
        label: 'Metric',
        type: 'select',
        options: [
          { value: 'total_leads', label: 'Total Leads' },
          { value: 'new_leads', label: 'New Leads' },
          { value: 'hot_leads', label: 'Hot Leads' },
          { value: 'conversion_rate', label: 'Conversion Rate' },
          { value: 'contacted_leads', label: 'Contacted Leads' }
        ],
        default: 'total_leads'
      },
      {
        name: 'timeRange',
        label: 'Time Range',
        type: 'select',
        options: [
          { value: '7d', label: 'Last 7 Days' },
          { value: '30d', label: 'Last 30 Days' },
          { value: '90d', label: 'Last 90 Days' },
          { value: 'all', label: 'All Time' }
        ],
        default: '30d'
      }
    ]
  },
  {
    type: 'funnel',
    module: 'leads',
    label: 'Lead Conversion Funnel',
    description: 'Visualize lead progression through stages',
    icon: 'TrendingUp',
    defaultSize: { x: 0, y: 0, w: 6, h: 4 },
    defaultConfig: {
      timeRange: '30d',
      showPercentages: true
    }
  },
  {
    type: 'bar_chart',
    module: 'leads',
    label: 'Lead Sources Chart',
    description: 'Bar chart showing leads by source',
    icon: 'BarChart3',
    defaultSize: { x: 0, y: 0, w: 6, h: 4 },
    defaultConfig: {
      metric: 'lead_sources',
      timeRange: '30d',
      chartType: 'bar'
    }
  },
  {
    type: 'kpi_card',
    module: 'members',
    label: 'Members KPI Card',
    description: 'Display member metrics',
    icon: 'UserPlus',
    defaultSize: { x: 0, y: 0, w: 3, h: 2 },
    defaultConfig: {
      metric: 'total_members',
      timeRange: '30d',
      colorScheme: 'green'
    },
    configOptions: [
      {
        name: 'metric',
        label: 'Metric',
        type: 'select',
        options: [
          { value: 'total_members', label: 'Total Members' },
          { value: 'active_members', label: 'Active Members' },
          { value: 'new_members', label: 'New Members' },
          { value: 'churn_rate', label: 'Churn Rate' }
        ],
        default: 'total_members'
      }
    ]
  },
  {
    type: 'pie_chart',
    module: 'members',
    label: 'Member Plans Distribution',
    description: 'Pie chart showing members by plan',
    icon: 'PieChart',
    defaultSize: { x: 0, y: 0, w: 4, h: 4 },
    defaultConfig: {
      metric: 'plans_distribution',
      showLegend: true
    }
  },
  {
    type: 'kpi_card',
    module: 'billing',
    label: 'Revenue KPI Card',
    description: 'Display revenue metrics',
    icon: 'DollarSign',
    defaultSize: { x: 0, y: 0, w: 3, h: 2 },
    defaultConfig: {
      metric: 'total_revenue',
      timeRange: '30d',
      colorScheme: 'green'
    },
    configOptions: [
      {
        name: 'metric',
        label: 'Metric',
        type: 'select',
        options: [
          { value: 'total_revenue', label: 'Total Revenue' },
          { value: 'monthly_revenue', label: 'Monthly Revenue' },
          { value: 'outstanding_amount', label: 'Outstanding Amount' },
          { value: 'paid_invoices', label: 'Paid Invoices' },
          { value: 'pending_invoices', label: 'Pending Invoices' }
        ],
        default: 'total_revenue'
      }
    ]
  },
  {
    type: 'area_chart',
    module: 'billing',
    label: 'Revenue Trend Chart',
    description: 'Area chart showing revenue over time',
    icon: 'TrendingUp',
    defaultSize: { x: 0, y: 0, w: 6, h: 4 },
    defaultConfig: {
      metric: 'revenue_trend',
      timeRange: '90d',
      showGrid: true
    }
  },
  {
    type: 'table',
    module: 'billing',
    label: 'Invoices Table',
    description: 'Table showing invoice details',
    icon: 'FileText',
    defaultSize: { x: 0, y: 0, w: 12, h: 5 },
    defaultConfig: {
      limit: 10,
      sortBy: 'date',
      sortOrder: 'desc',
      filters: { status: 'all' }
    }
  },
  {
    type: 'table',
    module: 'leads',
    label: 'Leads Table',
    description: 'Table showing leads details',
    icon: 'FileText',
    defaultSize: { x: 0, y: 0, w: 12, h: 5 },
    defaultConfig: {
      limit: 10,
      sortBy: 'created_at',
      sortOrder: 'desc'
    }
  },
  {
    type: 'table',
    module: 'support',
    label: 'Support Tickets Table',
    description: 'Table showing support ticket details',
    icon: 'FileText',
    defaultSize: { x: 0, y: 0, w: 12, h: 5 },
    defaultConfig: {
      limit: 10,
      sortBy: 'created_at',
      sortOrder: 'desc'
    }
  },
  {
    type: 'table',
    module: 'tasks',
    label: 'Tasks Table',
    description: 'Table showing task details',
    icon: 'FileText',
    defaultSize: { x: 0, y: 0, w: 12, h: 5 },
    defaultConfig: {
      limit: 10,
      sortBy: 'created_at',
      sortOrder: 'desc'
    }
  },
  {
    type: 'table',
    module: 'expenses',
    label: 'Expenses Table',
    description: 'Table showing expense details',
    icon: 'FileText',
    defaultSize: { x: 0, y: 0, w: 12, h: 5 },
    defaultConfig: {
      limit: 10,
      sortBy: 'expense_date',
      sortOrder: 'desc'
    }
  },
  {
    type: 'table',
    module: 'members',
    label: 'Members Table',
    description: 'Table showing enrolled members details',
    icon: 'FileText',
    defaultSize: { x: 0, y: 0, w: 12, h: 5 },
    defaultConfig: {
      limit: 10,
      sortBy: 'enrollment_date',
      sortOrder: 'desc'
    }
  },
  {
    type: 'kpi_card',
    module: 'attendance',
    label: 'Attendance KPI Card',
    description: 'Display attendance metrics',
    icon: 'Calendar',
    defaultSize: { x: 0, y: 0, w: 3, h: 2 },
    defaultConfig: {
      metric: 'present_today',
      colorScheme: 'blue'
    },
    configOptions: [
      {
        name: 'metric',
        label: 'Metric',
        type: 'select',
        options: [
          { value: 'present_today', label: 'Present Today' },
          { value: 'absent_today', label: 'Absent Today' },
          { value: 'total_hours', label: 'Total Hours' },
          { value: 'overtime_hours', label: 'Overtime Hours' }
        ],
        default: 'present_today'
      }
    ]
  },
  {
    type: 'bar_chart',
    module: 'attendance',
    label: 'Weekly Attendance Chart',
    description: 'Bar chart showing attendance by day',
    icon: 'BarChart3',
    defaultSize: { x: 0, y: 0, w: 6, h: 4 },
    defaultConfig: {
      timeRange: '7d',
      chartType: 'bar'
    }
  },
  {
    type: 'kpi_card',
    module: 'courses',
    label: 'Courses KPI Card',
    description: 'Display course metrics',
    icon: 'BookOpen',
    defaultSize: { x: 0, y: 0, w: 3, h: 2 },
    defaultConfig: {
      metric: 'total_students',
      colorScheme: 'purple'
    },
    configOptions: [
      {
        name: 'metric',
        label: 'Metric',
        type: 'select',
        options: [
          { value: 'total_students', label: 'Total Students' },
          { value: 'active_courses', label: 'Active Courses' },
          { value: 'completion_rate', label: 'Completion Rate' },
          { value: 'avg_rating', label: 'Average Rating' }
        ],
        default: 'total_students'
      }
    ]
  },
  {
    type: 'list',
    module: 'courses',
    label: 'Top Courses List',
    description: 'List of top performing courses',
    icon: 'List',
    defaultSize: { x: 0, y: 0, w: 4, h: 4 },
    defaultConfig: {
      limit: 5,
      sortBy: 'students',
      sortOrder: 'desc'
    }
  },
  {
    type: 'kpi_card',
    module: 'affiliates',
    label: 'Affiliates KPI Card',
    description: 'Display affiliate metrics',
    icon: 'Link',
    defaultSize: { x: 0, y: 0, w: 3, h: 2 },
    defaultConfig: {
      metric: 'total_affiliates',
      colorScheme: 'purple'
    },
    configOptions: [
      {
        name: 'metric',
        label: 'Metric',
        type: 'select',
        options: [
          { value: 'total_affiliates', label: 'Total Affiliates' },
          { value: 'active_affiliates', label: 'Active Affiliates' },
          { value: 'total_referrals', label: 'Total Referrals' },
          { value: 'total_earnings', label: 'Total Earnings' }
        ],
        default: 'total_affiliates'
      }
    ]
  },
  {
    type: 'kpi_card',
    module: 'support',
    label: 'Support KPI Card',
    description: 'Display support metrics',
    icon: 'HelpCircle',
    defaultSize: { x: 0, y: 0, w: 3, h: 2 },
    defaultConfig: {
      metric: 'open_tickets',
      colorScheme: 'orange'
    },
    configOptions: [
      {
        name: 'metric',
        label: 'Metric',
        type: 'select',
        options: [
          { value: 'open_tickets', label: 'Open Tickets' },
          { value: 'resolved_tickets', label: 'Resolved Tickets' },
          { value: 'avg_response_time', label: 'Avg Response Time' },
          { value: 'satisfaction_score', label: 'Satisfaction Score' }
        ],
        default: 'open_tickets'
      }
    ]
  },
  {
    type: 'pie_chart',
    module: 'support',
    label: 'Tickets by Status',
    description: 'Pie chart showing ticket distribution',
    icon: 'PieChart',
    defaultSize: { x: 0, y: 0, w: 4, h: 4 },
    defaultConfig: {
      metric: 'tickets_by_status',
      showLegend: true
    }
  },
  {
    type: 'kpi_card',
    module: 'tasks',
    label: 'Tasks KPI Card',
    description: 'Display task metrics',
    icon: 'CheckCircle',
    defaultSize: { x: 0, y: 0, w: 3, h: 2 },
    defaultConfig: {
      metric: 'pending_tasks',
      colorScheme: 'blue'
    },
    configOptions: [
      {
        name: 'metric',
        label: 'Metric',
        type: 'select',
        options: [
          { value: 'pending_tasks', label: 'Pending Tasks' },
          { value: 'completed_tasks', label: 'Completed Tasks' },
          { value: 'overdue_tasks', label: 'Overdue Tasks' },
          { value: 'tasks_due_today', label: 'Due Today' }
        ],
        default: 'pending_tasks'
      }
    ]
  },
  {
    type: 'activity_feed',
    module: 'leads',
    label: 'Recent Activity Feed',
    description: 'Live feed of recent activities',
    icon: 'Activity',
    defaultSize: { x: 0, y: 0, w: 4, h: 6 },
    defaultConfig: {
      limit: 10,
      modules: ['leads', 'members', 'support']
    }
  },
  {
    type: 'kpi_card',
    module: 'expenses',
    label: 'Expenses KPI Card',
    description: 'Display expense metrics',
    icon: 'Receipt',
    defaultSize: { x: 0, y: 0, w: 3, h: 2 },
    defaultConfig: {
      metric: 'total_expenses',
      timeRange: '30d',
      colorScheme: 'red'
    },
    configOptions: [
      {
        name: 'metric',
        label: 'Metric',
        type: 'select',
        options: [
          { value: 'total_expenses', label: 'Total Expenses' },
          { value: 'pending_expenses', label: 'Pending Expenses' },
          { value: 'approved_expenses', label: 'Approved Expenses' },
          { value: 'rejected_expenses', label: 'Rejected Expenses' }
        ],
        default: 'total_expenses'
      }
    ]
  },
  {
    type: 'kpi_card',
    module: 'automations',
    label: 'Automations KPI Card',
    description: 'Display automation metrics',
    icon: 'Zap',
    defaultSize: { x: 0, y: 0, w: 3, h: 2 },
    defaultConfig: {
      metric: 'active_automations',
      colorScheme: 'orange'
    },
    configOptions: [
      {
        name: 'metric',
        label: 'Metric',
        type: 'select',
        options: [
          { value: 'active_automations', label: 'Active Automations' },
          { value: 'total_runs', label: 'Total Runs' },
          { value: 'success_rate', label: 'Success Rate' },
          { value: 'runs_today', label: 'Runs Today' }
        ],
        default: 'active_automations'
      }
    ]
  },
  // Contacts Module Widgets
  {
    type: 'kpi_card',
    module: 'contacts',
    label: 'Contacts KPI Card',
    description: 'Display contact metrics',
    icon: 'Users',
    defaultSize: { x: 0, y: 0, w: 3, h: 2 },
    defaultConfig: {
      metric: 'total_contacts',
      timeRange: '30d',
      colorScheme: 'blue'
    },
    configOptions: [
      {
        name: 'metric',
        label: 'Metric',
        type: 'select',
        options: [
          { value: 'total_contacts', label: 'Total Contacts' },
          { value: 'new_contacts', label: 'New Contacts' },
          { value: 'active_contacts', label: 'Active Contacts' },
          { value: 'contacts_with_notes', label: 'Contacts with Notes' }
        ],
        default: 'total_contacts'
      }
    ]
  },
  {
    type: 'table',
    module: 'contacts',
    label: 'Contacts Table',
    description: 'Table showing contact details',
    icon: 'FileText',
    defaultSize: { x: 0, y: 0, w: 12, h: 5 },
    defaultConfig: {
      limit: 10,
      sortBy: 'created_at',
      sortOrder: 'desc'
    }
  },
  {
    type: 'line_chart',
    module: 'contacts',
    label: 'Contact Growth Chart',
    description: 'Line chart showing contact growth over time',
    icon: 'TrendingUp',
    defaultSize: { x: 0, y: 0, w: 6, h: 4 },
    defaultConfig: {
      timeRange: '90d',
      chartType: 'line'
    }
  },
  // Appointments Module Widgets
  {
    type: 'kpi_card',
    module: 'appointments',
    label: 'Appointments KPI Card',
    description: 'Display appointment metrics',
    icon: 'Calendar',
    defaultSize: { x: 0, y: 0, w: 3, h: 2 },
    defaultConfig: {
      metric: 'today_appointments',
      colorScheme: 'green'
    },
    configOptions: [
      {
        name: 'metric',
        label: 'Metric',
        type: 'select',
        options: [
          { value: 'today_appointments', label: 'Today\'s Appointments' },
          { value: 'upcoming_appointments', label: 'Upcoming Appointments' },
          { value: 'completed_appointments', label: 'Completed' },
          { value: 'cancelled_appointments', label: 'Cancelled' }
        ],
        default: 'today_appointments'
      }
    ]
  },
  {
    type: 'table',
    module: 'appointments',
    label: 'Appointments Table',
    description: 'Table showing appointment details',
    icon: 'FileText',
    defaultSize: { x: 0, y: 0, w: 12, h: 5 },
    defaultConfig: {
      limit: 10,
      sortBy: 'appointment_date',
      sortOrder: 'asc'
    }
  },
  {
    type: 'bar_chart',
    module: 'appointments',
    label: 'Appointments by Day',
    description: 'Bar chart showing appointments by day of week',
    icon: 'BarChart3',
    defaultSize: { x: 0, y: 0, w: 6, h: 4 },
    defaultConfig: {
      timeRange: '30d',
      chartType: 'bar'
    }
  },
  {
    type: 'calendar',
    module: 'appointments',
    label: 'Appointments Calendar',
    description: 'Calendar view of appointments',
    icon: 'Calendar',
    defaultSize: { x: 0, y: 0, w: 8, h: 6 },
    defaultConfig: {
      view: 'month',
      showWeekends: true
    }
  },
  // Products Module Widgets
  {
    type: 'kpi_card',
    module: 'products',
    label: 'Products KPI Card',
    description: 'Display product metrics',
    icon: 'Package',
    defaultSize: { x: 0, y: 0, w: 3, h: 2 },
    defaultConfig: {
      metric: 'total_products',
      colorScheme: 'purple'
    },
    configOptions: [
      {
        name: 'metric',
        label: 'Metric',
        type: 'select',
        options: [
          { value: 'total_products', label: 'Total Products' },
          { value: 'active_products', label: 'Active Products' },
          { value: 'avg_price', label: 'Average Price' },
          { value: 'total_categories', label: 'Total Categories' }
        ],
        default: 'total_products'
      }
    ]
  },
  {
    type: 'table',
    module: 'products',
    label: 'Products Table',
    description: 'Table showing product details',
    icon: 'FileText',
    defaultSize: { x: 0, y: 0, w: 12, h: 5 },
    defaultConfig: {
      limit: 10,
      sortBy: 'name',
      sortOrder: 'asc'
    }
  },
  {
    type: 'pie_chart',
    module: 'products',
    label: 'Products by Category',
    description: 'Pie chart showing product distribution by category',
    icon: 'PieChart',
    defaultSize: { x: 0, y: 0, w: 4, h: 4 },
    defaultConfig: {
      metric: 'products_by_category',
      showLegend: true
    }
  },
  {
    type: 'bar_chart',
    module: 'products',
    label: 'Product Price Range',
    description: 'Bar chart showing products by price range',
    icon: 'BarChart3',
    defaultSize: { x: 0, y: 0, w: 6, h: 4 },
    defaultConfig: {
      chartType: 'bar'
    }
  },
  // Team Module Widgets
  {
    type: 'kpi_card',
    module: 'team',
    label: 'Team KPI Card',
    description: 'Display team metrics',
    icon: 'Users',
    defaultSize: { x: 0, y: 0, w: 3, h: 2 },
    defaultConfig: {
      metric: 'total_team_members',
      colorScheme: 'blue'
    },
    configOptions: [
      {
        name: 'metric',
        label: 'Metric',
        type: 'select',
        options: [
          { value: 'total_team_members', label: 'Total Team Members' },
          { value: 'active_members', label: 'Active Members' },
          { value: 'on_leave', label: 'On Leave' },
          { value: 'new_joiners', label: 'New Joiners' }
        ],
        default: 'total_team_members'
      }
    ]
  },
  {
    type: 'table',
    module: 'team',
    label: 'Team Members Table',
    description: 'Table showing team member details',
    icon: 'FileText',
    defaultSize: { x: 0, y: 0, w: 12, h: 5 },
    defaultConfig: {
      limit: 10,
      sortBy: 'name',
      sortOrder: 'asc'
    }
  },
  {
    type: 'pie_chart',
    module: 'team',
    label: 'Team by Role',
    description: 'Pie chart showing team distribution by role',
    icon: 'PieChart',
    defaultSize: { x: 0, y: 0, w: 4, h: 4 },
    defaultConfig: {
      metric: 'team_by_role',
      showLegend: true
    }
  },
  // Leave Module Widgets
  {
    type: 'kpi_card',
    module: 'leave',
    label: 'Leave KPI Card',
    description: 'Display leave metrics',
    icon: 'Calendar',
    defaultSize: { x: 0, y: 0, w: 3, h: 2 },
    defaultConfig: {
      metric: 'pending_requests',
      colorScheme: 'orange'
    },
    configOptions: [
      {
        name: 'metric',
        label: 'Metric',
        type: 'select',
        options: [
          { value: 'pending_requests', label: 'Pending Requests' },
          { value: 'approved_requests', label: 'Approved Requests' },
          { value: 'on_leave_today', label: 'On Leave Today' },
          { value: 'total_leave_days', label: 'Total Leave Days' }
        ],
        default: 'pending_requests'
      }
    ]
  },
  {
    type: 'table',
    module: 'leave',
    label: 'Leave Requests Table',
    description: 'Table showing leave request details',
    icon: 'FileText',
    defaultSize: { x: 0, y: 0, w: 12, h: 5 },
    defaultConfig: {
      limit: 10,
      sortBy: 'start_date',
      sortOrder: 'desc'
    }
  },
  {
    type: 'bar_chart',
    module: 'leave',
    label: 'Leave by Category',
    description: 'Bar chart showing leave distribution by category',
    icon: 'BarChart3',
    defaultSize: { x: 0, y: 0, w: 6, h: 4 },
    defaultConfig: {
      timeRange: '90d',
      chartType: 'bar'
    }
  },
  // Expenses Module - Additional Widgets
  {
    type: 'pie_chart',
    module: 'expenses',
    label: 'Expenses by Category',
    description: 'Pie chart showing expense distribution by category',
    icon: 'PieChart',
    defaultSize: { x: 0, y: 0, w: 4, h: 4 },
    defaultConfig: {
      metric: 'expenses_by_category',
      timeRange: '30d',
      showLegend: true
    }
  },
  {
    type: 'line_chart',
    module: 'expenses',
    label: 'Expense Trend',
    description: 'Line chart showing expense trends over time',
    icon: 'TrendingUp',
    defaultSize: { x: 0, y: 0, w: 6, h: 4 },
    defaultConfig: {
      timeRange: '90d',
      chartType: 'line'
    }
  },
  {
    type: 'bar_chart',
    module: 'expenses',
    label: 'Expenses by Employee',
    description: 'Bar chart showing expenses by employee',
    icon: 'BarChart3',
    defaultSize: { x: 0, y: 0, w: 6, h: 4 },
    defaultConfig: {
      timeRange: '30d',
      chartType: 'bar',
      limit: 10
    }
  },
  // Billing Module - Additional Widgets
  {
    type: 'donut_chart',
    module: 'billing',
    label: 'Invoice Status Distribution',
    description: 'Donut chart showing invoice status breakdown',
    icon: 'DollarSign',
    defaultSize: { x: 0, y: 0, w: 4, h: 4 },
    defaultConfig: {
      metric: 'invoice_status',
      showLegend: true
    }
  },
  {
    type: 'line_chart',
    module: 'billing',
    label: 'Payment Collection Trend',
    description: 'Line chart showing payment collections over time',
    icon: 'TrendingUp',
    defaultSize: { x: 0, y: 0, w: 6, h: 4 },
    defaultConfig: {
      timeRange: '90d',
      chartType: 'line'
    }
  },
  {
    type: 'table',
    module: 'billing',
    label: 'Outstanding Invoices',
    description: 'Table showing unpaid/overdue invoices',
    icon: 'FileText',
    defaultSize: { x: 0, y: 0, w: 12, h: 5 },
    defaultConfig: {
      limit: 10,
      sortBy: 'due_date',
      sortOrder: 'asc',
      filters: { status: 'outstanding' }
    }
  },
  {
    type: 'progress_bar',
    module: 'billing',
    label: 'Revenue Target Progress',
    description: 'Progress bar showing revenue vs target',
    icon: 'Target',
    defaultSize: { x: 0, y: 0, w: 6, h: 2 },
    defaultConfig: {
      metric: 'revenue_target',
      timeRange: '30d'
    }
  },
  // Leads Module - Additional Widgets
  {
    type: 'donut_chart',
    module: 'leads',
    label: 'Lead Stage Distribution',
    description: 'Donut chart showing leads by stage',
    icon: 'PieChart',
    defaultSize: { x: 0, y: 0, w: 4, h: 4 },
    defaultConfig: {
      metric: 'leads_by_stage',
      showLegend: true
    }
  },
  {
    type: 'line_chart',
    module: 'leads',
    label: 'Lead Generation Trend',
    description: 'Line chart showing new leads over time',
    icon: 'TrendingUp',
    defaultSize: { x: 0, y: 0, w: 6, h: 4 },
    defaultConfig: {
      timeRange: '90d',
      chartType: 'line'
    }
  },
  {
    type: 'progress_bar',
    module: 'leads',
    label: 'Lead Conversion Progress',
    description: 'Progress bar showing conversion rate vs target',
    icon: 'Target',
    defaultSize: { x: 0, y: 0, w: 6, h: 2 },
    defaultConfig: {
      metric: 'conversion_target',
      timeRange: '30d'
    }
  },
  // Tasks Module - Additional Widgets
  {
    type: 'pie_chart',
    module: 'tasks',
    label: 'Tasks by Status',
    description: 'Pie chart showing task distribution by status',
    icon: 'PieChart',
    defaultSize: { x: 0, y: 0, w: 4, h: 4 },
    defaultConfig: {
      metric: 'tasks_by_status',
      showLegend: true
    }
  },
  {
    type: 'bar_chart',
    module: 'tasks',
    label: 'Tasks by Priority',
    description: 'Bar chart showing tasks by priority level',
    icon: 'BarChart3',
    defaultSize: { x: 0, y: 0, w: 6, h: 4 },
    defaultConfig: {
      chartType: 'bar'
    }
  },
  {
    type: 'progress_bar',
    module: 'tasks',
    label: 'Task Completion Progress',
    description: 'Progress bar showing completed vs total tasks',
    icon: 'Target',
    defaultSize: { x: 0, y: 0, w: 6, h: 2 },
    defaultConfig: {
      metric: 'completion_rate',
      timeRange: '30d'
    }
  },
  {
    type: 'list',
    module: 'tasks',
    label: 'Upcoming Tasks',
    description: 'List of upcoming tasks ordered by due date',
    icon: 'List',
    defaultSize: { x: 0, y: 0, w: 4, h: 5 },
    defaultConfig: {
      limit: 10,
      sortBy: 'due_date',
      sortOrder: 'asc'
    }
  },
  // Attendance Module - Additional Widgets
  {
    type: 'pie_chart',
    module: 'attendance',
    label: 'Attendance Status Today',
    description: 'Pie chart showing today\'s attendance breakdown',
    icon: 'PieChart',
    defaultSize: { x: 0, y: 0, w: 4, h: 4 },
    defaultConfig: {
      metric: 'attendance_today',
      showLegend: true
    }
  },
  {
    type: 'line_chart',
    module: 'attendance',
    label: 'Attendance Trend',
    description: 'Line chart showing attendance trends over time',
    icon: 'TrendingUp',
    defaultSize: { x: 0, y: 0, w: 6, h: 4 },
    defaultConfig: {
      timeRange: '30d',
      chartType: 'line'
    }
  },
  {
    type: 'table',
    module: 'attendance',
    label: 'Attendance Records',
    description: 'Table showing attendance records',
    icon: 'FileText',
    defaultSize: { x: 0, y: 0, w: 12, h: 5 },
    defaultConfig: {
      limit: 10,
      sortBy: 'date',
      sortOrder: 'desc'
    }
  },
  // Payroll Module - KPI Widgets
  {
    type: 'kpi_card',
    module: 'payroll',
    label: 'Earned Salary',
    description: 'Total earned salary for the selected period',
    icon: 'DollarSign',
    defaultSize: { x: 0, y: 0, w: 3, h: 2 },
    defaultConfig: {
      metric: 'earned_salary',
      colorScheme: 'green',
      showTrend: true
    },
    availableMetrics: [
      { value: 'earned_salary', label: 'Earned Salary' },
      { value: 'total_salary_budget', label: 'Total Salary Budget' },
      { value: 'salary_variance', label: 'Salary Variance' }
    ],
    configSchema: {
      metric: {
        type: 'select',
        label: 'Metric',
        options: [
          { value: 'earned_salary', label: 'Earned Salary' },
          { value: 'total_salary_budget', label: 'Total Salary Budget' },
          { value: 'salary_variance', label: 'Salary Variance' }
        ],
        default: 'earned_salary'
      },
      colorScheme: {
        type: 'select',
        label: 'Color Scheme',
        options: [
          { value: 'blue', label: 'Blue' },
          { value: 'green', label: 'Green' },
          { value: 'orange', label: 'Orange' },
          { value: 'purple', label: 'Purple' }
        ],
        default: 'green'
      }
    }
  },
  {
    type: 'kpi_card',
    module: 'payroll',
    label: 'Total Attendance Days',
    description: 'Total attendance days across all employees',
    icon: 'Calendar',
    defaultSize: { x: 0, y: 0, w: 3, h: 2 },
    defaultConfig: {
      metric: 'total_attendance_days',
      colorScheme: 'blue',
      showTrend: true
    }
  },
  {
    type: 'kpi_card',
    module: 'payroll',
    label: 'Avg Hours per Employee',
    description: 'Average working hours per employee',
    icon: 'Clock',
    defaultSize: { x: 0, y: 0, w: 3, h: 2 },
    defaultConfig: {
      metric: 'avg_hours_employee',
      colorScheme: 'blue',
      showTrend: true
    }
  },
  {
    type: 'kpi_card',
    module: 'payroll',
    label: 'Overtime Days',
    description: 'Total overtime days across all employees',
    icon: 'TrendingUp',
    defaultSize: { x: 0, y: 0, w: 3, h: 2 },
    defaultConfig: {
      metric: 'total_overtime',
      colorScheme: 'orange',
      showTrend: true
    }
  },
  // Payroll Module - Chart Widgets
  {
    type: 'bar_chart',
    module: 'payroll',
    label: 'Attendance Statistics',
    description: 'Bar chart showing present vs absent by week',
    icon: 'BarChart3',
    defaultSize: { x: 0, y: 0, w: 6, h: 4 },
    defaultConfig: {
      metric: 'attendance_stats',
      chartType: 'bar',
      timeRange: '30d'
    }
  },
  {
    type: 'line_chart',
    module: 'payroll',
    label: 'Salary Overview',
    description: 'Area chart showing earned vs budget salary',
    icon: 'TrendingUp',
    defaultSize: { x: 0, y: 0, w: 6, h: 4 },
    defaultConfig: {
      metric: 'salary_overview',
      chartType: 'area',
      timeRange: '30d'
    }
  },
  {
    type: 'bar_chart',
    module: 'payroll',
    label: 'Salary by Employee',
    description: 'Bar chart comparing earned vs budget salary by employee',
    icon: 'BarChart3',
    defaultSize: { x: 0, y: 0, w: 8, h: 4 },
    defaultConfig: {
      metric: 'salary_by_employee',
      chartType: 'bar',
      limit: 10
    }
  },
  {
    type: 'donut_chart',
    module: 'payroll',
    label: 'Attendance Breakdown',
    description: 'Donut chart showing full days, half days, overtime, and absent',
    icon: 'PieChart',
    defaultSize: { x: 0, y: 0, w: 4, h: 4 },
    defaultConfig: {
      metric: 'attendance_breakdown',
      showLegend: true
    }
  },
  // Payroll Module - Table Widget
  {
    type: 'table',
    module: 'payroll',
    label: 'Employee Payroll',
    description: 'Detailed payroll table with attendance and salary data',
    icon: 'FileText',
    defaultSize: { x: 0, y: 0, w: 12, h: 5 },
    defaultConfig: {
      limit: 20,
      sortBy: 'earned_salary',
      sortOrder: 'desc',
      columns: ['name', 'role', 'full_days', 'half_days', 'absent', 'overtime', 'total_hours', 'salary', 'earned_salary']
    }
  },
  {
    type: 'progress_bar',
    module: 'payroll',
    label: 'Salary Utilization',
    description: 'Progress bar showing earned vs budget salary',
    icon: 'Target',
    defaultSize: { x: 0, y: 0, w: 6, h: 2 },
    defaultConfig: {
      metric: 'salary_utilization',
      target: 100
    }
  },
  // Support Module - Additional Widgets
  {
    type: 'bar_chart',
    module: 'support',
    label: 'Tickets by Priority',
    description: 'Bar chart showing tickets by priority',
    icon: 'BarChart3',
    defaultSize: { x: 0, y: 0, w: 6, h: 4 },
    defaultConfig: {
      chartType: 'bar'
    }
  },
  {
    type: 'line_chart',
    module: 'support',
    label: 'Ticket Resolution Trend',
    description: 'Line chart showing ticket resolution over time',
    icon: 'TrendingUp',
    defaultSize: { x: 0, y: 0, w: 6, h: 4 },
    defaultConfig: {
      timeRange: '30d',
      chartType: 'line'
    }
  },
  {
    type: 'gauge',
    module: 'support',
    label: 'Customer Satisfaction Score',
    description: 'Gauge showing customer satisfaction rating',
    icon: 'Smile',
    defaultSize: { x: 0, y: 0, w: 3, h: 3 },
    defaultConfig: {
      metric: 'satisfaction_score',
      max: 100
    }
  },
  {
    type: 'list',
    module: 'support',
    label: 'Recent Tickets',
    description: 'List of recently created support tickets',
    icon: 'List',
    defaultSize: { x: 0, y: 0, w: 4, h: 5 },
    defaultConfig: {
      limit: 10,
      sortBy: 'created_at',
      sortOrder: 'desc'
    }
  }
]

export function getWidgetDefinition(type: string, module: string): WidgetDefinition | undefined {
  return WIDGET_REGISTRY.find(w => w.type === type && w.module === module)
}

export function getWidgetsByModule(module: string): WidgetDefinition[] {
  return WIDGET_REGISTRY.filter(w => w.module === module)
}

export function getAllModules(): string[] {
  const modules = new Set(WIDGET_REGISTRY.map(w => w.module))
  return Array.from(modules)
}
