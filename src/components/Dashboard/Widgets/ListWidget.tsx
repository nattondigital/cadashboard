import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ChevronRight, TrendingUp, User, Calendar, DollarSign } from 'lucide-react'

interface ListWidgetProps {
  title: string
  config: {
    limit?: number
    sortBy?: string
    sortOrder?: string
    metric?: string
  }
}

interface ListItem {
  id: string
  name: string
  value: number | string
  secondaryValue?: string
  status?: string
  trend?: number
  icon?: string
}

export function ListWidget({ title, config }: ListWidgetProps) {
  const [items, setItems] = useState<ListItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchListData()
  }, [config])

  const fetchListData = async () => {
    setLoading(true)

    await new Promise(resolve => setTimeout(resolve, 500))

    const mockItems: ListItem[] = Array.from({ length: config.limit || 5 }, (_, i) => ({
      id: `item-${i + 1}`,
      name: `Item ${i + 1}`,
      value: Math.floor(Math.random() * 1000) + 100,
      secondaryValue: `${Math.floor(Math.random() * 30)} days ago`,
      status: ['Active', 'Pending', 'Completed', 'In Progress'][Math.floor(Math.random() * 4)],
      trend: (Math.random() - 0.5) * 50
    }))

    setItems(mockItems)
    setLoading(false)
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-800'
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'Completed':
        return 'bg-blue-100 text-blue-800'
      case 'In Progress':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {items.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors group"
            >
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <User className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <div className="font-medium text-gray-900 truncate">{item.name}</div>
                    {item.status && (
                      <Badge className={`text-xs ${getStatusColor(item.status)}`}>
                        {item.status}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center space-x-3 text-xs text-gray-500">
                    <span className="flex items-center">
                      <DollarSign className="w-3 h-3 mr-1" />
                      {typeof item.value === 'number' ? item.value.toLocaleString() : item.value}
                    </span>
                    {item.secondaryValue && (
                      <>
                        <span>•</span>
                        <span className="flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          {item.secondaryValue}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 flex-shrink-0">
                {item.trend !== undefined && (
                  <div className={`flex items-center space-x-1 text-xs font-medium ${item.trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    <TrendingUp className={`w-3 h-3 ${item.trend < 0 ? 'rotate-180' : ''}`} />
                    <span>{Math.abs(item.trend).toFixed(0)}%</span>
                  </div>
                )}
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
              </div>
            </motion.div>
          ))}
        </div>

        {items.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No items to display
          </div>
        )}
      </CardContent>
    </Card>
  )
}
