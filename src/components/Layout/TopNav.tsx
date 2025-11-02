import React from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Search, Plus, UserPlus, BookOpen, Send, User, LogOut, Phone, Menu, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useAuth } from '@/contexts/AuthContext'

const quickActions = [
  { label: 'Add Lead', icon: Plus },
  { label: 'Enroll Member', icon: UserPlus },
  { label: 'Create Course', icon: BookOpen },
  { label: 'Send Broadcast', icon: Send },
]

interface TopNavProps {
  sidebarCollapsed: boolean
  onToggleSidebar: () => void
  mobileMenuOpen: boolean
  onToggleMobileMenu: () => void
}

export function TopNav({ sidebarCollapsed, onToggleSidebar, mobileMenuOpen, onToggleMobileMenu }: TopNavProps) {
  const navigate = useNavigate()
  const { userProfile, logout } = useAuth()

  const handleLogout = async () => {
    if (confirm('Are you sure you want to logout?')) {
      await logout()
    }
  }

  const handleMyProfile = () => {
    navigate('/settings?tab=profile')
  }

  const getInitials = (name: string) => {
    if (!name) return 'AD'
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-white px-6">
      {/* Menu Toggle & Search */}
      <div className="flex items-center space-x-4">
        {/* Desktop Menu Toggle Button - Hidden on Mobile */}
        <motion.button
          onClick={onToggleSidebar}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="hidden md:block p-2 rounded-lg text-gray-600 hover:bg-brand-primary/10 hover:text-brand-primary transition-colors"
        >
          {sidebarCollapsed ? (
            <Menu className="h-5 w-5" />
          ) : (
            <X className="h-5 w-5" />
          )}
        </motion.button>

        {/* Mobile Menu Toggle Button - Visible on Mobile Only */}
        <motion.button
          onClick={onToggleMobileMenu}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-brand-primary/10 hover:text-brand-primary transition-colors"
        >
          {mobileMenuOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </motion.button>
        <div className="relative w-full max-w-md hidden sm:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search leads, members, courses..."
            className="pl-10 border-gray-200 focus:border-brand-primary"
          />
        </div>
      </div>

      {/* Quick Actions & Profile */}
      <div className="flex items-center space-x-3">
        {/* Quick Actions - Hidden on Mobile */}
        <div className="hidden lg:flex items-center space-x-2">
          {quickActions.map((action, index) => {
            const Icon = action.icon
            return (
              <motion.div
                key={action.label}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-600 hover:text-brand-primary hover:bg-brand-primary/10"
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {action.label}
                </Button>
              </motion.div>
            )
          })}
        </div>

        {/* Profile Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-brand-primary text-white">
                  {userProfile ? getInitials(userProfile.full_name) : 'AD'}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{userProfile?.full_name || 'Admin User'}</p>
                {userProfile?.phone && (
                  <p className="text-xs text-gray-500 flex items-center">
                    <Phone className="w-3 h-3 mr-1" />
                    {userProfile.phone}
                  </p>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleMyProfile}>
              <User className="mr-2 h-4 w-4" />
              My Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-600" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}