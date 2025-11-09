import React from 'react'
import { motion } from 'framer-motion'
import { MoreVertical, RefreshCw, X, Maximize2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface BaseWidgetProps {
  title: string
  children: React.ReactNode
  onRefresh?: () => void
  onRemove?: () => void
  onConfig?: () => void
  onExpand?: () => void
  isLoading?: boolean
  className?: string
  headerActions?: React.ReactNode
  colorScheme?: string
}

export function BaseWidget({
  title,
  children,
  onRefresh,
  onRemove,
  onConfig,
  onExpand,
  isLoading = false,
  className = '',
  headerActions,
  colorScheme = 'default'
}: BaseWidgetProps) {
  const [showActions, setShowActions] = React.useState(false)

  const getHeaderColor = () => {
    switch (colorScheme) {
      case 'blue': return 'bg-gradient-to-r from-blue-500 to-blue-600'
      case 'green': return 'bg-gradient-to-r from-green-500 to-green-600'
      case 'orange': return 'bg-gradient-to-r from-orange-500 to-orange-600'
      case 'purple': return 'bg-gradient-to-r from-purple-500 to-purple-600'
      case 'red': return 'bg-gradient-to-r from-red-500 to-red-600'
      default: return 'bg-white border-b border-gray-200'
    }
  }

  const isColoredHeader = colorScheme !== 'default'

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={`h-full ${className}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <Card className="h-full flex flex-col shadow-lg hover:shadow-xl transition-shadow border border-gray-200">
        <CardHeader className={`flex-shrink-0 p-4 ${getHeaderColor()} ${isColoredHeader ? 'text-white' : ''}`}>
          <div className="flex items-center justify-between">
            <CardTitle className={`text-base font-semibold ${isColoredHeader ? 'text-white' : 'text-gray-900'}`}>
              {title}
            </CardTitle>
            <div className="flex items-center gap-2">
              {headerActions}
              {showActions && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-1"
                >
                  {onRefresh && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onRefresh}
                      className={`h-7 w-7 p-0 ${isColoredHeader ? 'text-white hover:bg-white/20' : ''}`}
                      disabled={isLoading}
                    >
                      <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </Button>
                  )}
                  {onExpand && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onExpand}
                      className={`h-7 w-7 p-0 ${isColoredHeader ? 'text-white hover:bg-white/20' : ''}`}
                    >
                      <Maximize2 className="h-4 w-4" />
                    </Button>
                  )}
                  {onConfig && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onConfig}
                      className={`h-7 w-7 p-0 ${isColoredHeader ? 'text-white hover:bg-white/20' : ''}`}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  )}
                  {onRemove && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onRemove}
                      className={`h-7 w-7 p-0 ${isColoredHeader ? 'text-white hover:bg-white/20' : 'text-red-600 hover:bg-red-50'}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </motion.div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-4 overflow-auto">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            children
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
