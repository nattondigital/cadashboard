import React, { useState, useEffect } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface DonutChartWidgetProps {
  title: string
  config: {
    metric: string
    showLegend?: boolean
    timeRange?: string
  }
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']

export function DonutChartWidget({ title, config }: DonutChartWidgetProps) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchChartData()
  }, [config])

  const fetchChartData = async () => {
    setLoading(true)

    await new Promise(resolve => setTimeout(resolve, 500))

    const mockData = [
      { name: 'Category A', value: Math.floor(Math.random() * 50) + 20 },
      { name: 'Category B', value: Math.floor(Math.random() * 40) + 15 },
      { name: 'Category C', value: Math.floor(Math.random() * 30) + 10 },
      { name: 'Category D', value: Math.floor(Math.random() * 25) + 5 },
      { name: 'Category E', value: Math.floor(Math.random() * 20) + 5 }
    ]

    setData(mockData)
    setLoading(false)
  }

  const total = data.reduce((sum, item) => sum + item.value, 0)

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const percentage = ((payload[0].value / total) * 100).toFixed(1)
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border">
          <p className="font-semibold text-gray-900">{payload[0].name}</p>
          <p className="text-sm text-gray-600">
            {payload[0].value.toLocaleString()} ({percentage}%)
          </p>
        </div>
      )
    }
    return null
  }

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
      <CardContent>
        <div className="w-full h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              {config.showLegend !== false && (
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  formatter={(value, entry: any) => {
                    const percentage = ((entry.payload.value / total) * 100).toFixed(1)
                    return `${value} (${percentage}%)`
                  }}
                />
              )}
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          {data.slice(0, 4).map((item, index) => {
            const percentage = ((item.value / total) * 100).toFixed(1)
            return (
              <div key={index} className="flex items-center space-x-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-gray-900 truncate">{item.name}</div>
                  <div className="text-xs text-gray-500">{percentage}%</div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
