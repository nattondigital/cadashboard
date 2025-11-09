import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface HeatmapWidgetProps {
  title: string
  config: {
    timeRange?: string
  }
}

interface HeatmapCell {
  day: string
  hour: number
  value: number
}

export function HeatmapWidget({ title, config }: HeatmapWidgetProps) {
  const [data, setData] = useState<HeatmapCell[]>([])
  const [loading, setLoading] = useState(true)

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const hours = Array.from({ length: 24 }, (_, i) => i)

  useEffect(() => {
    fetchHeatmapData()
  }, [config])

  const fetchHeatmapData = async () => {
    setLoading(true)

    await new Promise(resolve => setTimeout(resolve, 500))

    const mockData: HeatmapCell[] = []
    days.forEach(day => {
      hours.forEach(hour => {
        if (hour >= 8 && hour <= 20) {
          mockData.push({
            day,
            hour,
            value: Math.floor(Math.random() * 100)
          })
        } else {
          mockData.push({
            day,
            hour,
            value: Math.floor(Math.random() * 20)
          })
        }
      })
    })

    setData(mockData)
    setLoading(false)
  }

  const getCellColor = (value: number) => {
    if (value === 0) return 'bg-gray-100'
    if (value < 20) return 'bg-blue-100'
    if (value < 40) return 'bg-blue-200'
    if (value < 60) return 'bg-blue-400'
    if (value < 80) return 'bg-blue-500'
    return 'bg-blue-600'
  }

  const getCellValue = (day: string, hour: number) => {
    const cell = data.find(c => c.day === day && c.hour === hour)
    return cell?.value || 0
  }

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-64 bg-gray-200 rounded"></div>
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
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            <div className="flex">
              <div className="flex flex-col justify-between py-8">
                {days.map(day => (
                  <div key={day} className="h-5 flex items-center text-xs font-medium text-gray-600 pr-2">
                    {day}
                  </div>
                ))}
              </div>

              <div className="flex-1">
                <div className="flex space-x-1 mb-2">
                  {hours.filter((_, i) => i % 2 === 0).map(hour => (
                    <div key={hour} className="w-5 text-xs text-gray-600 text-center">
                      {hour}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-24 gap-1">
                  {days.map(day =>
                    hours.map(hour => {
                      const value = getCellValue(day, hour)
                      return (
                        <div
                          key={`${day}-${hour}`}
                          className={`w-5 h-5 rounded ${getCellColor(value)} cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all`}
                          title={`${day} ${hour}:00 - Activity: ${value}`}
                        />
                      )
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-center space-x-2">
              <span className="text-xs text-gray-600">Less</span>
              <div className="flex space-x-1">
                {[0, 20, 40, 60, 80, 100].map((value, i) => (
                  <div
                    key={i}
                    className={`w-4 h-4 rounded ${getCellColor(value)}`}
                  />
                ))}
              </div>
              <span className="text-xs text-gray-600">More</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
