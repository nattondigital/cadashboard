import React, { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { supabase } from '@/lib/supabase'

interface Course {
  id?: string
  title: string
  description: string
  thumbnail_url?: string
  instructor: string
  duration?: string
  level: string
  status: string
  price: number
}

interface CourseModalProps {
  isOpen: boolean
  onClose: () => void
  course?: Course | null
  onSuccess: () => void
}

export function CourseModal({ isOpen, onClose, course, onSuccess }: CourseModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    thumbnail_url: '',
    instructor: 'Admin',
    duration: '',
    level: 'Beginner',
    status: 'Draft',
    price: 0
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (course) {
      setFormData({
        title: course.title,
        description: course.description || '',
        thumbnail_url: course.thumbnail_url || '',
        instructor: course.instructor,
        duration: course.duration || '',
        level: course.level,
        status: course.status,
        price: course.price
      })
    } else {
      setFormData({
        title: '',
        description: '',
        thumbnail_url: '',
        instructor: 'Admin',
        duration: '',
        level: 'Beginner',
        status: 'Draft',
        price: 0
      })
    }
    setError('')
  }, [course, isOpen])

  const generateCourseId = async () => {
    const { data, error } = await supabase
      .from('courses')
      .select('course_id')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error || !data) return 'C001'

    const lastNumber = parseInt(data.course_id.substring(1))
    const nextNumber = lastNumber + 1
    return `C${String(nextNumber).padStart(3, '0')}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.title) {
      setError('Course title is required')
      return
    }

    try {
      setLoading(true)

      if (course?.id) {
        const { error: updateError } = await supabase
          .from('courses')
          .update({
            title: formData.title,
            description: formData.description || null,
            thumbnail_url: formData.thumbnail_url || null,
            instructor: formData.instructor,
            duration: formData.duration || null,
            level: formData.level,
            status: formData.status,
            price: formData.price
          })
          .eq('id', course.id)

        if (updateError) throw updateError
      } else {
        const courseId = await generateCourseId()

        const { error: insertError } = await supabase
          .from('courses')
          .insert({
            course_id: courseId,
            title: formData.title,
            description: formData.description || null,
            thumbnail_url: formData.thumbnail_url || null,
            instructor: formData.instructor,
            duration: formData.duration || null,
            level: formData.level,
            status: formData.status,
            price: formData.price
          })

        if (insertError) throw insertError
      }

      onSuccess()
      onClose()
    } catch (err: any) {
      console.error('Error saving course:', err)
      setError(err.message || 'Failed to save course')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 md:relative bg-black bg-opacity-50 md:bg-transparent flex items-center justify-center z-50 p-0 md:p-0">
      <div className="bg-white rounded-none md:rounded-lg shadow-xl w-full h-full md:w-full overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-green-600 md:bg-white md:border-b px-4 md:px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl md:text-2xl font-bold text-white md:text-gray-900">
            {course ? 'Edit Course' : 'Add New Course'}
          </h2>
          <button onClick={onClose} className="text-white md:text-gray-400 hover:text-blue-100 md:hover:text-gray-600">
            <X className="w-5 h-5 md:w-6 md:h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4 bg-white max-w-4xl md:mx-auto">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Course Title <span className="text-red-500">*</span>
            </label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., AI Automation Mastery"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter course description..."
              rows={4}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Thumbnail URL
            </label>
            <Input
              value={formData.thumbnail_url}
              onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
              placeholder="https://example.com/image.jpg"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Instructor
              </label>
              <Input
                value={formData.instructor}
                onChange={(e) => setFormData({ ...formData, instructor: e.target.value })}
                placeholder="Instructor name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duration
              </label>
              <Input
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                placeholder="e.g., 10 hours"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Level
              </label>
              <select
                value={formData.level}
                onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Draft">Draft</option>
                <option value="Published">Published</option>
                <option value="Archived">Archived</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price
              </label>
              <Input
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700"
            >
              {loading ? 'Saving...' : course ? 'Update Course' : 'Create Course'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
