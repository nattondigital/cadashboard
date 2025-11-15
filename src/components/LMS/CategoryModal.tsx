import React, { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { supabase } from '@/lib/supabase'

interface Category {
  id?: string
  title: string
  description?: string
  order_index: number
}

interface CategoryModalProps {
  isOpen: boolean
  onClose: () => void
  courseId: string
  category?: Category | null
  onSuccess: () => void
}

export function CategoryModal({ isOpen, onClose, courseId, category, onSuccess }: CategoryModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    order_index: 0
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (category) {
      setFormData({
        title: category.title,
        description: category.description || '',
        order_index: category.order_index
      })
    } else {
      fetchNextOrderIndex()
    }
    setError('')
  }, [category, isOpen, courseId])

  const fetchNextOrderIndex = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('order_index')
      .eq('course_id', courseId)
      .order('order_index', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!error && data) {
      setFormData(prev => ({ ...prev, order_index: data.order_index + 1 }))
    } else {
      setFormData(prev => ({ ...prev, order_index: 1 }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.title) {
      setError('Category title is required')
      return
    }

    try {
      setLoading(true)

      if (category?.id) {
        const { error: updateError } = await supabase
          .from('categories')
          .update({
            title: formData.title,
            description: formData.description || null,
            order_index: formData.order_index
          })
          .eq('id', category.id)

        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase
          .from('categories')
          .insert({
            course_id: courseId,
            title: formData.title,
            description: formData.description || null,
            order_index: formData.order_index
          })

        if (insertError) throw insertError
      }

      onSuccess()
      onClose()
    } catch (err: any) {
      console.error('Error saving category:', err)
      setError(err.message || 'Failed to save category')
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
            {category ? 'Edit Category' : 'Add New Category'}
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
              Category Title <span className="text-red-500">*</span>
            </label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Introduction to AI"
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
              placeholder="Enter category description..."
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Display Order
            </label>
            <Input
              type="number"
              value={formData.order_index}
              onChange={(e) => setFormData({ ...formData, order_index: parseInt(e.target.value) || 0 })}
              min="0"
            />
            <p className="text-xs text-gray-500 mt-1">Lower numbers appear first</p>
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
              {loading ? 'Saving...' : category ? 'Update Category' : 'Create Category'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
