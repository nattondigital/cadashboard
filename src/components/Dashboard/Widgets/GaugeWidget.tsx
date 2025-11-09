import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Smile, Meh, Frown } from 'lucide-react'

interface GaugeWidgetProps {
  title: string
  config: {
    metric: string
    max?: number
  }
}

export function GaugeWidget({ title, config }: GaugeWidgetProps) {
  const [value, setValue] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchGaugeData()
  }, [config])

  const fetchGaugeData = async () => {
    setLoading(true)

    await new Promise(resolve => setTimeout(resolve, 500))

    const mockValue = Math.floor(Math.random() * (config.max || 100))
    setValue(mockValue)
    setLoading(false)
  }

  const max = config.max || 100
  const percentage = (value / max) * 100
  const angle = (percentage / 100) * 180

  const getColor = () => {
    if (percentage >= 80) return { primary: '#10b981', secondary: '#d1fae5', icon: Smile }
    if (percentage >= 50) return { primary: '#f59e0b', secondary: '#fef3c7', icon: Meh }
    return { primary: '#ef4444', secondary: '#fee2e2', icon: Frown }
  }

  const color = getColor()
  const Icon = color.icon

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="w-full aspect-square bg-gray-200 rounded-full"></div>
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
      <CardContent className="flex flex-col items-center justify-center">
        <div className="relative w-48 h-24 mb-4">
          <svg viewBox="0 0 200 100" className="w-full h-full">
            <path
              d="M 20 100 A 80 80 0 0 1 180 100"
              fill="none"
              stroke={color.secondary}
              strokeWidth="20"
              strokeLinecap="round"
            />

            <motion.path
              d="M 20 100 A 80 80 0 0 1 180 100"
              fill="none"
              stroke={color.primary}
              strokeWidth="20"
              strokeLinecap="round"
              strokeDasharray="251.2"
              initial={{ strokeDashoffset: 251.2 }}
              animate={{ strokeDashoffset: 251.2 - (251.2 * percentage) / 100 }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />

            <motion.line
              x1="100"
              y1="100"
              x2="100"
              y2="20"
              stroke={color.primary}
              strokeWidth="3"
              strokeLinecap="round"
              initial={{ transform: 'rotate(-90deg)' }}
              animate={{ transform: `rotate(${angle - 90}deg)` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              style={{ transformOrigin: '100px 100px' }}
            />

            <circle cx="100" cy="100" r="8" fill={color.primary} />
          </svg>
        </div>

        <div className="text-center space-y-2">
          <div className="flex items-center justify-center space-x-2">
            <Icon className="w-8 h-8" style={{ color: color.primary }} />
            <div className="text-4xl font-bold" style={{ color: color.primary }}>
              {value}
            </div>
          </div>
          <div className="text-sm text-gray-500">
            out of {max} ({percentage.toFixed(1)}%)
          </div>
        </div>

        <div className="mt-4 w-full flex justify-between text-xs text-gray-500">
          <span>0</span>
          <span>{max / 2}</span>
          <span>{max}</span>
        </div>
      </CardContent>
    </Card>
  )
}
