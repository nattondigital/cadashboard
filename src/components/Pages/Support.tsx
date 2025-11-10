import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Eye, CreditCard as Edit, Trash2, MessageCircle, Clock, User, AlertCircle, CheckCircle, Star, Search, Filter, Send, Phone, Mail, FileText, Zap, TrendingUp, Users, Award, BookOpen, X, Save, MoreVertical, ArrowLeft, ChevronRight, Upload, Paperclip } from 'lucide-react'
import { PageHeader } from '@/components/Common/PageHeader'
import { KPICard } from '@/components/Common/KPICard'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { formatDate } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { PermissionGuard } from '@/components/Common/PermissionGuard'

const priorityColors: Record<string, string> = {
  'Low': 'bg-green-100 text-green-800',
  'Medium': 'bg-yellow-100 text-yellow-800',
  'High': 'bg-red-100 text-red-800',
  'Critical': 'bg-purple-100 text-purple-800'
}

const statusColors: Record<string, string> = {
  'Open': 'bg-blue-100 text-blue-800',
  'In Progress': 'bg-yellow-100 text-yellow-800',
  'Resolved': 'bg-green-100 text-green-800',
  'Closed': 'bg-gray-100 text-gray-800',
  'Escalated': 'bg-red-100 text-red-800'
}

const categoryColors: Record<string, string> = {
  'Technical': 'bg-blue-100 text-blue-800',
  'Billing': 'bg-green-100 text-green-800',
  'Course': 'bg-purple-100 text-purple-800',
  'Refund': 'bg-red-100 text-red-800',
  'Feature Request': 'bg-orange-100 text-orange-800',
  'General': 'bg-gray-100 text-gray-800'
}

type ViewType = 'list' | 'add' | 'edit' | 'view'

export function Support() {
  const { canCreate, canUpdate, canDelete } = useAuth()
  const [view, setView] = useState<ViewType>('list')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [selectedTicket, setSelectedTicket] = useState<any>(null)
  const [tickets, setTickets] = useState<any[]>([])
  const [contacts, setContacts] = useState<any[]>([])
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    customerId: '',
    customerName: '',
    customerEmail: '',
    subject: '',
    description: '',
    priority: 'Medium',
    category: 'General',
    assignedTo: ''
  })
  const [attachments, setAttachments] = useState<File[]>([])
  const [attachmentPreviews, setAttachmentPreviews] = useState<string[]>([])
  const [uploadingFiles, setUploadingFiles] = useState(false)
  const [customerSearchTerm, setCustomerSearchTerm] = useState('')

  useEffect(() => {
    fetchTicketsAndMembers()
    fetchTeamMembers()
  }, [])

  const fetchTeamMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('id, full_name, email, role')
        .order('full_name', { ascending: true })

      if (error) throw error
      setTeamMembers(data || [])
    } catch (err) {
      console.error('Error fetching team members:', err)
    }
  }

  const fetchTicketsAndMembers = async () => {
    try {
      setLoading(true)
      const { data: contactsData, error: contactsError } = await supabase
        .from('contacts_master')
        .select('*')
        .order('created_at', { ascending: false })

      if (contactsError) throw contactsError
      setContacts(contactsData || [])

      const { data: adminUsersData, error: adminUsersError } = await supabase
        .from('admin_users')
        .select('id, full_name')

      if (adminUsersError) throw adminUsersError

      const { data: ticketsData, error: ticketsError } = await supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false })

      if (ticketsError) throw ticketsError

      const ticketsWithContacts = ticketsData.map((ticket: any) => {
        const contact = contactsData?.find((c: any) => c.id === ticket.contact_id)
        const assignedUser = adminUsersData?.find((u: any) => u.id === ticket.assigned_to)
        return {
          id: ticket.id,
          ticketId: ticket.ticket_id,
          customerId: contact?.contact_id || 'N/A',
          customerName: contact?.full_name || 'Unknown',
          customerEmail: contact?.email || 'N/A',
          subject: ticket.subject,
          description: ticket.description,
          priority: ticket.priority,
          status: ticket.status,
          category: ticket.category,
          assignedTo: assignedUser?.full_name || ticket.assigned_to || 'Unassigned',
          assignedToId: ticket.assigned_to,
          createdAt: new Date(ticket.created_at).toLocaleString(),
          updatedAt: new Date(ticket.updated_at).toLocaleString(),
          responseTime: ticket.response_time || 'Pending',
          satisfaction: ticket.satisfaction,
          tags: ticket.tags || [],
          contactId: ticket.contact_id,
          attachment1Url: ticket.attachment_1_url,
          attachment1Name: ticket.attachment_1_name,
          attachment2Url: ticket.attachment_2_url,
          attachment2Name: ticket.attachment_2_name,
          attachment3Url: ticket.attachment_3_url,
          attachment3Name: ticket.attachment_3_name
        }
      })

      setTickets(ticketsWithContacts)
    } catch (error) {
      console.error('Failed to fetch tickets and members:', error)
      alert('Failed to load support tickets. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.ticketId.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = !statusFilter || ticket.status === statusFilter
    const matchesPriority = !priorityFilter || ticket.priority === priorityFilter
    const matchesCategory = !categoryFilter || ticket.category === categoryFilter
    return matchesSearch && matchesStatus && matchesPriority && matchesCategory
  })

  const totalTickets = tickets.length
  const openTickets = tickets.filter(t => t.status === 'Open' || t.status === 'In Progress').length
  const resolvedTickets = tickets.filter(t => t.status === 'Resolved' || t.status === 'Closed').length
  const avgSatisfaction = tickets.filter(t => t.satisfaction).reduce((sum, t) => sum + (t.satisfaction || 0), 0) / tickets.filter(t => t.satisfaction).length

  const updateTicketStatus = async (ticketId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ status: newStatus })
        .eq('ticket_id', ticketId)

      if (error) throw error
      await fetchTicketsAndMembers()
      if (selectedTicket && selectedTicket.ticketId === ticketId) {
        setView('list')
      }
    } catch (error) {
      console.error('Failed to update ticket status:', error)
      alert('Failed to update ticket status. Please try again.')
    }
  }

  const handleCreateTicket = async () => {
    try {
      const year = new Date().getFullYear()

      const { data: existingTickets, error: countError } = await supabase
        .from('support_tickets')
        .select('ticket_id')
        .like('ticket_id', `TKT-${year}-%`)
        .order('ticket_id', { ascending: false })
        .limit(1)

      if (countError) throw countError

      let nextNumber = 1
      if (existingTickets && existingTickets.length > 0) {
        const lastTicketId = existingTickets[0].ticket_id
        const lastNumber = parseInt(lastTicketId.split('-')[2])
        nextNumber = lastNumber + 1
      }

      const ticketNumber = String(nextNumber).padStart(3, '0')
      const ticketId = `TKT-${year}-${ticketNumber}`

      const { urls, names } = await uploadFiles('TICKET_CREATED')

      const insertData: any = {
        ticket_id: ticketId,
        contact_id: formData.customerId,
        subject: formData.subject,
        description: formData.description,
        priority: formData.priority,
        status: 'Open',
        category: formData.category,
        assigned_to: formData.assignedTo || null,
        response_time: 'Just created',
        tags: [formData.category, formData.priority]
      }

      if (urls.length > 0) insertData.attachment_1_url = urls[0]
      if (names.length > 0) insertData.attachment_1_name = names[0]
      if (urls.length > 1) insertData.attachment_2_url = urls[1]
      if (names.length > 1) insertData.attachment_2_name = names[1]
      if (urls.length > 2) insertData.attachment_3_url = urls[2]
      if (names.length > 2) insertData.attachment_3_name = names[2]

      const { error } = await supabase
        .from('support_tickets')
        .insert(insertData)

      if (error) {
        console.error('Database error:', error)
        throw error
      }

      await fetchTicketsAndMembers()
      setView('list')
      resetForm()
      alert('Ticket created successfully!')
    } catch (error: any) {
      console.error('Failed to create ticket:', error)
      const errorMessage = error?.message || 'Unknown error occurred'
      alert(`Failed to create ticket: ${errorMessage}`)
    }
  }

  const handleEditTicket = async () => {
    try {
      const { urls, names } = await uploadFiles('TICKET_UPDATED')

      const updateData: any = {
        contact_id: formData.customerId,
        subject: formData.subject,
        description: formData.description,
        priority: formData.priority,
        category: formData.category,
        assigned_to: formData.assignedTo || null
      }

      if (urls.length > 0) {
        if (urls.length > 0) updateData.attachment_1_url = urls[0]
        if (names.length > 0) updateData.attachment_1_name = names[0]
        if (urls.length > 1) updateData.attachment_2_url = urls[1]
        if (names.length > 1) updateData.attachment_2_name = names[1]
        if (urls.length > 2) updateData.attachment_3_url = urls[2]
        if (names.length > 2) updateData.attachment_3_name = names[2]
      }

      const { error } = await supabase
        .from('support_tickets')
        .update(updateData)
        .eq('id', selectedTicket.id)

      if (error) throw error

      await fetchTicketsAndMembers()
      setView('list')
      resetForm()
      alert('Ticket updated successfully!')
    } catch (error: any) {
      console.error('Failed to update ticket:', error)
      const errorMessage = error?.message || 'Unknown error occurred'
      alert(`Failed to update ticket: ${errorMessage}`)
    }
  }

  const handleDeleteTicket = async (id: string) => {
    if (confirm('Are you sure you want to delete this ticket?')) {
      try {
        const { error } = await supabase
          .from('support_tickets')
          .delete()
          .eq('id', id)

        if (error) throw error

        await fetchTicketsAndMembers()
        alert('Ticket deleted successfully!')
      } catch (error) {
        console.error('Failed to delete ticket:', error)
        alert('Failed to delete ticket. Please try again.')
      }
    }
  }

  const handleViewTicket = (ticket: any) => {
    setSelectedTicket(ticket)
    setView('view')
  }

  const handleEditClick = (ticket: any) => {
    setSelectedTicket(ticket)
    setFormData({
      customerId: ticket.contactId,
      customerName: ticket.customerName,
      customerEmail: ticket.customerEmail,
      subject: ticket.subject,
      description: ticket.description,
      priority: ticket.priority,
      category: ticket.category,
      assignedTo: ticket.assignedToId || ''
    })
    setCustomerSearchTerm('')
    setView('edit')
  }

  const resetForm = () => {
    setFormData({
      customerId: '',
      customerName: '',
      customerEmail: '',
      subject: '',
      description: '',
      priority: 'Medium',
      category: 'General',
      assignedTo: ''
    })
    setAttachments([])
    setAttachmentPreviews([])
    setCustomerSearchTerm('')
    setSelectedTicket(null)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const remainingSlots = 3 - attachments.length

    if (files.length > remainingSlots) {
      alert(`You can only upload up to 3 files total. ${remainingSlots} slot(s) remaining.`)
      return
    }

    const newAttachments = [...attachments, ...files.slice(0, remainingSlots)]
    setAttachments(newAttachments)

    const newPreviews = files.slice(0, remainingSlots).map(file => file.name)
    setAttachmentPreviews([...attachmentPreviews, ...newPreviews])
  }

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index))
    setAttachmentPreviews(attachmentPreviews.filter((_, i) => i !== index))
  }

  const uploadFiles = async (triggerEvent: 'TICKET_CREATED' | 'TICKET_UPDATED') => {
    if (attachments.length === 0) return { urls: [], names: [] }

    setUploadingFiles(true)
    const uploadedUrls: string[] = []
    const uploadedNames: string[] = []

    try {
      const { data: integration } = await supabase
        .from('integrations')
        .select('config')
        .eq('integration_type', 'ghl_api')
        .maybeSingle()

      if (integration?.config?.accessToken) {
        const accessToken = integration.config.accessToken
        const locationId = integration.config.locationId || 'iDIRFjdZBWH7SqBzTowc'

        const { data: folderAssignment } = await supabase
          .from('media_folder_assignments')
          .select('media_folder_id')
          .eq('trigger_event', triggerEvent)
          .maybeSingle()

        if (!folderAssignment?.media_folder_id) {
          throw new Error(`No media folder configured for ${triggerEvent}. Please configure in Settings > Media Folders.`)
        }

        const { data: mediaFolder } = await supabase
          .from('media_folders')
          .select('id, ghl_folder_id')
          .eq('id', folderAssignment.media_folder_id)
          .single()

        if (!mediaFolder?.ghl_folder_id) {
          throw new Error('Media folder configuration is invalid')
        }

        const ghlFolderId = mediaFolder.ghl_folder_id

        for (const file of attachments) {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
          const fileExt = file.name.split('.').pop()
          const fileName = `support-ticket-${timestamp}.${fileExt}`

          const formDataUpload = new FormData()
          formDataUpload.append('file', file, fileName)
          formDataUpload.append('name', fileName)
          formDataUpload.append('parentId', ghlFolderId)

          const uploadResponse = await fetch('https://services.leadconnectorhq.com/medias/upload-file', {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Version': '2021-07-28',
              'Authorization': `Bearer ${accessToken.trim()}`
            },
            body: formDataUpload
          })

          if (uploadResponse.ok) {
            const ghlFile = await uploadResponse.json()
            const fileUrl = ghlFile.url || ghlFile.fileUrl || ''

            await supabase.from('media_files').insert({
              file_name: fileName,
              file_url: fileUrl,
              file_type: file.type,
              file_size: file.size,
              ghl_file_id: ghlFile._id || ghlFile.id,
              folder_id: mediaFolder.id,
              location_id: locationId,
              thumbnail_url: ghlFile.thumbnailUrl || null,
              uploaded_by: formData.customerId
            })

            uploadedUrls.push(fileUrl)
            uploadedNames.push(file.name)
          }
        }
      } else {
        throw new Error('GHL integration not configured')
      }

      return { urls: uploadedUrls, names: uploadedNames }
    } catch (error) {
      console.error('Error uploading files:', error)
      throw error
    } finally {
      setUploadingFiles(false)
    }
  }

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < Math.floor(rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
      />
    ))
  }

  return (
    <>
      {/* Desktop View */}
      <div className="hidden md:block ppt-slide p-6">
        {view === 'list' && (
          <PageHeader
            title="Customer Support Center"
            subtitle="Manage support tickets and customer inquiries"
            actions={[
              ...(canCreate('support') ? [{
                label: 'New Ticket',
                onClick: () => setView('add'),
                variant: 'default' as const,
                icon: Plus
              }] : [])
            ]}
          />
        )}

        {view === 'list' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <KPICard
            title="Total Tickets"
            value={totalTickets.toString()}
            icon={FileText}
            category="primary"
          />
          <KPICard
            title="Open Tickets"
            value={openTickets.toString()}
            icon={AlertCircle}
            category="warning"
          />
          <KPICard
            title="Resolved"
            value={resolvedTickets.toString()}
            icon={CheckCircle}
            category="success"
          />
          <KPICard
            title="Satisfaction"
            value={`${avgSatisfaction.toFixed(1)}/5`}
            icon={Star}
            category="secondary"
          />
          </div>
        )}

        {view === 'list' && (
          <div className="mb-6 flex gap-4 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search tickets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 max-w-md"
            />
          </div>
          <select
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
            <option value="Closed">Closed</option>
          </select>
          <select
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            <option value="">All Priority</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Critical">Critical</option>
          </select>
          <select
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">All Categories</option>
            <option value="Technical">Technical</option>
            <option value="Billing">Billing</option>
            <option value="Course">Course</option>
            <option value="Refund">Refund</option>
            <option value="Feature Request">Feature Request</option>
          </select>
          </div>
        )}

        {view === 'list' && (
          <Card className="shadow-xl">
          <CardHeader>
            <CardTitle>Support Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
                <p className="mt-4 text-gray-600">Loading tickets...</p>
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No support tickets found</p>
              </div>
            ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-brand-text">Ticket ID</th>
                    <th className="text-left py-3 px-4 font-semibold text-brand-text">Customer</th>
                    <th className="text-left py-3 px-4 font-semibold text-brand-text">Subject</th>
                    <th className="text-left py-3 px-4 font-semibold text-brand-text">Priority</th>
                    <th className="text-left py-3 px-4 font-semibold text-brand-text">Status</th>
                    <th className="text-left py-3 px-4 font-semibold text-brand-text">Category</th>
                    <th className="text-left py-3 px-4 font-semibold text-brand-text">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTickets.map((ticket) => (
                    <tr key={ticket.ticketId} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-mono text-sm font-medium">{ticket.ticketId}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-brand-primary text-white text-xs">
                              {ticket.customerName.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{ticket.customerName}</div>
                            <div className="text-sm text-gray-500">{ticket.customerEmail}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="max-w-xs">
                          <div className="font-medium truncate">{ticket.subject}</div>
                          <div className="text-sm text-gray-500 truncate">{ticket.description}</div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={priorityColors[ticket.priority]}>{ticket.priority}</Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={statusColors[ticket.status]}>{ticket.status}</Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className={categoryColors[ticket.category]}>
                          {ticket.category}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="ghost">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewTicket(ticket)}>
                              <Eye className="w-4 h-4 mr-2" />
                              View Ticket
                            </DropdownMenuItem>
                            {canUpdate('support') && (
                              <DropdownMenuItem onClick={() => handleEditClick(ticket)}>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit Ticket
                              </DropdownMenuItem>
                            )}
                            {canUpdate('support') && ticket.status !== 'Resolved' && ticket.status !== 'Closed' && (
                              <DropdownMenuItem
                                onClick={() => updateTicketStatus(ticket.ticketId, 'Resolved')}
                                className="text-green-600 focus:text-green-600"
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Mark Resolved
                              </DropdownMenuItem>
                            )}
                            {canDelete('support') && (
                              <DropdownMenuItem
                                onClick={() => handleDeleteTicket(ticket.id)}
                                className="text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete Ticket
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}
          </CardContent>
        </Card>
        )}

        {/* Desktop Create/Edit Form */}
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
                  Back
                </Button>
                <h2 className="text-2xl font-bold text-brand-text">
                  {view === 'add' ? 'Create New Support Ticket' : 'Edit Support Ticket'}
                </h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Customer *</label>
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="Search customer by name, email, or phone..."
                      value={customerSearchTerm}
                      onChange={(e) => setCustomerSearchTerm(e.target.value)}
                      onFocus={() => setCustomerSearchTerm('')}
                      className="w-full"
                    />
                    {customerSearchTerm && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {contacts
                          .filter((contact) => {
                            const searchLower = customerSearchTerm.toLowerCase()
                            return (
                              contact.full_name?.toLowerCase().includes(searchLower) ||
                              contact.email?.toLowerCase().includes(searchLower) ||
                              contact.phone?.toLowerCase().includes(searchLower) ||
                              contact.contact_id?.toLowerCase().includes(searchLower)
                            )
                          })
                          .map((contact) => (
                            <div
                              key={contact.id}
                              onClick={() => {
                                setFormData(prev => ({
                                  ...prev,
                                  customerId: contact.id,
                                  customerName: contact.full_name || '',
                                  customerEmail: contact.email || ''
                                }))
                                setCustomerSearchTerm('')
                              }}
                              className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                            >
                              <div className="font-medium">{contact.full_name}</div>
                              <div className="text-sm text-gray-500">
                                {contact.email || contact.phone || contact.contact_id}
                              </div>
                            </div>
                          ))}
                        {contacts.filter((contact) => {
                          const searchLower = customerSearchTerm.toLowerCase()
                          return (
                            contact.full_name?.toLowerCase().includes(searchLower) ||
                            contact.email?.toLowerCase().includes(searchLower) ||
                            contact.phone?.toLowerCase().includes(searchLower) ||
                            contact.contact_id?.toLowerCase().includes(searchLower)
                          )
                        }).length === 0 && (
                          <div className="px-4 py-2 text-gray-500 text-center">
                            No customers found
                          </div>
                        )}
                      </div>
                    )}
                    {formData.customerName && !customerSearchTerm && (
                      <div className="mt-2 text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded">
                        Selected: <span className="font-medium">{formData.customerName}</span>
                        {formData.customerEmail && ` (${formData.customerEmail})`}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Subject *</label>
                  <Input
                    value={formData.subject}
                    onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder="Enter ticket subject"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe the issue in detail"
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                    <Select value={formData.priority} onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Low">Low</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                        <SelectItem value="Critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                    <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Technical">Technical</SelectItem>
                        <SelectItem value="Billing">Billing</SelectItem>
                        <SelectItem value="Course">Course</SelectItem>
                        <SelectItem value="Refund">Refund</SelectItem>
                        <SelectItem value="Feature Request">Feature Request</SelectItem>
                        <SelectItem value="General">General</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Assign To</label>
                    <Select value={formData.assignedTo} onValueChange={(value) => setFormData(prev => ({ ...prev, assignedTo: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select team member" />
                      </SelectTrigger>
                      <SelectContent>
                        {teamMembers.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.full_name} ({member.role})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Attachments (Optional - Up to 3 files)
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                    <input
                      type="file"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                      id="file-upload"
                      disabled={attachments.length >= 3}
                    />
                    <label
                      htmlFor="file-upload"
                      className={`flex flex-col items-center justify-center cursor-pointer ${
                        attachments.length >= 3 ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      <Upload className="w-8 h-8 text-gray-400 mb-2" />
                      <span className="text-sm text-gray-600">
                        {attachments.length >= 3
                          ? 'Maximum 3 files reached'
                          : 'Click to upload files'}
                      </span>
                      <span className="text-xs text-gray-500 mt-1">
                        {attachments.length}/3 files uploaded
                      </span>
                    </label>

                    {attachmentPreviews.length > 0 && (
                      <div className="mt-4 space-y-2">
                        {attachmentPreviews.map((name, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded"
                          >
                            <div className="flex items-center gap-2">
                              <Paperclip className="w-4 h-4 text-gray-500" />
                              <span className="text-sm text-gray-700">{name}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeAttachment(index)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3 mt-6">
                <Button
                  onClick={view === 'add' ? handleCreateTicket : handleEditTicket}
                  disabled={!formData.customerId || !formData.subject || !formData.description || uploadingFiles}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {uploadingFiles ? 'Uploading...' : (view === 'add' ? 'Create Ticket' : 'Save Changes')}
                </Button>
                <Button variant="outline" onClick={() => { setView('list'); resetForm(); }}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Desktop View */}
        {view === 'view' && selectedTicket && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <Button
                  variant="ghost"
                  onClick={() => setView('list')}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>
                <h2 className="text-2xl font-bold text-brand-text">Ticket Details</h2>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Ticket ID</label>
                    <p className="text-base font-semibold text-gray-800">{selectedTicket.ticketId}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Status</label>
                    <Badge className={statusColors[selectedTicket.status]}>{selectedTicket.status}</Badge>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Customer</label>
                  <p className="text-base font-semibold text-gray-800">{selectedTicket.customerName}</p>
                  <p className="text-sm text-gray-500">{selectedTicket.customerEmail}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Subject</label>
                  <p className="text-base font-semibold text-gray-800">{selectedTicket.subject}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Description</label>
                  <p className="text-base text-gray-700 leading-relaxed">{selectedTicket.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Priority</label>
                    <Badge className={priorityColors[selectedTicket.priority]}>{selectedTicket.priority}</Badge>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Category</label>
                    <Badge className={categoryColors[selectedTicket.category]}>{selectedTicket.category}</Badge>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Assigned To</label>
                  <p className="text-base font-semibold text-gray-800">{selectedTicket.assignedTo}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Created</label>
                  <p className="text-base text-gray-700">{selectedTicket.createdAt}</p>
                </div>

                {(selectedTicket.attachment1Url || selectedTicket.attachment2Url || selectedTicket.attachment3Url) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">Attachments</label>
                    <div className="space-y-2">
                      {selectedTicket.attachment1Url && (
                        <a
                          href={selectedTicket.attachment1Url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm"
                        >
                          <Paperclip className="w-4 h-4" />
                          {selectedTicket.attachment1Name || 'Attachment 1'}
                        </a>
                      )}
                      {selectedTicket.attachment2Url && (
                        <a
                          href={selectedTicket.attachment2Url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm"
                        >
                          <Paperclip className="w-4 h-4" />
                          {selectedTicket.attachment2Name || 'Attachment 2'}
                        </a>
                      )}
                      {selectedTicket.attachment3Url && (
                        <a
                          href={selectedTicket.attachment3Url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm"
                        >
                          <Paperclip className="w-4 h-4" />
                          {selectedTicket.attachment3Name || 'Attachment 3'}
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-3 mt-6">
                <PermissionGuard module="support" action="update">
                  <Button onClick={() => handleEditClick(selectedTicket)}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                </PermissionGuard>
                {canUpdate('support') && selectedTicket.status !== 'Resolved' && selectedTicket.status !== 'Closed' && (
                  <Button
                    variant="outline"
                    onClick={() => updateTicketStatus(selectedTicket.ticketId, 'Resolved')}
                    className="text-green-600 hover:text-green-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Resolve
                  </Button>
                )}
                <PermissionGuard module="support" action="delete">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setView('list')
                      handleDeleteTicket(selectedTicket.id)
                    }}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </PermissionGuard>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Mobile View */}
      <div className="md:hidden min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50">
        {/* Mobile Header */}
        <div className="bg-gradient-to-r from-orange-600 to-orange-700 text-white px-4 py-6 sticky top-0 z-10 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <MessageCircle className="w-6 h-6" />
            <h1 className="text-xl font-bold flex-1 text-center">Support Tickets</h1>
            <button onClick={() => setView('add')}>
              <Plus className="w-6 h-6" />
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-300" />
            <input
              type="text"
              placeholder="Search tickets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-full bg-white/20 text-white placeholder-orange-200 focus:outline-none focus:ring-2 focus:ring-white/30"
            />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3 p-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-4 shadow-lg"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-orange-100 p-2 rounded-xl">
                <FileText className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{totalTickets}</p>
                <p className="text-xs text-gray-500">Total</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl p-4 shadow-lg"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-yellow-100 p-2 rounded-xl">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{openTickets}</p>
                <p className="text-xs text-gray-500">Open</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl p-4 shadow-lg"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-green-100 p-2 rounded-xl">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{resolvedTickets}</p>
                <p className="text-xs text-gray-500">Resolved</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl p-4 shadow-lg"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-blue-100 p-2 rounded-xl">
                <Star className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{avgSatisfaction.toFixed(1)}</p>
                <p className="text-xs text-gray-500">Rating</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Tickets List */}
        <div className="px-4 pb-24">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">No tickets found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTickets.map((ticket) => (
                <motion.div
                  key={ticket.ticketId}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleViewTicket(ticket)}
                  className="bg-white rounded-2xl p-4 shadow-md active:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-orange-600 text-white text-sm">
                          {ticket.customerName.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">{ticket.customerName}</p>
                        <p className="text-xs text-gray-500">{ticket.ticketId}</p>
                      </div>
                    </div>
                    <Badge className={statusColors[ticket.status]}>{ticket.status}</Badge>
                  </div>

                  <p className="font-semibold text-gray-800 mb-2">{ticket.subject}</p>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{ticket.description}</p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className={priorityColors[ticket.priority]} variant="outline">
                        {ticket.priority}
                      </Badge>
                      <Badge className={categoryColors[ticket.category]} variant="outline">
                        {ticket.category}
                      </Badge>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Mobile View Modal */}
        <AnimatePresence>
          {view === 'view' && selectedTicket && (
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed inset-0 bg-white z-50 overflow-y-auto"
            >
              <div className="bg-gradient-to-r from-orange-600 to-orange-700 text-white px-4 py-6 sticky top-0 z-10">
                <div className="flex items-center gap-3">
                  <button onClick={() => setView('list')}>
                    <ArrowLeft className="w-6 h-6" />
                  </button>
                  <h2 className="text-xl font-bold">Ticket Details</h2>
                </div>
              </div>

              <div className="p-4 space-y-4">
                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <Avatar className="h-16 w-16">
                      <AvatarFallback className="bg-orange-600 text-white text-xl">
                        {selectedTicket.customerName.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-lg font-bold text-gray-800">{selectedTicket.customerName}</p>
                      <p className="text-sm text-gray-500">{selectedTicket.customerEmail}</p>
                      <Badge className={statusColors[selectedTicket.status]}>{selectedTicket.status}</Badge>
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-3 border-b">
                    <div className="flex items-center gap-3">
                      <div className="bg-orange-100 p-2 rounded-xl">
                        <FileText className="w-4 h-4 text-orange-600" />
                      </div>
                      <span className="text-sm text-gray-600">Ticket ID</span>
                    </div>
                    <span className="font-semibold text-gray-800 font-mono">{selectedTicket.ticketId}</span>
                  </div>

                  <div className="py-3 border-b">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="bg-blue-100 p-2 rounded-xl">
                        <MessageCircle className="w-4 h-4 text-blue-600" />
                      </div>
                      <span className="text-sm text-gray-600">Subject</span>
                    </div>
                    <p className="text-sm text-gray-700 ml-12">{selectedTicket.subject}</p>
                  </div>

                  <div className="py-3 border-b">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="bg-green-100 p-2 rounded-xl">
                        <FileText className="w-4 h-4 text-green-600" />
                      </div>
                      <span className="text-sm text-gray-600">Description</span>
                    </div>
                    <p className="text-sm text-gray-700 ml-12 leading-relaxed">{selectedTicket.description}</p>
                  </div>

                  <div className="flex items-center justify-between py-3 border-b">
                    <div className="flex items-center gap-3">
                      <div className="bg-purple-100 p-2 rounded-xl">
                        <AlertCircle className="w-4 h-4 text-purple-600" />
                      </div>
                      <span className="text-sm text-gray-600">Priority</span>
                    </div>
                    <Badge className={priorityColors[selectedTicket.priority]}>{selectedTicket.priority}</Badge>
                  </div>

                  <div className="flex items-center justify-between py-3 border-b">
                    <div className="flex items-center gap-3">
                      <div className="bg-yellow-100 p-2 rounded-xl">
                        <FileText className="w-4 h-4 text-yellow-600" />
                      </div>
                      <span className="text-sm text-gray-600">Category</span>
                    </div>
                    <Badge className={categoryColors[selectedTicket.category]}>{selectedTicket.category}</Badge>
                  </div>

                  <div className="flex items-center justify-between py-3 border-b">
                    <div className="flex items-center gap-3">
                      <div className="bg-gray-100 p-2 rounded-xl">
                        <User className="w-4 h-4 text-gray-600" />
                      </div>
                      <span className="text-sm text-gray-600">Assigned To</span>
                    </div>
                    <span className="font-semibold text-gray-800">{selectedTicket.assignedTo}</span>
                  </div>

                  <div className="py-3">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="bg-blue-100 p-2 rounded-xl">
                        <Clock className="w-4 h-4 text-blue-600" />
                      </div>
                      <span className="text-sm text-gray-600">Created</span>
                    </div>
                    <p className="text-sm text-gray-700 ml-12">{selectedTicket.createdAt}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleEditClick(selectedTicket)}
                    className="bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-2xl py-4 font-bold shadow-lg flex items-center justify-center gap-2"
                  >
                    <Edit className="w-5 h-5" />
                    Edit Ticket
                  </motion.button>

                  {selectedTicket.status !== 'Resolved' && selectedTicket.status !== 'Closed' && (
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setView('list')
                        updateTicketStatus(selectedTicket.ticketId, 'Resolved')
                      }}
                      className="bg-gradient-to-r from-green-600 to-green-700 text-white rounded-2xl py-4 font-bold shadow-lg flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-5 h-5" />
                      Mark Resolved
                    </motion.button>
                  )}

                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setView('list')
                      handleDeleteTicket(selectedTicket.id)
                    }}
                    className="bg-gradient-to-r from-red-600 to-red-700 text-white rounded-2xl py-4 font-bold shadow-lg flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-5 h-5" />
                    Delete Ticket
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile Create/Edit Full Page */}
        <AnimatePresence>
          {(view === 'add' || view === 'edit') && (
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed inset-0 bg-white z-50 overflow-y-auto"
            >
              <div className="bg-gradient-to-r from-orange-600 to-orange-700 text-white px-4 py-6 sticky top-0 z-10">
                <div className="flex items-center gap-3">
                  <button onClick={() => { setView('list'); resetForm(); }}>
                    <ArrowLeft className="w-6 h-6" />
                  </button>
                  <h2 className="text-xl font-bold">
                    {view === 'add' ? 'New Support Ticket' : 'Edit Ticket'}
                  </h2>
                </div>
              </div>

              <div className="p-4 space-y-4">
                <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Customer *</label>
                    <select
                      value={formData.customerId}
                      onChange={(e) => {
                        const contact = contacts.find(c => c.id === e.target.value)
                        setFormData(prev => ({
                          ...prev,
                          customerId: e.target.value,
                          customerName: contact?.full_name || '',
                          customerEmail: contact?.email || ''
                        }))
                      }}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                      <option value="">Select customer</option>
                      {contacts.map((contact) => (
                        <option key={contact.id} value={contact.id}>
                          {contact.full_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Subject *</label>
                    <input
                      type="text"
                      value={formData.subject}
                      onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                      placeholder="Enter ticket subject"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Description *</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe the issue in detail"
                      rows={6}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Priority</label>
                      <select
                        value={formData.priority}
                        onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                        <option value="Critical">Critical</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      >
                        <option value="Technical">Technical</option>
                        <option value="Billing">Billing</option>
                        <option value="Course">Course</option>
                        <option value="Refund">Refund</option>
                        <option value="Feature Request">Feature Request</option>
                        <option value="General">General</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Assign To</label>
                    <select
                      value={formData.assignedTo}
                      onChange={(e) => setFormData(prev => ({ ...prev, assignedTo: e.target.value }))}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                      <option value="">Select team member</option>
                      {teamMembers.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.full_name} ({member.role})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={view === 'add' ? handleCreateTicket : handleEditTicket}
                  disabled={!formData.customerId || !formData.subject || !formData.description}
                  className="w-full bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-2xl py-4 font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {view === 'add' ? 'Create Ticket' : 'Save Changes'}
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}
