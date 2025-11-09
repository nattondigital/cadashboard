import React, { useState, useEffect } from 'react'
import { BaseWidget } from '../BaseWidget'
import { Widget } from '@/types/dashboard'
import { motion } from 'framer-motion'
import {
  Users, UserPlus, BookOpen, Zap, CreditCard, HelpCircle,
  DollarSign, Calendar, CheckCircle
} from 'lucide-react'

interface ActivityFeedWidgetProps {
  widget: Widget
  onRefresh?: () => void
  onRemove?: () => void
  onConfig?: () => void
}

const mockActivities = [
  {
    type: 'lead',
    message: 'New hot lead from Facebook Ad: Priya Sharma',
    time: '2 mins ago',
    icon: Users,
    color: 'bg-blue-100 text-blue-600'
  },
  {
    type: 'enrollment',
    message: 'Arjun Kumar enrolled in Pro plan',
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
  },
  {
    type: 'task',
    message: 'Task completed: Follow up with hot leads',
    time: '5 hours ago',
    icon: CheckCircle,
    color: 'bg-teal-100 text-teal-600'
  },
  {
    type: 'appointment',
    message: 'New appointment scheduled for tomorrow',
    time: '6 hours ago',
    icon: Calendar,
    color: 'bg-blue-100 text-blue-600'
  }
]

export function ActivityFeedWidget({ widget, onRemove, onConfig }: ActivityFeedWidgetProps) {
  const [loading, setLoading] = useState(false)
  const [activities, setActivities] = useState(mockActivities)

  useEffect(() => {
    const limit = widget.config.limit || 10
    setActivities(mockActivities.slice(0, limit))
  }, [widget.config])

  return (
    <BaseWidget
      title={widget.title}
      onRemove={onRemove}
      onConfig={onConfig}
      isLoading={loading}
      colorScheme={widget.config.colorScheme}
    >
      <div className="space-y-3 overflow-y-auto h-full">
        {activities.map((activity, index) => {
          const Icon = activity.icon
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-all duration-300 border border-gray-100"
            >
              <div className={`p-2 rounded-lg ${activity.color} shadow-sm flex-shrink-0`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 leading-relaxed">
                  {activity.message}
                </p>
                <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
              </div>
            </motion.div>
          )
        })}
      </div>
    </BaseWidget>
  )
}
