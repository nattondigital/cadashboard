import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { UserPlus, Eye, CreditCard as Edit, Trash2, User, Mail, Phone, X, Save, Calendar, ArrowLeft, Plus, Search, Users, RefreshCw, AlertCircle, GraduationCap, Briefcase, Building, FileText, MapPin, MoreVertical } from 'lucide-react'
import { PageHeader } from '@/components/Common/PageHeader'
import { KPICard } from '@/components/Common/KPICard'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { ValidatedInput } from '@/components/ui/validated-input'
import { formatDate, getPhoneValidationError, getEmailValidationError } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { PermissionGuard } from '@/components/Common/PermissionGuard'

interface Member {
  id: string
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
  created_at: string
}

type ViewType = 'list' | 'add' | 'edit' | 'view'
type TabType = 'personal' | 'business'

const genderColors: Record<string, string> = {
  'Male': 'bg-blue-100 text-blue-800',
  'Female': 'bg-pink-100 text-pink-800',
  'Other': 'bg-purple-100 text-purple-800'
}

const educationColors: Record<string, string> = {
  'Graduate': 'bg-green-100 text-green-800',
  'Post Graduate': 'bg-blue-100 text-blue-800',
  'Diploma': 'bg-orange-100 text-orange-800',
  'High School': 'bg-gray-100 text-gray-800'
}

const experienceColors: Record<string, string> = {
  '0-1 years': 'bg-red-100 text-red-800',
  '2+ years': 'bg-yellow-100 text-yellow-800',
  '3+ years': 'bg-orange-100 text-orange-800',
  '5+ years': 'bg-blue-100 text-blue-800',
  '7+ years': 'bg-purple-100 text-purple-800',
  '10+ years': 'bg-green-100 text-green-800'
}

export function Members() {
  const { canCreate, canUpdate, canDelete } = useAuth()
  const [view, setView] = useState<ViewType>('list')
  const [viewTab, setViewTab] = useState<TabType>('personal')
  const [formTab, setFormTab] = useState<TabType>('personal')
  const [searchTerm, setSearchTerm] = useState('')
  const [genderFilter, setGenderFilter] = useState('all')
  const [educationFilter, setEducationFilter] = useState('all')
  const [members, setMembers] = useState<Member[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [contactSearchTerm, setContactSearchTerm] = useState('')
  const [contactSearchResults, setContactSearchResults] = useState<any[]>([])
  const [showContactDropdown, setShowContactDropdown] = useState(false)
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
    gstNumber: ''
  })

  useEffect(() => {
    fetchMembers()
  }, [])

  useEffect(() => {
    const searchContacts = async () => {
      if (contactSearchTerm.length < 2) {
        setContactSearchResults([])
        setShowContactDropdown(false)
        return
      }

      try {
        const { data, error: searchError } = await supabase
          .from('contacts_master')
          .select('*')
          .or(`full_name.ilike.%${contactSearchTerm}%,phone.ilike.%${contactSearchTerm}%,email.ilike.%${contactSearchTerm}%`)
          .limit(10)

        if (searchError) throw searchError

        setContactSearchResults(data || [])
        setShowContactDropdown(true)
      } catch (error) {
        console.error('Error searching contacts:', error)
      }
    }

    const debounceTimer = setTimeout(searchContacts, 300)
    return () => clearTimeout(debounceTimer)
  }, [contactSearchTerm])

  const fetchMembers = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const { data, error: fetchError } = await supabase
        .from('enrolled_members')
        .select('*')
        .order('created_at', { ascending: false })

      if (fetchError) {
        throw fetchError
      }

      setMembers(data || [])
    } catch (error) {
      console.error('Error fetching members:', error)
      setError(error instanceof Error ? error.message : 'Failed to fetch members data')
    } finally {
      setIsLoading(false)
    }
  }

  const filteredMembers = members.filter(member => {
    const matchesSearch = (member.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (member.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (member.phone || '').includes(searchTerm) ||
                         member.id.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesGender = genderFilter === 'all' || member.gender === genderFilter
    const matchesEducation = educationFilter === 'all' || member.education_level === educationFilter

    return matchesSearch && matchesGender && matchesEducation
  })

  const totalMembers = members.length
  const maleMembers = members.filter(m => m.gender === 'Male').length
  const femaleMembers = members.filter(m => m.gender === 'Female').length
  const graduateMembers = members.filter(m => m.education_level === 'Graduate').length

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
      gstNumber: ''
    })
  }

  const handleAddClick = () => {
    resetForm()
    setContactSearchTerm('')
    setContactSearchResults([])
    setShowContactDropdown(false)
    setFormTab('personal')
    setView('add')
  }

  const handleSelectContact = (contact: any) => {
    setFormData({
      fullName: contact.full_name || '',
      phoneNumber: contact.phone || '',
      emailAddress: contact.email || '',
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
      gstNumber: contact.gst_number || ''
    })
    setContactSearchTerm(contact.full_name || '')
    setShowContactDropdown(false)
  }

  const handleViewMember = (member: Member) => {
    setSelectedMember(member)
    setView('view')
    setViewTab('personal')
  }

  const handleEditClick = (member: Member) => {
    setSelectedMember(member)
    setFormData({
      fullName: member.full_name,
      phoneNumber: member.phone,
      emailAddress: member.email || '',
      dateOfBirth: member.date_of_birth || '',
      gender: member.gender || '',
      educationLevel: member.education_level || '',
      profession: member.profession || '',
      experience: member.experience || '',
      businessName: member.business_name || '',
      address: member.address || '',
      city: member.city || '',
      state: member.state || '',
      pincode: member.pincode || '',
      gstNumber: member.gst_number || ''
    })
    setFormTab('personal')
    setView('edit')
  }

  const handleBackToList = () => {
    setView('list')
    setSelectedMember(null)
    resetForm()
  }

  const handleCreateMember = async () => {
    const phoneError = getPhoneValidationError(formData.phoneNumber)
    const emailError = getEmailValidationError(formData.emailAddress, false)

    if (phoneError || emailError) {
      alert(phoneError || emailError || 'Please fix validation errors before submitting')
      return
    }

    try {
      const { error: insertError } = await supabase
        .from('enrolled_members')
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
          gst_number: formData.gstNumber || null
        })

      if (insertError) {
        throw insertError
      }

      setView('list')
      resetForm()
      fetchMembers()
    } catch (error) {
      console.error('Error creating member:', error)
      setError(error instanceof Error ? error.message : 'Failed to create member')
    }
  }

  const handleEditMember = async () => {
    if (!selectedMember) return

    const phoneError = getPhoneValidationError(formData.phoneNumber)
    const emailError = getEmailValidationError(formData.emailAddress, false)

    if (phoneError || emailError) {
      alert(phoneError || emailError || 'Please fix validation errors before submitting')
      return
    }

    try {
      const { error: updateError } = await supabase
        .from('enrolled_members')
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
          gst_number: formData.gstNumber || null
        })
        .eq('id', selectedMember.id)

      if (updateError) {
        throw updateError
      }

      setView('list')
      resetForm()
      fetchMembers()
    } catch (error) {
      console.error('Error updating member:', error)
      setError(error instanceof Error ? error.message : 'Failed to update member')
    }
  }

  const handleDeleteMember = async (memberId: string) => {
    if (confirm('Are you sure you want to delete this member?')) {
      try {
        const { error: deleteError } = await supabase
          .from('enrolled_members')
          .delete()
          .eq('id', memberId)

        if (deleteError) {
          throw deleteError
        }

        fetchMembers()
      } catch (error) {
        console.error('Error deleting member:', error)
        setError(error instanceof Error ? error.message : 'Failed to delete member')
      }
    }
  }

  if (view === 'add') {
    return (
      <div className="p-6">
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToList}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Members
          </Button>
          <h1 className="text-3xl font-bold text-brand-text">Add New Member</h1>
        </div>

        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8">
              <button
                onClick={() => setFormTab('personal')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  formTab === 'personal'
                    ? 'border-brand-primary text-brand-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Personal Details
              </button>
              <button
                onClick={() => setFormTab('business')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  formTab === 'business'
                    ? 'border-brand-primary text-brand-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Business Details
              </button>
            </nav>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {formTab === 'personal' && (
            <motion.div
              key="personal-form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Search from Existing Contacts (Optional)
                      </label>
                      <div className="relative">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                          <Input
                            value={contactSearchTerm}
                            onChange={(e) => setContactSearchTerm(e.target.value)}
                            onFocus={() => contactSearchResults.length > 0 && setShowContactDropdown(true)}
                            placeholder="Search by name, phone, or email..."
                            className="pl-10"
                          />
                        </div>
                        {showContactDropdown && contactSearchResults.length > 0 && (
                          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                            {contactSearchResults.map((contact) => (
                              <button
                                key={contact.id}
                                onClick={() => handleSelectContact(contact)}
                                className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
                              >
                                <div className="font-medium text-gray-900">{contact.full_name}</div>
                                <div className="text-sm text-gray-600 flex items-center space-x-4 mt-1">
                                  {contact.phone && (
                                    <span className="flex items-center">
                                      <Phone className="w-3 h-3 mr-1" />
                                      {contact.phone}
                                    </span>
                                  )}
                                  {contact.email && (
                                    <span className="flex items-center">
                                      <Mail className="w-3 h-3 mr-1" />
                                      {contact.email}
                                    </span>
                                  )}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Start typing to search for existing contacts or enter details manually below
                      </p>
                    </div>

                    <div className="border-t pt-4">
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

                    <div className="flex justify-end space-x-3 pt-6 border-t">
                      <Button variant="outline" onClick={handleBackToList}>
                        Cancel
                      </Button>
                      <Button onClick={() => setFormTab('business')}>
                        Next: Business Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {formTab === 'business' && (
            <motion.div
              key="business-form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-6">
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
                        placeholder="Enter address"
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

                    <div className="flex justify-end space-x-3 pt-6 border-t">
                      <Button variant="outline" onClick={() => setFormTab('personal')}>
                        Back: Personal Details
                      </Button>
                      <Button onClick={handleCreateMember}>
                        <Save className="w-4 h-4 mr-2" />
                        Save Member
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  if (view === 'edit' && selectedMember) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToList}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Members
          </Button>
          <h1 className="text-3xl font-bold text-brand-text">Edit Member</h1>
        </div>

        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8">
              <button
                onClick={() => setFormTab('personal')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  formTab === 'personal'
                    ? 'border-brand-primary text-brand-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Personal Details
              </button>
              <button
                onClick={() => setFormTab('business')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  formTab === 'business'
                    ? 'border-brand-primary text-brand-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Business Details
              </button>
            </nav>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {formTab === 'personal' && (
            <motion.div
              key="personal-form-edit"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-6">
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

                    <div className="flex justify-end space-x-3 pt-6 border-t">
                      <Button variant="outline" onClick={handleBackToList}>
                        Cancel
                      </Button>
                      <Button onClick={() => setFormTab('business')}>
                        Next: Business Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {formTab === 'business' && (
            <motion.div
              key="business-form-edit"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-6">
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
                        placeholder="Enter address"
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

                    <div className="flex justify-end space-x-3 pt-6 border-t">
                      <Button variant="outline" onClick={() => setFormTab('personal')}>
                        Back: Personal Details
                      </Button>
                      <Button onClick={handleEditMember}>
                        <Save className="w-4 h-4 mr-2" />
                        Save Changes
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  if (view === 'view' && selectedMember) {
    return (
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToList}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Members
            </Button>
            <h1 className="text-3xl font-bold text-brand-text">{selectedMember.full_name}</h1>
          </div>
          <Button onClick={() => handleEditClick(selectedMember)}>
            <Edit className="w-4 h-4 mr-2" />
            Edit Member
          </Button>
        </div>

        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8">
              <button
                onClick={() => setViewTab('personal')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  viewTab === 'personal'
                    ? 'border-brand-primary text-brand-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Personal Details
              </button>
              <button
                onClick={() => setViewTab('business')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  viewTab === 'business'
                    ? 'border-brand-primary text-brand-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Business Information
              </button>
            </nav>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {viewTab === 'personal' && (
            <motion.div
              key="personal"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              <Card>
                <CardContent className="p-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="text-sm text-gray-600">Full Name</label>
                      <p className="font-medium mt-1">{selectedMember.full_name}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Phone</label>
                      <p className="font-medium mt-1">{selectedMember.phone}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Email</label>
                      <p className="font-medium mt-1">{selectedMember.email || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Date of Birth</label>
                      <p className="font-medium mt-1">{selectedMember.date_of_birth ? formatDate(selectedMember.date_of_birth) : 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Gender</label>
                      <div className="mt-1">
                        {selectedMember.gender ? (
                          <Badge className={genderColors[selectedMember.gender] || 'bg-gray-100 text-gray-800'}>
                            {selectedMember.gender}
                          </Badge>
                        ) : (
                          <p className="font-medium">N/A</p>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Education Level</label>
                      <div className="mt-1">
                        {selectedMember.education_level ? (
                          <Badge className={educationColors[selectedMember.education_level] || 'bg-gray-100 text-gray-800'}>
                            {selectedMember.education_level}
                          </Badge>
                        ) : (
                          <p className="font-medium">N/A</p>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Profession</label>
                      <p className="font-medium mt-1">{selectedMember.profession || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Experience</label>
                      <div className="mt-1">
                        {selectedMember.experience ? (
                          <Badge className={experienceColors[selectedMember.experience] || 'bg-gray-100 text-gray-800'}>
                            {selectedMember.experience}
                          </Badge>
                        ) : (
                          <p className="font-medium">N/A</p>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Enrolled On</label>
                      <p className="font-medium mt-1">{formatDate(selectedMember.created_at)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {viewTab === 'business' && (
            <motion.div
              key="business"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              <Card>
                <CardContent className="p-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="text-sm text-gray-600">Business Name</label>
                      <p className="font-medium mt-1">{selectedMember.business_name || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">GST Number</label>
                      <p className="font-medium mt-1">{selectedMember.gst_number || 'N/A'}</p>
                    </div>
                    <div className="col-span-2">
                      <label className="text-sm text-gray-600">Address</label>
                      <p className="font-medium mt-1">{selectedMember.address || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">City</label>
                      <p className="font-medium mt-1">{selectedMember.city || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">State</label>
                      <p className="font-medium mt-1">{selectedMember.state || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Pincode</label>
                      <p className="font-medium mt-1">{selectedMember.pincode || 'N/A'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Enrolled Members Management"
        subtitle="Manage member information and track enrollment"
        actions={[
          {
            label: 'Add Member',
            onClick: handleAddClick,
            variant: 'default',
            icon: UserPlus
          },
          {
            label: 'Refresh Data',
            onClick: fetchMembers,
            variant: 'outline',
            icon: RefreshCw
          }
        ]}
      />

      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-center py-12"
        >
          <div className="flex items-center space-x-3">
            <RefreshCw className="w-6 h-6 text-brand-primary animate-spin" />
            <span className="text-lg text-gray-600">Loading members data...</span>
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
              <div className="font-medium text-red-800">Error loading members data</div>
              <div className="text-sm text-red-600">{error}</div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchMembers}
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
                title="Total Members"
                value={totalMembers}
                change={12}
                icon={Users}
                category="primary"
              />
            </motion.div>
            <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
              <KPICard
                title="Male Members"
                value={maleMembers}
                change={8}
                icon={User}
                category="secondary"
              />
            </motion.div>
            <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
              <KPICard
                title="Female Members"
                value={femaleMembers}
                change={15}
                icon={User}
                category="success"
              />
            </motion.div>
            <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
              <KPICard
                title="Graduates"
                value={graduateMembers}
                change={10}
                icon={GraduationCap}
                category="warning"
              />
            </motion.div>
          </motion.div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>All Members</CardTitle>
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search members..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                  <Select value={genderFilter} onValueChange={setGenderFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Filter by gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Genders</SelectItem>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={educationFilter} onValueChange={setEducationFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by education" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Education Levels</SelectItem>
                      <SelectItem value="High School">High School</SelectItem>
                      <SelectItem value="Diploma">Diploma</SelectItem>
                      <SelectItem value="Graduate">Graduate</SelectItem>
                      <SelectItem value="Post Graduate">Post Graduate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredMembers.map((member) => (
                  <motion.div
                    key={member.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 flex-1">
                        <Avatar className="w-12 h-12">
                          <AvatarFallback className="bg-brand-primary text-white">
                            {member.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <h3 className="font-semibold text-gray-900">{member.full_name}</h3>
                            {member.gender && (
                              <Badge className={genderColors[member.gender] || 'bg-gray-100 text-gray-800'}>
                                {member.gender}
                              </Badge>
                            )}
                            {member.education_level && (
                              <Badge className={educationColors[member.education_level] || 'bg-gray-100 text-gray-800'}>
                                {member.education_level}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                            <span className="flex items-center">
                              <Phone className="w-3 h-3 mr-1" />
                              {member.phone}
                            </span>
                            {member.email && (
                              <span className="flex items-center">
                                <Mail className="w-3 h-3 mr-1" />
                                {member.email}
                              </span>
                            )}
                            {member.profession && (
                              <span className="flex items-center">
                                <Briefcase className="w-3 h-3 mr-1" />
                                {member.profession}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewMember(member)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditClick(member)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDeleteMember(member.id)} className="text-red-600">
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </motion.div>
                ))}

                {filteredMembers.length === 0 && (
                  <div className="text-center py-12">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No members found</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
