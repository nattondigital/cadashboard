import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { UserPlus, Eye, CreditCard as Edit, Trash2, User, Mail, Phone, X, Save, Calendar, Building, FileText, MapPin, Users, RefreshCw, AlertCircle, GraduationCap, Briefcase, Tag, MoreVertical, StickyNote, Plus, ArrowLeft, ChevronRight, Clock, CheckSquare, Flag } from 'lucide-react'
import { PageHeader } from '@/components/Common/PageHeader'
import { KPICard } from '@/components/Common/KPICard'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { formatDate, formatTime, getPhoneValidationError, getEmailValidationError } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { ValidatedInput } from '@/components/ui/validated-input'
import { format } from 'date-fns'
import { useAuth } from '@/contexts/AuthContext'
import { PermissionGuard } from '@/components/Common/PermissionGuard'

interface Contact {
  id: string
  contact_id: string
  full_name: string
  email: string
  phone: string
  date_of_birth: string
  gender: string
  education_level: string
  profession: string
  experience: string
  business_name: string
  address: string
  city: string
  state: string
  pincode: string
  gst_number: string
  contact_type: string
  status: string
  notes: string
  last_contacted: string
  tags: any
  created_at: string
}

interface ContactNote {
  id: string
  contact_id: string
  note_text: string
  created_at: string
  updated_at: string
  created_by: string
}

interface Appointment {
  id: string
  appointment_id: string
  contact_id: string
  appointment_date: string
  appointment_time: string
  duration_minutes: number
  meeting_type: string
  location: string
  status: string
  notes: string
  created_at: string
}

interface Task {
  id: string
  task_id: string
  title: string
  description: string | null
  status: string
  priority: string
  assigned_to_name: string | null
  due_date: string | null
  category: string
  progress_percentage: number
  created_at: string
  updated_at: string
}

const contactTypeColors: Record<string, string> = {
  'Customer': 'bg-blue-100 text-blue-800',
  'Vendor': 'bg-purple-100 text-purple-800',
  'Partner': 'bg-green-100 text-green-800',
  'Lead': 'bg-yellow-100 text-yellow-800',
  'Other': 'bg-gray-100 text-gray-800'
}

const statusColors: Record<string, string> = {
  'Active': 'bg-green-100 text-green-800',
  'Inactive': 'bg-gray-100 text-gray-800'
}

const contactTypeIcons: Record<string, string> = {
  'Customer': '👤',
  'Vendor': '🏢',
  'Partner': '🤝',
  'Lead': '🎯',
  'Other': '📋'
}

type ViewType = 'list' | 'add' | 'edit' | 'view'
type TabType = 'personal' | 'business' | 'notes' | 'appointments' | 'tasks'

export function Contacts() {
  const navigate = useNavigate()
  const location = useLocation()
  const { canCreate, canUpdate, canDelete } = useAuth()
  const [view, setView] = useState<ViewType>('list')
  const [formTab, setFormTab] = useState<TabType>('personal')
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [contacts, setContacts] = useState<Contact[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [contactNotes, setContactNotes] = useState<ContactNote[]>([])
  const [newNoteText, setNewNoteText] = useState('')
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editingNoteText, setEditingNoteText] = useState('')
  const [contactAppointments, setContactAppointments] = useState<Appointment[]>([])
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(false)
  const [contactTasks, setContactTasks] = useState<Task[]>([])
  const [isLoadingTasks, setIsLoadingTasks] = useState(false)
  const [formData, setFormData] = useState({
    fullName: '',
    phoneNumber: '',
    emailAddress: '',
    dateOfBirth: '',
    gender: '',
    educationLevel: '',
    profession: '',
    experience: '',
    businessName: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    gstNumber: '',
    contactType: 'Customer',
    status: 'Active',
    notes: ''
  })

  const fetchContacts = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const { data, error: fetchError } = await supabase
        .from('contacts_master')
        .select('*')
        .order('created_at', { ascending: false })

      if (fetchError) {
        throw fetchError
      }

      setContacts(data || [])
    } catch (error) {
      console.error('Error fetching contacts:', error)
      setError(error instanceof Error ? error.message : 'Failed to fetch contacts data')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchContacts()
  }, [])

  useEffect(() => {
    if (location.state?.returnToContactId && location.state?.refreshAppointments) {
      const contactId = location.state.returnToContactId
      const contact = contacts.find(c => c.id === contactId)
      if (contact) {
        setSelectedContact(contact)
        setView('view')
        setFormTab('appointments')
        fetchContactAppointments(contactId)
        fetchContactTasks(contactId)
      }
      window.history.replaceState({}, document.title)
    } else if (location.state?.returnToContactId && location.state?.refreshTasks) {
      const contactId = location.state.returnToContactId
      const contact = contacts.find(c => c.id === contactId)
      if (contact) {
        setSelectedContact(contact)
        setView('view')
        setFormTab('tasks')
        fetchContactAppointments(contactId)
        fetchContactTasks(contactId)
      }
      window.history.replaceState({}, document.title)
    }
  }, [location.state, contacts])

  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = (contact.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (contact.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (contact.phone || '').includes(searchTerm) ||
                         (contact.contact_id || '').toLowerCase().includes(searchTerm.toLowerCase())

    const matchesType = !typeFilter || contact.contact_type === typeFilter
    const matchesStatus = !statusFilter || contact.status === statusFilter

    return matchesSearch && matchesType && matchesStatus
  })

  const totalContacts = contacts.length
  const activeContacts = contacts.filter(c => c.status === 'Active').length
  const customerContacts = contacts.filter(c => c.contact_type === 'Customer').length
  const vendorContacts = contacts.filter(c => c.contact_type === 'Vendor').length

  const handleCreateContact = async () => {
    const phoneError = getPhoneValidationError(formData.phoneNumber)
    const emailError = getEmailValidationError(formData.emailAddress, false)

    if (phoneError || emailError) {
      alert(phoneError || emailError || 'Please fix validation errors before submitting')
      return
    }

    try {
      const { data: existingContact, error: checkError } = await supabase
        .from('contacts_master')
        .select('contact_id, full_name')
        .eq('phone', formData.phoneNumber)
        .maybeSingle()

      if (checkError) {
        throw checkError
      }

      if (existingContact) {
        alert(`A contact with this phone number already exists: ${existingContact.full_name} (${existingContact.contact_id})`)
        return
      }

      const { error: insertError } = await supabase
        .from('contacts_master')
        .insert({
          full_name: formData.fullName,
          email: formData.emailAddress,
          phone: formData.phoneNumber,
          date_of_birth: formData.dateOfBirth || null,
          gender: formData.gender || null,
          education_level: formData.educationLevel || null,
          profession: formData.profession || null,
          experience: formData.experience || null,
          business_name: formData.businessName || null,
          address: formData.address || null,
          city: formData.city || null,
          state: formData.state || null,
          pincode: formData.pincode || null,
          gst_number: formData.gstNumber || null,
          contact_type: formData.contactType,
          status: formData.status,
          notes: formData.notes || null
        })

      if (insertError) {
        throw insertError
      }

      setView('list')
      resetForm()
      fetchContacts()
    } catch (error) {
      console.error('Error creating contact:', error)
      setError(error instanceof Error ? error.message : 'Failed to create contact')
    }
  }

  const handleEditContact = async () => {
    if (!selectedContact) return

    const phoneError = getPhoneValidationError(formData.phoneNumber)
    const emailError = getEmailValidationError(formData.emailAddress, false)

    if (phoneError || emailError) {
      alert(phoneError || emailError || 'Please fix validation errors before submitting')
      return
    }

    try {
      if (formData.phoneNumber !== selectedContact.phone) {
        const { data: existingContact, error: checkError } = await supabase
          .from('contacts_master')
          .select('contact_id, full_name')
          .eq('phone', formData.phoneNumber)
          .neq('id', selectedContact.id)
          .maybeSingle()

        if (checkError) {
          throw checkError
        }

        if (existingContact) {
          alert(`A contact with this phone number already exists: ${existingContact.full_name} (${existingContact.contact_id})`)
          return
        }
      }

      const { error: updateError } = await supabase
        .from('contacts_master')
        .update({
          full_name: formData.fullName,
          email: formData.emailAddress,
          phone: formData.phoneNumber,
          date_of_birth: formData.dateOfBirth || null,
          gender: formData.gender || null,
          education_level: formData.educationLevel || null,
          profession: formData.profession || null,
          experience: formData.experience || null,
          business_name: formData.businessName || null,
          address: formData.address || null,
          city: formData.city || null,
          state: formData.state || null,
          pincode: formData.pincode || null,
          gst_number: formData.gstNumber || null,
          contact_type: formData.contactType,
          status: formData.status,
          notes: formData.notes || null
        })
        .eq('id', selectedContact.id)

      if (updateError) {
        throw updateError
      }

      setView('list')
      resetForm()
      fetchContacts()
    } catch (error) {
      console.error('Error updating contact:', error)
      setError(error instanceof Error ? error.message : 'Failed to update contact')
    }
  }

  const handleDeleteContact = async (contactId: string) => {
    if (confirm('Are you sure you want to delete this contact?')) {
      try {
        const { error: deleteError } = await supabase
          .from('contacts_master')
          .delete()
          .eq('id', contactId)

        if (deleteError) {
          throw deleteError
        }

        fetchContacts()
      } catch (error) {
        console.error('Error deleting contact:', error)
        setError(error instanceof Error ? error.message : 'Failed to delete contact')
      }
    }
  }

  const handleEditClick = (contact: Contact) => {
    setSelectedContact(contact)
    setFormData({
      fullName: contact.full_name,
      phoneNumber: contact.phone,
      emailAddress: contact.email,
      dateOfBirth: contact.date_of_birth || '',
      gender: contact.gender || '',
      educationLevel: contact.education_level || '',
      profession: contact.profession || '',
      experience: contact.experience || '',
      businessName: contact.business_name || '',
      address: contact.address || '',
      city: contact.city || '',
      state: contact.state || '',
      pincode: contact.pincode || '',
      gstNumber: contact.gst_number || '',
      contactType: contact.contact_type || 'Customer',
      status: contact.status || 'Active',
      notes: contact.notes || ''
    })
    setFormTab('personal')
    setView('edit')
  }

  const handleViewContact = (contact: Contact) => {
    setSelectedContact(contact)
    setFormTab('personal')
    setView('view')
    fetchContactNotes(contact.id)
    fetchContactAppointments(contact.id)
    fetchContactTasks(contact.id)
  }

  const resetForm = () => {
    setFormData({
      fullName: '',
      phoneNumber: '',
      emailAddress: '',
      dateOfBirth: '',
      gender: '',
      educationLevel: '',
      profession: '',
      experience: '',
      businessName: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      gstNumber: '',
      contactType: 'Customer',
      status: 'Active',
      notes: ''
    })
    setSelectedContact(null)
    setFormTab('personal')
  }

  const fetchContactNotes = async (contactId: string) => {
    try {
      const { data, error } = await supabase
        .from('contact_notes')
        .select('*')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setContactNotes(data || [])
    } catch (error) {
      console.error('Error fetching notes:', error)
    }
  }

  const fetchContactAppointments = async (contactId: string) => {
    setIsLoadingAppointments(true)
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('contact_id', contactId)
        .order('appointment_date', { ascending: false })
        .order('appointment_time', { ascending: false })

      if (error) throw error
      setContactAppointments(data || [])
    } catch (error) {
      console.error('Error fetching appointments:', error)
    } finally {
      setIsLoadingAppointments(false)
    }
  }

  const fetchContactTasks = async (contactId: string) => {
    setIsLoadingTasks(true)
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setContactTasks(data || [])
    } catch (error) {
      console.error('Error fetching tasks:', error)
    } finally {
      setIsLoadingTasks(false)
    }
  }

  const handleAddNote = async () => {
    if (!newNoteText.trim() || !selectedContact) return

    try {
      const { error } = await supabase
        .from('contact_notes')
        .insert({
          contact_id: selectedContact.id,
          note_text: newNoteText,
          created_by: 'Admin'
        })

      if (error) throw error

      setNewNoteText('')
      fetchContactNotes(selectedContact.id)
    } catch (error) {
      console.error('Error adding note:', error)
    }
  }

  const handleEditNote = async (noteId: string) => {
    if (!editingNoteText.trim()) return

    try {
      const { error } = await supabase
        .from('contact_notes')
        .update({ note_text: editingNoteText })
        .eq('id', noteId)

      if (error) throw error

      setEditingNoteId(null)
      setEditingNoteText('')
      if (selectedContact) fetchContactNotes(selectedContact.id)
    } catch (error) {
      console.error('Error updating note:', error)
    }
  }

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return

    try {
      const { error } = await supabase
        .from('contact_notes')
        .delete()
        .eq('id', noteId)

      if (error) throw error

      if (selectedContact) fetchContactNotes(selectedContact.id)
    } catch (error) {
      console.error('Error deleting note:', error)
    }
  }

  const handleAddAppointment = () => {
    if (!selectedContact) return
    navigate('/appointments', {
      state: {
        action: 'add',
        prefilledContact: {
          id: selectedContact.id,
          contact_id: selectedContact.contact_id,
          full_name: selectedContact.full_name,
          phone: selectedContact.phone,
          email: selectedContact.email
        },
        returnTo: '/contacts',
        returnToContactId: selectedContact.id
      }
    })
  }

  const handleEditAppointment = (appointment: Appointment) => {
    navigate('/appointments', {
      state: {
        action: 'edit',
        appointmentId: appointment.id,
        returnTo: '/contacts',
        returnToContactId: selectedContact?.id
      }
    })
  }

  const handleDeleteAppointment = async (appointmentId: string) => {
    if (!confirm('Are you sure you want to delete this appointment?')) return

    try {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', appointmentId)

      if (error) throw error

      if (selectedContact) fetchContactAppointments(selectedContact.id)
    } catch (error) {
      console.error('Error deleting appointment:', error)
      alert('Failed to delete appointment')
    }
  }

  const handleAddTask = () => {
    if (!selectedContact) return
    navigate('/tasks', {
      state: {
        action: 'add',
        prefilledContact: {
          id: selectedContact.id,
          name: selectedContact.full_name,
          phone: selectedContact.phone
        },
        returnTo: '/contacts',
        returnToContactId: selectedContact.id,
        refreshTasks: true
      }
    })
  }

  const handleEditTask = (task: Task) => {
    navigate('/tasks', {
      state: {
        action: 'edit',
        taskId: task.id,
        returnTo: '/contacts',
        returnToContactId: selectedContact?.id
      }
    })
  }

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return

    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)

      if (error) throw error

      if (selectedContact) fetchContactTasks(selectedContact.id)
    } catch (error) {
      console.error('Error deleting task:', error)
      alert('Failed to delete task')
    }
  }

  return (
    <>
      {/* Desktop View */}
      <div className="hidden md:block ppt-slide p-6">
      {view === 'list' && (
        <PageHeader
          title="Contacts Master"
          subtitle="Manage all your contacts with personal and business details"
          actions={[
            ...(canCreate('contacts') ? [{
              label: 'Add Contact',
              onClick: () => setView('add'),
              variant: 'default' as const,
              icon: UserPlus
            }] : [])
          ]}
        />
      )}

      {view === 'list' && (
        <>
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-center py-12"
            >
              <div className="flex items-center space-x-3">
                <RefreshCw className="w-6 h-6 text-brand-primary animate-spin" />
                <span className="text-lg text-gray-600">Loading contacts data...</span>
              </div>
            </motion.div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-3">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <div>
                  <div className="font-medium text-red-800">Error loading contacts data</div>
                  <div className="text-sm text-red-600">{error}</div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchContacts}
                  className="ml-auto"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry
                </Button>
              </div>
            </motion.div>
          )}

          {!isLoading && !error && (
            <>
              <motion.div
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: { opacity: 0 },
                  visible: {
                    opacity: 1,
                    transition: {
                      staggerChildren: 0.1
                    }
                  }
                }}
              >
                <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
                  <KPICard
                    title="Total Contacts"
                    value={totalContacts}
                    change={12}
                    icon={Users}
                    category="primary"
                  />
                </motion.div>
                <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
                  <KPICard
                    title="Active Contacts"
                    value={activeContacts}
                    change={8}
                    icon={User}
                    category="success"
                  />
                </motion.div>
                <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
                  <KPICard
                    title="Customers"
                    value={customerContacts}
                    change={15}
                    icon={Tag}
                    category="secondary"
                  />
                </motion.div>
                <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
                  <KPICard
                    title="Vendors"
                    value={vendorContacts}
                    change={5}
                    icon={Building}
                    category="secondary"
                  />
                </motion.div>
              </motion.div>

              <motion.div
                className="mb-6 flex gap-4 flex-wrap"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Input
                  placeholder="Search contacts by name, email, phone, or contact ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-md"
                />
                <select
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                >
                  <option value="">All Types</option>
                  <option value="Customer">Customer</option>
                  <option value="Vendor">Vendor</option>
                  <option value="Partner">Partner</option>
                  <option value="Lead">Lead</option>
                  <option value="Other">Other</option>
                </select>
                <select
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mb-8"
              >
                <Card className="shadow-xl">
                  <CardHeader>
                    <CardTitle>Contacts Database</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-3 px-4 font-semibold text-brand-text">Contact ID</th>
                            <th className="text-left py-3 px-4 font-semibold text-brand-text">Name</th>
                            <th className="text-left py-3 px-4 font-semibold text-brand-text">Contact</th>
                            <th className="text-left py-3 px-4 font-semibold text-brand-text">Type</th>
                            <th className="text-left py-3 px-4 font-semibold text-brand-text">Status</th>
                            <th className="text-left py-3 px-4 font-semibold text-brand-text">Business</th>
                            <th className="text-left py-3 px-4 font-semibold text-brand-text">Created</th>
                            <th className="text-left py-3 px-4 font-semibold text-brand-text">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredContacts.map((contact, index) => (
                            <motion.tr
                              key={contact.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.1 * index }}
                              className="border-b border-gray-100 hover:bg-gray-50"
                            >
                              <td className="py-3 px-4 font-mono text-sm">{contact.contact_id}</td>
                              <td className="py-3 px-4">
                                <div className="flex items-center space-x-3">
                                  <Avatar className="h-10 w-10">
                                    <AvatarFallback className="bg-brand-primary text-white font-medium">
                                      {(contact.full_name || '').split(' ').map((n: string) => n[0]).join('')}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <div className="font-medium">{contact.full_name}</div>
                                    <div className="text-sm text-gray-500">{contact.email}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="space-y-1">
                                  <div className="flex items-center space-x-2 text-sm">
                                    <Phone className="w-4 h-4 text-gray-400" />
                                    <span className="font-mono">{contact.phone}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <Badge className={contactTypeColors[contact.contact_type || 'Other']}>
                                  {contact.contact_type}
                                </Badge>
                              </td>
                              <td className="py-3 px-4">
                                <Badge className={statusColors[contact.status || 'Active']}>
                                  {contact.status}
                                </Badge>
                              </td>
                              <td className="py-3 px-4">
                                <div>
                                  <div className="font-medium">{contact.business_name || 'N/A'}</div>
                                  <div className="text-sm text-gray-500">{contact.city || 'N/A'}</div>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center space-x-2">
                                  <Calendar className="w-4 h-4 text-gray-400" />
                                  <span className="text-sm">{formatDate(contact.created_at)}</span>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button size="sm" variant="ghost">
                                      <MoreVertical className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleViewContact(contact)}>
                                      <Eye className="w-4 h-4 mr-2" />
                                      View Details
                                    </DropdownMenuItem>
                                    {canUpdate('contacts') && (
                                      <DropdownMenuItem onClick={() => handleEditClick(contact)}>
                                        <Edit className="w-4 h-4 mr-2" />
                                        Edit Contact
                                      </DropdownMenuItem>
                                    )}
                                    {canDelete('contacts') && (
                                      <DropdownMenuItem
                                        onClick={() => handleDeleteContact(contact.id)}
                                        className="text-red-600 focus:text-red-600"
                                      >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Delete Contact
                                      </DropdownMenuItem>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </>
          )}
        </>
      )}

      {/* Add/Edit Contact Form */}
      {(view === 'add' || view === 'edit') && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <Button
                variant="ghost"
                onClick={() => { setView('list'); resetForm(); }}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to List
              </Button>
            </div>

            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit mb-6">
              <button
                onClick={() => setFormTab('personal')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md font-medium transition-all ${
                  formTab === 'personal'
                    ? 'bg-white text-brand-primary shadow-sm'
                    : 'text-gray-600 hover:text-brand-primary'
                }`}
              >
                <User className="w-4 h-4" />
                <span>Personal Details</span>
              </button>
              <button
                onClick={() => setFormTab('business')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md font-medium transition-all ${
                  formTab === 'business'
                    ? 'bg-white text-brand-primary shadow-sm'
                    : 'text-gray-600 hover:text-brand-primary'
                }`}
              >
                <Building className="w-4 h-4" />
                <span>Business Details</span>
              </button>
            </div>

            {formTab === 'personal' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                    <Input
                      value={formData.fullName}
                      onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                      placeholder="Enter full name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number *</label>
                    <ValidatedInput
                      validationType="phone"
                      isRequired={true}
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                      placeholder="Enter phone number"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                    <ValidatedInput
                      validationType="email"
                      isRequired={false}
                      type="email"
                      value={formData.emailAddress}
                      onChange={(e) => setFormData(prev => ({ ...prev, emailAddress: e.target.value }))}
                      placeholder="Enter email address (optional)"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth</label>
                    <Input
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) => setFormData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                    <Select value={formData.gender} onValueChange={(value) => setFormData(prev => ({ ...prev, gender: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Education Level</label>
                    <Select value={formData.educationLevel} onValueChange={(value) => setFormData(prev => ({ ...prev, educationLevel: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select education level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="High School">High School</SelectItem>
                        <SelectItem value="Diploma">Diploma</SelectItem>
                        <SelectItem value="Graduate">Graduate</SelectItem>
                        <SelectItem value="Post Graduate">Post Graduate</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Profession</label>
                    <Input
                      value={formData.profession}
                      onChange={(e) => setFormData(prev => ({ ...prev, profession: e.target.value }))}
                      placeholder="Enter profession"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Experience</label>
                    <Select value={formData.experience} onValueChange={(value) => setFormData(prev => ({ ...prev, experience: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select experience" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0-1 years">0-1 years</SelectItem>
                        <SelectItem value="2+ years">2+ years</SelectItem>
                        <SelectItem value="3+ years">3+ years</SelectItem>
                        <SelectItem value="5+ years">5+ years</SelectItem>
                        <SelectItem value="7+ years">7+ years</SelectItem>
                        <SelectItem value="10+ years">10+ years</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Contact Type</label>
                    <Select value={formData.contactType} onValueChange={(value) => setFormData(prev => ({ ...prev, contactType: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select contact type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Customer">Customer</SelectItem>
                        <SelectItem value="Vendor">Vendor</SelectItem>
                        <SelectItem value="Partner">Partner</SelectItem>
                        <SelectItem value="Lead">Lead</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                    <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {formTab === 'business' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Business Name</label>
                  <Input
                    value={formData.businessName}
                    onChange={(e) => setFormData(prev => ({ ...prev, businessName: e.target.value }))}
                    placeholder="Enter business name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                  <Input
                    value={formData.address}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="Enter complete address"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                    <Input
                      value={formData.city}
                      onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                      placeholder="Enter city"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                    <Input
                      value={formData.state}
                      onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                      placeholder="Enter state"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Pincode</label>
                    <Input
                      value={formData.pincode}
                      onChange={(e) => setFormData(prev => ({ ...prev, pincode: e.target.value }))}
                      placeholder="Enter pincode"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">GST Number</label>
                  <Input
                    value={formData.gstNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, gstNumber: e.target.value }))}
                    placeholder="Enter GST number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    rows={4}
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Enter any additional notes..."
                  />
                </div>
              </div>
            )}

            <div className="flex items-center space-x-3 mt-6">
              <Button
                onClick={view === 'add' ? handleCreateContact : handleEditContact}
                disabled={!formData.fullName || !formData.phoneNumber}
              >
                <Save className="w-4 h-4 mr-2" />
                {view === 'add' ? 'Add Contact' : 'Save Changes'}
              </Button>
              <Button variant="outline" onClick={() => { setView('list'); resetForm(); }}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* View Contact Details */}
      {view === 'view' && selectedContact && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <Button
                variant="ghost"
                onClick={() => { setView('list'); resetForm(); }}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to List
              </Button>
            </div>

            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit mb-6">
              <button
                onClick={() => setFormTab('personal')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md font-medium transition-all ${
                  formTab === 'personal'
                    ? 'bg-white text-brand-primary shadow-sm'
                    : 'text-gray-600 hover:text-brand-primary'
                }`}
              >
                <User className="w-4 h-4" />
                <span>Personal Details</span>
              </button>
              <button
                onClick={() => setFormTab('business')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md font-medium transition-all ${
                  formTab === 'business'
                    ? 'bg-white text-brand-primary shadow-sm'
                    : 'text-gray-600 hover:text-brand-primary'
                }`}
              >
                <Building className="w-4 h-4" />
                <span>Business Details</span>
              </button>
              <button
                onClick={() => setFormTab('notes')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md font-medium transition-all ${
                  formTab === 'notes'
                    ? 'bg-white text-brand-primary shadow-sm'
                    : 'text-gray-600 hover:text-brand-primary'
                }`}
              >
                <StickyNote className="w-4 h-4" />
                <span>Notes</span>
              </button>
              <button
                onClick={() => setFormTab('appointments')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md font-medium transition-all ${
                  formTab === 'appointments'
                    ? 'bg-white text-brand-primary shadow-sm'
                    : 'text-gray-600 hover:text-brand-primary'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>Appointments</span>
              </button>
              <button
                onClick={() => setFormTab('tasks')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md font-medium transition-all ${
                  formTab === 'tasks'
                    ? 'bg-white text-brand-primary shadow-sm'
                    : 'text-gray-600 hover:text-brand-primary'
                }`}
              >
                <CheckSquare className="w-4 h-4" />
                <span>Tasks</span>
              </button>
            </div>

            {formTab === 'personal' && (
              <div className="space-y-6">
                <div className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback className="bg-brand-primary text-white text-xl font-bold">
                      {(selectedContact.full_name || '').split(' ').map((n: string) => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-brand-text mb-2">{selectedContact.full_name}</h3>
                    <div className="flex items-center space-x-3 mb-2">
                      <Badge className={contactTypeColors[selectedContact.contact_type || 'Other']}>
                        {selectedContact.contact_type}
                      </Badge>
                      <Badge className={statusColors[selectedContact.status || 'Active']}>
                        {selectedContact.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600">
                      Contact ID: {selectedContact.contact_id} • Created: {formatDate(selectedContact.created_at)}
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-brand-text mb-3">Contact Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-3">
                      <Mail className="w-5 h-5 text-gray-400" />
                      <div>
                        <div className="text-sm text-gray-600">Email</div>
                        <div className="font-medium">{selectedContact.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Phone className="w-5 h-5 text-gray-400" />
                      <div>
                        <div className="text-sm text-gray-600">Phone</div>
                        <div className="font-medium">{selectedContact.phone}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-brand-text mb-3">Personal Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-gray-600">Date of Birth</div>
                      <div className="font-medium">{selectedContact.date_of_birth ? formatDate(selectedContact.date_of_birth) : 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Gender</div>
                      <div className="font-medium">{selectedContact.gender || 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Education Level</div>
                      <div className="font-medium">{selectedContact.education_level || 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Profession</div>
                      <div className="font-medium">{selectedContact.profession || 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Experience</div>
                      <div className="font-medium">{selectedContact.experience || 'N/A'}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {formTab === 'business' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-lg font-semibold text-brand-text mb-3">Business Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-3">
                      <Building className="w-5 h-5 text-gray-400" />
                      <div>
                        <div className="text-sm text-gray-600">Business Name</div>
                        <div className="font-medium">{selectedContact.business_name || 'N/A'}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <FileText className="w-5 h-5 text-gray-400" />
                      <div>
                        <div className="text-sm text-gray-600">GST Number</div>
                        <div className="font-medium font-mono">{selectedContact.gst_number || 'N/A'}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-brand-text mb-3">Address Information</h4>
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <MapPin className="w-5 h-5 text-gray-400 mt-1" />
                      <div>
                        <div className="text-sm text-gray-600">Complete Address</div>
                        <div className="font-medium">{selectedContact.address || 'N/A'}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <div className="text-sm text-gray-600">City</div>
                        <div className="font-medium">{selectedContact.city || 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">State</div>
                        <div className="font-medium">{selectedContact.state || 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Pincode</div>
                        <div className="font-medium font-mono">{selectedContact.pincode || 'N/A'}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {selectedContact.notes && (
                  <div>
                    <h4 className="text-lg font-semibold text-brand-text mb-3">Notes</h4>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-gray-700 whitespace-pre-wrap">{selectedContact.notes}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {formTab === 'notes' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-lg font-semibold text-brand-text mb-3">Add New Note</h4>
                  <div className="flex gap-3">
                    <textarea
                      value={newNoteText}
                      onChange={(e) => setNewNoteText(e.target.value)}
                      placeholder="Type your note here..."
                      rows={3}
                      className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                    />
                    <Button
                      onClick={(e) => {
                        e.preventDefault()
                        handleAddNote()
                      }}
                      disabled={!newNoteText.trim()}
                      className="self-start"
                      type="button"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Note
                    </Button>
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-brand-text mb-3">
                    All Notes ({contactNotes.length})
                  </h4>
                  <div className="space-y-3">
                    {contactNotes.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <StickyNote className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p>No notes added yet</p>
                      </div>
                    ) : (
                      contactNotes.map((note) => (
                        <div key={note.id} className="bg-gray-50 p-4 rounded-lg">
                          {editingNoteId === note.id ? (
                            <div className="space-y-3">
                              <textarea
                                value={editingNoteText}
                                onChange={(e) => setEditingNoteText(e.target.value)}
                                rows={3}
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleEditNote(note.id)}
                                >
                                  <Save className="w-4 h-4 mr-2" />
                                  Save
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setEditingNoteId(null)
                                    setEditingNoteText('')
                                  }}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-start justify-between mb-2">
                                <div className="text-xs text-gray-500">
                                  {formatDate(note.created_at)} • {note.created_by}
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setEditingNoteId(note.id)
                                      setEditingNoteText(note.note_text)
                                    }}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-red-600 hover:text-red-700"
                                    onClick={() => handleDeleteNote(note.id)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                              <p className="text-gray-700 whitespace-pre-wrap">{note.note_text}</p>
                            </>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {formTab === 'appointments' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-brand-text">
                    Appointments ({contactAppointments.length})
                  </h4>
                  <Button
                    onClick={handleAddAppointment}
                    size="sm"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Appointment
                  </Button>
                </div>

                <div>
                  {isLoadingAppointments ? (
                    <div className="text-center py-8">
                      <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-brand-primary" />
                      <p className="text-gray-500">Loading appointments...</p>
                    </div>
                  ) : contactAppointments.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>No appointments scheduled</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {contactAppointments.map((appointment) => (
                        <div key={appointment.id} className="bg-gray-50 p-4 rounded-lg hover:bg-gray-100 transition-colors">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <Badge className={
                                  appointment.status === 'Confirmed' ? 'bg-green-100 text-green-800' :
                                  appointment.status === 'Scheduled' ? 'bg-blue-100 text-blue-800' :
                                  appointment.status === 'Cancelled' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                                }>
                                  {appointment.status}
                                </Badge>
                                <Badge className="bg-purple-100 text-purple-800">
                                  {appointment.meeting_type}
                                </Badge>
                              </div>
                              <div className="font-medium text-sm text-gray-500 mb-1">
                                ID: {appointment.appointment_id}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEditAppointment(appointment)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => handleDeleteAppointment(appointment.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="w-4 h-4 text-gray-400" />
                              <span>{formatDate(appointment.appointment_date)}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Clock className="w-4 h-4 text-gray-400" />
                              <span>{formatTime(appointment.appointment_time)} ({appointment.duration_minutes}m)</span>
                            </div>
                            {appointment.location && (
                              <div className="flex items-center gap-2 text-sm col-span-2">
                                <MapPin className="w-4 h-4 text-gray-400" />
                                <span>{appointment.location}</span>
                              </div>
                            )}
                          </div>

                          {appointment.notes && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <p className="text-sm text-gray-600">{appointment.notes}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {formTab === 'tasks' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-brand-text">
                    Tasks ({contactTasks.length})
                  </h4>
                  <Button
                    onClick={handleAddTask}
                    size="sm"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Task
                  </Button>
                </div>

                <div>
                  {isLoadingTasks ? (
                    <div className="text-center py-8">
                      <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-brand-primary" />
                      <p className="text-gray-500">Loading tasks...</p>
                    </div>
                  ) : contactTasks.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <CheckSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>No tasks found</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {contactTasks.map((task) => (
                        <div key={task.id} className="bg-gray-50 p-4 rounded-lg hover:bg-gray-100 transition-colors">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <Badge className={
                                  task.status === 'Completed' ? 'bg-green-100 text-green-800' :
                                  task.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                                  task.status === 'In Review' ? 'bg-yellow-100 text-yellow-800' :
                                  task.status === 'Cancelled' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                                }>
                                  {task.status}
                                </Badge>
                                <Badge className={
                                  task.priority === 'Urgent' ? 'bg-red-100 text-red-800' :
                                  task.priority === 'High' ? 'bg-orange-100 text-orange-800' :
                                  task.priority === 'Medium' ? 'bg-blue-100 text-blue-800' :
                                  'bg-gray-100 text-gray-800'
                                }>
                                  <Flag className="w-3 h-3 mr-1" />
                                  {task.priority}
                                </Badge>
                                <Badge className="bg-purple-100 text-purple-800">
                                  {task.category}
                                </Badge>
                              </div>
                              <div className="font-medium text-gray-900 mb-1">{task.title}</div>
                              <div className="text-sm text-gray-500 mb-1">
                                ID: {task.task_id}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEditTask(task)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => handleDeleteTask(task.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {task.assigned_to_name && (
                              <div className="flex items-center gap-2 text-sm">
                                <Users className="w-4 h-4 text-gray-400" />
                                <span>{task.assigned_to_name}</span>
                              </div>
                            )}
                            {task.due_date && (
                              <div className="flex items-center gap-2 text-sm">
                                <Calendar className="w-4 h-4 text-gray-400" />
                                <span>Due: {formatDate(task.due_date)}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2 text-sm">
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs text-gray-500">Progress</span>
                                  <span className="text-xs font-medium">{task.progress_percentage}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-brand-primary h-2 rounded-full transition-all"
                                    style={{ width: `${task.progress_percentage}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>

                          {task.description && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <p className="text-sm text-gray-600">{task.description}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center space-x-3 mt-6">
              <PermissionGuard module="contacts" action="update">
                <Button onClick={() => handleEditClick(selectedContact)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Contact
                </Button>
              </PermissionGuard>
              <Button variant="outline" onClick={() => { setView('list'); resetForm(); }}>
                Close
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      </div>

      {/* Mobile View */}
      <div className="md:hidden min-h-screen bg-gradient-to-br from-cyan-50 to-blue-50">
        <AnimatePresence mode="wait">
          {view === 'list' && (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Mobile Header */}
              <div className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white px-4 py-6 shadow-lg">
                <h1 className="text-2xl font-bold mb-1">Contacts</h1>
                <p className="text-cyan-100 text-sm">{format(new Date(), 'EEEE, MMMM dd, yyyy')}</p>
              </div>

              {/* Stats Cards */}
              <div className="px-4 -mt-4 mb-4">
                <div className="grid grid-cols-2 gap-3">
                  <motion.div
                    whileTap={{ scale: 0.95 }}
                    className="bg-white rounded-2xl p-4 shadow-lg border border-cyan-100"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="bg-cyan-100 p-2 rounded-xl">
                        <Users className="w-5 h-5 text-cyan-600" />
                      </div>
                      <span className="text-2xl font-bold text-cyan-600">{totalContacts}</span>
                    </div>
                    <p className="text-xs text-gray-600 font-medium">Total</p>
                  </motion.div>

                  <motion.div
                    whileTap={{ scale: 0.95 }}
                    className="bg-white rounded-2xl p-4 shadow-lg border border-green-100"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="bg-green-100 p-2 rounded-xl">
                        <User className="w-5 h-5 text-green-600" />
                      </div>
                      <span className="text-2xl font-bold text-green-600">{activeContacts}</span>
                    </div>
                    <p className="text-xs text-gray-600 font-medium">Active</p>
                  </motion.div>

                  <motion.div
                    whileTap={{ scale: 0.95 }}
                    className="bg-white rounded-2xl p-4 shadow-lg border border-blue-100"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="bg-blue-100 p-2 rounded-xl">
                        <Tag className="w-5 h-5 text-blue-600" />
                      </div>
                      <span className="text-2xl font-bold text-blue-600">{customerContacts}</span>
                    </div>
                    <p className="text-xs text-gray-600 font-medium">Customers</p>
                  </motion.div>

                  <motion.div
                    whileTap={{ scale: 0.95 }}
                    className="bg-white rounded-2xl p-4 shadow-lg border border-purple-100"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="bg-purple-100 p-2 rounded-xl">
                        <Building className="w-5 h-5 text-purple-600" />
                      </div>
                      <span className="text-2xl font-bold text-purple-600">{vendorContacts}</span>
                    </div>
                    <p className="text-xs text-gray-600 font-medium">Vendors</p>
                  </motion.div>
                </div>
              </div>

              {/* Add Contact Button */}
              <div className="px-4 mb-4">
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setView('add')}
                  className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-2xl py-4 px-6 shadow-lg flex items-center justify-center gap-3 font-semibold"
                >
                  <Plus className="w-5 h-5" />
                  Add New Contact
                </motion.button>
              </div>

              {/* Recent Contacts */}
              <div className="px-4 pb-20">
                <h2 className="text-lg font-bold text-gray-800 mb-3">All Contacts</h2>
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div>
                  </div>
                ) : filteredContacts.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">No contacts yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredContacts.map((contact) => (
                      <motion.div
                        key={contact.id}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleViewContact(contact)}
                        className="bg-white rounded-2xl p-4 shadow-md active:shadow-lg transition-shadow"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="text-3xl">{contactTypeIcons[contact.contact_type] || '📋'}</div>
                            <div>
                              <p className="font-semibold text-gray-800">{contact.full_name}</p>
                              <p className="text-xs text-gray-500">{contact.email || contact.phone}</p>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge className={contactTypeColors[contact.contact_type || 'Other']}>
                              {contact.contact_type}
                            </Badge>
                            <Badge className={statusColors[contact.status || 'Active']}>
                              {contact.status}
                            </Badge>
                          </div>
                          {contact.business_name && (
                            <p className="text-xs text-gray-500">{contact.business_name}</p>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {(view === 'add' || view === 'edit') && (
            <motion.div
              key="form"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed inset-0 bg-white z-[60] overflow-y-auto"
            >
              <div className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white px-4 py-6 sticky top-0 z-10">
                <div className="flex items-center gap-3 mb-4">
                  <button onClick={() => { setView('list'); resetForm(); }}>
                    <ArrowLeft className="w-6 h-6" />
                  </button>
                  <h2 className="text-xl font-bold">
                    {view === 'add' ? 'Add Contact' : 'Edit Contact'}
                  </h2>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setFormTab('personal')}
                    className={`flex-1 py-2.5 rounded-xl font-medium transition-all ${
                      formTab === 'personal'
                        ? 'bg-white text-cyan-600 shadow-lg'
                        : 'bg-cyan-700/50 text-white'
                    }`}
                  >
                    Personal
                  </button>
                  <button
                    onClick={() => setFormTab('business')}
                    className={`flex-1 py-2.5 rounded-xl font-medium transition-all ${
                      formTab === 'business'
                        ? 'bg-white text-cyan-600 shadow-lg'
                        : 'bg-cyan-700/50 text-white'
                    }`}
                  >
                    Business
                  </button>
                </div>
              </div>

              <div className="p-4 pb-24">
                {formTab === 'personal' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                      <Input
                        value={formData.fullName}
                        onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                        placeholder="Enter full name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number *</label>
                      <ValidatedInput
                        validationType="phone"
                        isRequired={true}
                        value={formData.phoneNumber}
                        onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                        placeholder="Enter phone number"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                      <ValidatedInput
                        validationType="email"
                        isRequired={false}
                        type="email"
                        value={formData.emailAddress}
                        onChange={(e) => setFormData(prev => ({ ...prev, emailAddress: e.target.value }))}
                        placeholder="Enter email (optional)"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth</label>
                      <Input
                        type="date"
                        value={formData.dateOfBirth}
                        onChange={(e) => setFormData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                      <Select value={formData.gender} onValueChange={(value) => setFormData(prev => ({ ...prev, gender: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Education Level</label>
                      <Select value={formData.educationLevel} onValueChange={(value) => setFormData(prev => ({ ...prev, educationLevel: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select education" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="High School">High School</SelectItem>
                          <SelectItem value="Diploma">Diploma</SelectItem>
                          <SelectItem value="Graduate">Graduate</SelectItem>
                          <SelectItem value="Post Graduate">Post Graduate</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Profession</label>
                      <Input
                        value={formData.profession}
                        onChange={(e) => setFormData(prev => ({ ...prev, profession: e.target.value }))}
                        placeholder="Enter profession"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Experience</label>
                      <Select value={formData.experience} onValueChange={(value) => setFormData(prev => ({ ...prev, experience: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select experience" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0-1 years">0-1 years</SelectItem>
                          <SelectItem value="2+ years">2+ years</SelectItem>
                          <SelectItem value="3+ years">3+ years</SelectItem>
                          <SelectItem value="5+ years">5+ years</SelectItem>
                          <SelectItem value="7+ years">7+ years</SelectItem>
                          <SelectItem value="10+ years">10+ years</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Contact Type</label>
                      <Select value={formData.contactType} onValueChange={(value) => setFormData(prev => ({ ...prev, contactType: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Customer">Customer</SelectItem>
                          <SelectItem value="Vendor">Vendor</SelectItem>
                          <SelectItem value="Partner">Partner</SelectItem>
                          <SelectItem value="Lead">Lead</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                      <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Active">Active</SelectItem>
                          <SelectItem value="Inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {formTab === 'business' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Business Name</label>
                      <Input
                        value={formData.businessName}
                        onChange={(e) => setFormData(prev => ({ ...prev, businessName: e.target.value }))}
                        placeholder="Enter business name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                      <Input
                        value={formData.address}
                        onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                        placeholder="Enter complete address"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                      <Input
                        value={formData.city}
                        onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                        placeholder="Enter city"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                      <Input
                        value={formData.state}
                        onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                        placeholder="Enter state"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Pincode</label>
                      <Input
                        value={formData.pincode}
                        onChange={(e) => setFormData(prev => ({ ...prev, pincode: e.target.value }))}
                        placeholder="Enter pincode"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">GST Number</label>
                      <Input
                        value={formData.gstNumber}
                        onChange={(e) => setFormData(prev => ({ ...prev, gstNumber: e.target.value }))}
                        placeholder="Enter GST number"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                      <textarea
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary"
                        rows={4}
                        value={formData.notes}
                        onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Enter any additional notes..."
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 flex gap-3">
                <Button
                  onClick={view === 'add' ? handleCreateContact : handleEditContact}
                  disabled={!formData.fullName || !formData.phoneNumber}
                  className="flex-1"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {view === 'add' ? 'Add Contact' : 'Save'}
                </Button>
                <Button variant="outline" onClick={() => { setView('list'); resetForm(); }}>
                  Cancel
                </Button>
              </div>
            </motion.div>
          )}

          {view === 'view' && selectedContact && (
            <motion.div
              key="view"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed inset-0 bg-white z-[60] overflow-y-auto"
            >
              <div className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white px-4 py-6 sticky top-0 z-10">
                <div className="flex items-center gap-3 mb-4">
                  <button onClick={() => { setView('list'); resetForm(); }}>
                    <ArrowLeft className="w-6 h-6" />
                  </button>
                  <h2 className="text-xl font-bold">Contact Details</h2>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setFormTab('personal')}
                    className={`flex-1 py-3 rounded-xl font-medium transition-all flex items-center justify-center ${
                      formTab === 'personal'
                        ? 'bg-white text-cyan-600 shadow-lg'
                        : 'bg-cyan-700/50 text-white'
                    }`}
                  >
                    <User className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setFormTab('business')}
                    className={`flex-1 py-3 rounded-xl font-medium transition-all flex items-center justify-center ${
                      formTab === 'business'
                        ? 'bg-white text-cyan-600 shadow-lg'
                        : 'bg-cyan-700/50 text-white'
                    }`}
                  >
                    <Building className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setFormTab('notes')}
                    className={`flex-1 py-3 rounded-xl font-medium transition-all flex items-center justify-center ${
                      formTab === 'notes'
                        ? 'bg-white text-cyan-600 shadow-lg'
                        : 'bg-cyan-700/50 text-white'
                    }`}
                  >
                    <StickyNote className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setFormTab('appointments')}
                    className={`flex-1 py-3 rounded-xl font-medium transition-all flex items-center justify-center ${
                      formTab === 'appointments'
                        ? 'bg-white text-cyan-600 shadow-lg'
                        : 'bg-cyan-700/50 text-white'
                    }`}
                  >
                    <Calendar className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setFormTab('tasks')}
                    className={`flex-1 py-3 rounded-xl font-medium transition-all flex items-center justify-center ${
                      formTab === 'tasks'
                        ? 'bg-white text-cyan-600 shadow-lg'
                        : 'bg-cyan-700/50 text-white'
                    }`}
                  >
                    <CheckSquare className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-4 pb-24">
                {formTab === 'personal' && (
                  <div className="space-y-4">
                    <div className="bg-white rounded-2xl shadow-lg p-6">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="text-5xl">{contactTypeIcons[selectedContact.contact_type] || '📋'}</div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-800">{selectedContact.full_name}</h3>
                          <p className="text-sm text-gray-600">{selectedContact.contact_id}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={contactTypeColors[selectedContact.contact_type || 'Other']}>
                          {selectedContact.contact_type}
                        </Badge>
                        <Badge className={statusColors[selectedContact.status || 'Active']}>
                          {selectedContact.status}
                        </Badge>
                      </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-xs text-gray-500 mb-1">Email</div>
                      <div className="font-medium">{selectedContact.email || 'N/A'}</div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-xs text-gray-500 mb-1">Phone</div>
                      <div className="font-medium">{selectedContact.phone}</div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-xs text-gray-500 mb-1">Date of Birth</div>
                      <div className="font-medium">{selectedContact.date_of_birth ? formatDate(selectedContact.date_of_birth) : 'N/A'}</div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-xs text-gray-500 mb-1">Gender</div>
                      <div className="font-medium">{selectedContact.gender || 'N/A'}</div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-xs text-gray-500 mb-1">Education Level</div>
                      <div className="font-medium">{selectedContact.education_level || 'N/A'}</div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-xs text-gray-500 mb-1">Profession</div>
                      <div className="font-medium">{selectedContact.profession || 'N/A'}</div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-xs text-gray-500 mb-1">Experience</div>
                      <div className="font-medium">{selectedContact.experience || 'N/A'}</div>
                    </div>
                  </div>
                )}

                {formTab === 'business' && (
                  <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-xs text-gray-500 mb-1">Business Name</div>
                      <div className="font-medium">{selectedContact.business_name || 'N/A'}</div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-xs text-gray-500 mb-1">GST Number</div>
                      <div className="font-medium font-mono">{selectedContact.gst_number || 'N/A'}</div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-xs text-gray-500 mb-1">Address</div>
                      <div className="font-medium">{selectedContact.address || 'N/A'}</div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-xs text-gray-500 mb-1">City</div>
                      <div className="font-medium">{selectedContact.city || 'N/A'}</div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-xs text-gray-500 mb-1">State</div>
                      <div className="font-medium">{selectedContact.state || 'N/A'}</div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-xs text-gray-500 mb-1">Pincode</div>
                      <div className="font-medium">{selectedContact.pincode || 'N/A'}</div>
                    </div>

                    {selectedContact.notes && (
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="text-xs text-gray-500 mb-1">Notes</div>
                        <div className="font-medium whitespace-pre-wrap">{selectedContact.notes}</div>
                      </div>
                    )}
                  </div>
                )}

                {formTab === 'notes' && (
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-lg font-semibold text-brand-text mb-3">Add New Note</h4>
                      <div className="space-y-3">
                        <textarea
                          value={newNoteText}
                          onChange={(e) => setNewNoteText(e.target.value)}
                          placeholder="Type your note here..."
                          rows={4}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                        />
                        <Button
                          onClick={(e) => {
                            e.preventDefault()
                            handleAddNote()
                          }}
                          disabled={!newNoteText.trim()}
                          className="w-full"
                          type="button"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Note
                        </Button>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-lg font-semibold text-brand-text mb-3">
                        All Notes ({contactNotes.length})
                      </h4>
                      <div className="space-y-3">
                        {contactNotes.length === 0 ? (
                          <div className="text-center py-8 text-gray-500">
                            <StickyNote className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                            <p>No notes added yet</p>
                          </div>
                        ) : (
                          contactNotes.map((note) => (
                            <div key={note.id} className="bg-gray-50 p-4 rounded-lg">
                              {editingNoteId === note.id ? (
                                <div className="space-y-3">
                                  <textarea
                                    value={editingNoteText}
                                    onChange={(e) => setEditingNoteText(e.target.value)}
                                    rows={3}
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                                  />
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() => handleEditNote(note.id)}
                                      className="flex-1"
                                    >
                                      <Save className="w-4 h-4 mr-2" />
                                      Save
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setEditingNoteId(null)
                                        setEditingNoteText('')
                                      }}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="text-xs text-gray-500">
                                      {formatDate(note.created_at)} • {note.created_by}
                                    </div>
                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                          setEditingNoteId(note.id)
                                          setEditingNoteText(note.note_text)
                                        }}
                                      >
                                        <Edit className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="text-red-600"
                                        onClick={() => handleDeleteNote(note.id)}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </div>
                                  <p className="text-gray-700 whitespace-pre-wrap">{note.note_text}</p>
                                </>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {formTab === 'appointments' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-semibold text-gray-800">
                        Appointments ({contactAppointments.length})
                      </h4>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={handleAddAppointment}
                        className="bg-cyan-600 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2 shadow-md"
                      >
                        <Plus className="w-4 h-4" />
                        Add
                      </motion.button>
                    </div>

                    <div>
                      {isLoadingAppointments ? (
                        <div className="text-center py-12">
                          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-cyan-600" />
                          <p className="text-gray-500 text-sm">Loading appointments...</p>
                        </div>
                      ) : contactAppointments.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                          <Calendar className="w-16 h-16 mx-auto mb-3 text-gray-300" />
                          <p className="text-sm">No appointments scheduled</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {contactAppointments.map((appointment) => (
                            <motion.div
                              key={appointment.id}
                              whileTap={{ scale: 0.98 }}
                              className="bg-white rounded-2xl p-4 shadow-md border border-gray-100"
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                                    <Badge className={
                                      appointment.status === 'Confirmed' ? 'bg-green-100 text-green-800' :
                                      appointment.status === 'Scheduled' ? 'bg-blue-100 text-blue-800' :
                                      appointment.status === 'Cancelled' ? 'bg-red-100 text-red-800' :
                                      'bg-gray-100 text-gray-800'
                                    }>
                                      {appointment.status}
                                    </Badge>
                                    <Badge className="bg-purple-100 text-purple-800">
                                      {appointment.meeting_type}
                                    </Badge>
                                  </div>
                                  <div className="text-xs text-gray-500 font-medium mb-2">
                                    ID: {appointment.appointment_id}
                                  </div>
                                </div>
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => handleEditAppointment(appointment)}
                                    className="p-2 text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (confirm('Delete this appointment?')) {
                                        handleDeleteAppointment(appointment.id)
                                      }
                                    }}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>

                              <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm">
                                  <Calendar className="w-4 h-4 text-gray-400" />
                                  <span className="text-gray-700">{formatDate(appointment.appointment_date)}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                  <Clock className="w-4 h-4 text-gray-400" />
                                  <span className="text-gray-700">{formatTime(appointment.appointment_time)} ({appointment.duration_minutes}m)</span>
                                </div>
                                {appointment.location && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <MapPin className="w-4 h-4 text-gray-400" />
                                    <span className="text-gray-700">{appointment.location}</span>
                                  </div>
                                )}
                              </div>

                              {appointment.notes && (
                                <div className="mt-3 pt-3 border-t border-gray-200">
                                  <p className="text-sm text-gray-600">{appointment.notes}</p>
                                </div>
                              )}
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {formTab === 'tasks' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-semibold text-gray-800">
                        Tasks ({contactTasks.length})
                      </h4>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={handleAddTask}
                        className="bg-cyan-600 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2 shadow-md"
                      >
                        <Plus className="w-4 h-4" />
                        Add
                      </motion.button>
                    </div>

                    <div>
                      {isLoadingTasks ? (
                        <div className="text-center py-12">
                          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-cyan-600" />
                          <p className="text-gray-500 text-sm">Loading tasks...</p>
                        </div>
                      ) : contactTasks.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                          <CheckSquare className="w-16 h-16 mx-auto mb-3 text-gray-300" />
                          <p className="text-sm">No tasks found</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {contactTasks.map((task) => (
                            <motion.div
                              key={task.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100"
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <div className="flex flex-wrap items-center gap-2 mb-2">
                                    <Badge className={
                                      task.status === 'Completed' ? 'bg-green-100 text-green-800 text-xs' :
                                      task.status === 'In Progress' ? 'bg-blue-100 text-blue-800 text-xs' :
                                      task.status === 'In Review' ? 'bg-yellow-100 text-yellow-800 text-xs' :
                                      task.status === 'Cancelled' ? 'bg-red-100 text-red-800 text-xs' :
                                      'bg-gray-100 text-gray-800 text-xs'
                                    }>
                                      {task.status}
                                    </Badge>
                                    <Badge className={
                                      task.priority === 'Urgent' ? 'bg-red-100 text-red-800 text-xs' :
                                      task.priority === 'High' ? 'bg-orange-100 text-orange-800 text-xs' :
                                      task.priority === 'Medium' ? 'bg-blue-100 text-blue-800 text-xs' :
                                      'bg-gray-100 text-gray-800 text-xs'
                                    }>
                                      <Flag className="w-3 h-3 mr-1" />
                                      {task.priority}
                                    </Badge>
                                    <Badge className="bg-purple-100 text-purple-800 text-xs">
                                      {task.category}
                                    </Badge>
                                  </div>
                                  <div className="font-medium text-gray-900 mb-1">{task.title}</div>
                                  <div className="text-xs text-gray-500 mb-2">
                                    ID: {task.task_id}
                                  </div>
                                </div>
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => handleEditTask(task)}
                                    className="p-2 text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (confirm('Delete this task?')) {
                                        handleDeleteTask(task.id)
                                      }
                                    }}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>

                              <div className="space-y-2">
                                {task.assigned_to_name && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <Users className="w-4 h-4 text-gray-400" />
                                    <span className="text-gray-700">{task.assigned_to_name}</span>
                                  </div>
                                )}
                                {task.due_date && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <Calendar className="w-4 h-4 text-gray-400" />
                                    <span className="text-gray-700">Due: {formatDate(task.due_date)}</span>
                                  </div>
                                )}
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs text-gray-500">Progress</span>
                                    <span className="text-xs font-medium text-cyan-600">{task.progress_percentage}%</span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                      className="bg-cyan-600 h-2 rounded-full transition-all"
                                      style={{ width: `${task.progress_percentage}%` }}
                                    />
                                  </div>
                                </div>
                              </div>

                              {task.description && (
                                <div className="mt-3 pt-3 border-t border-gray-200">
                                  <p className="text-sm text-gray-600">{task.description}</p>
                                </div>
                              )}
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 flex gap-3">
                <Button onClick={() => handleEditClick(selectedContact)} className="flex-1">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (confirm('Are you sure you want to delete this contact?')) {
                      handleDeleteContact(selectedContact.id)
                      setView('list')
                      resetForm()
                    }
                  }}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
                <Button variant="outline" onClick={() => { setView('list'); resetForm(); }}>
                  Close
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}
