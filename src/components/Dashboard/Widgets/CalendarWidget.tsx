import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns'

interface CalendarWidgetProps {
  title: string
  config: {
    view?: 'month' | 'week'
    showWeekends?: boolean
  }
}

interface CalendarEvent {
  id: string
  date: Date
  title: string
  type: 'appointment' | 'task' | 'meeting'
}

export function CalendarWidget({ title, config }: CalendarWidgetProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCalendarEvents()
  }, [currentDate])

  const fetchCalendarEvents = async () => {
    setLoading(true)

    await new Promise(resolve => setTimeout(resolve, 500))

    const mockEvents: CalendarEvent[] = Array.from({ length: 10 }, (_, i) => {
      const randomDay = Math.floor(Math.random() * 28) + 1
      const eventDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), randomDay)
      return {
        id: `event-${i}`,
        date: eventDate,
        title: `Event ${i + 1}`,
        type: ['appointment', 'task', 'meeting'][Math.floor(Math.random() * 3)] as any
      }
    })

    setEvents(mockEvents)
    setLoading(false)
  }

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const startDate = startOfWeek(monthStart)
  const endDate = endOfWeek(monthEnd)

  const days = eachDayOfInterval({ start: startDate, end: endDate })

  const getEventsForDay = (day: Date) => {
    return events.filter(event => isSameDay(event.date, day))
  }

  const getEventColor = (type: string) => {
    switch (type) {
      case 'appointment':
        return 'bg-blue-500'
      case 'task':
        return 'bg-green-500'
      case 'meeting':
        return 'bg-orange-500'
      default:
        return 'bg-gray-500'
    }
  }

  const previousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1))
  }

  const nextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1))
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
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={previousMonth}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="font-semibold text-sm min-w-32 text-center">
              {format(currentDate, 'MMMM yyyy')}
            </div>
            <Button variant="outline" size="sm" onClick={nextMonth}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-xs font-semibold text-gray-600 py-2">
              {day}
            </div>
          ))}

          {days.map((day, index) => {
            const dayEvents = getEventsForDay(day)
            const isCurrentMonth = isSameMonth(day, currentDate)
            const isToday = isSameDay(day, new Date())

            return (
              <div
                key={index}
                className={`
                  min-h-20 p-1 border rounded-lg cursor-pointer transition-colors
                  ${isCurrentMonth ? 'bg-white hover:bg-gray-50' : 'bg-gray-100'}
                  ${isToday ? 'border-blue-500 border-2' : 'border-gray-200'}
                `}
              >
                <div
                  className={`
                    text-xs font-semibold mb-1 text-center
                    ${isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}
                    ${isToday ? 'text-blue-600' : ''}
                  `}
                >
                  {format(day, 'd')}
                </div>
                <div className="space-y-1">
                  {dayEvents.slice(0, 2).map((event, i) => (
                    <div
                      key={event.id}
                      className={`${getEventColor(event.type)} text-white text-xs rounded px-1 py-0.5 truncate`}
                      title={event.title}
                    >
                      {event.title}
                    </div>
                  ))}
                  {dayEvents.length > 2 && (
                    <div className="text-xs text-gray-500 text-center">
                      +{dayEvents.length - 2} more
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-4 flex items-center justify-center space-x-4 text-xs">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span className="text-gray-600">Appointments</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span className="text-gray-600">Tasks</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-orange-500 rounded"></div>
            <span className="text-gray-600">Meetings</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
