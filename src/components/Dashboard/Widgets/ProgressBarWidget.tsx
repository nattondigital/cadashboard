import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Target } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ProgressBarWidgetProps {
  title: string
  config: {
    metric: string
    timeRange?: string
    target?: number
  }
}

export function ProgressBarWidget({ title, config }: ProgressBarWidgetProps) {
  const [data, setData] = useState({ current: 0, target: 100, percentage: 0, change: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProgressData()
  }, [config])

  const fetchProgressData = async () => {
    setLoading(true)

    await new Promise(resolve => setTimeout(resolve, 500))

    const mockData = {
      current: Math.floor(Math.random() * 100) + 50,
      target: config.target || 100,
      change: (Math.random() - 0.5) * 20
    }

    mockData.percentage = Math.min((mockData.current / mockData.target) * 100, 100)

    setData(mockData)
    setLoading(false)
  }

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-green-500'
    if (percentage >= 70) return 'bg-blue-500'
    if (percentage >= 50) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const getBackgroundColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-green-100'
    if (percentage >= 70) return 'bg-blue-100'
    if (percentage >= 50) return 'bg-yellow-100'
    return 'bg-red-100'
  }

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold flex items-center justify-between">
          <span>{title}</span>
          <Target className="w-5 h-5 text-gray-400" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-end justify-between">
            <div>
              <div className="text-3xl font-bold text-gray-900">
                {data.current.toLocaleString()}
              </div>
              <div className="text-sm text-gray-500">
                of {data.target.toLocaleString()} target
              </div>
            </div>
            <div className={`flex items-center space-x-1 text-sm font-medium ${data.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {data.change >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              <span>{Math.abs(data.change).toFixed(1)}%</span>
            </div>
          </div>

          <div>
            <div className={`w-full h-4 rounded-full overflow-hidden ${getBackgroundColor(data.percentage)}`}>
              <motion.div
                className={`h-full ${getProgressColor(data.percentage)}`}
                initial={{ width: 0 }}
                animate={{ width: `${data.percentage}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </div>
            <div className="mt-2 flex justify-between items-center text-sm">
              <span className="text-gray-600">Progress</span>
              <span className="font-semibold text-gray-900">{data.percentage.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
