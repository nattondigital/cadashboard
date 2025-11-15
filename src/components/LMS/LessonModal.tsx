import React, { useState, useEffect } from 'react'
import { X, Plus, Trash2, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { supabase } from '@/lib/supabase'

interface Lesson {
  id?: string
  title: string
  description?: string
  video_url?: string
  thumbnail_url?: string
  duration?: string
  order_index: number
  is_free: boolean
}

interface Attachment {
  id?: string
  file_name: string
  file_url: string
  file_type?: string
  file_size?: string
}

interface LessonModalProps {
  isOpen: boolean
  onClose: () => void
  categoryId: string
  lesson?: Lesson | null
  onSuccess: () => void
}

export function LessonModal({ isOpen, onClose, categoryId, lesson, onSuccess }: LessonModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    video_url: '',
    thumbnail_url: '',
    duration: '',
    order_index: 0,
    is_free: false
  })
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [newAttachment, setNewAttachment] = useState({
    file_name: '',
    file_url: '',
    file_type: '',
    file_size: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (lesson) {
      setFormData({
        title: lesson.title,
        description: lesson.description || '',
        video_url: lesson.video_url || '',
        thumbnail_url: lesson.thumbnail_url || '',
        duration: lesson.duration || '',
        order_index: lesson.order_index,
        is_free: lesson.is_free
      })
      if (lesson.id) {
        fetchAttachments(lesson.id)
      }
    } else {
      fetchNextOrderIndex()
      setAttachments([])
      setFormData({
        title: '',
        description: '',
        video_url: '',
        thumbnail_url: '',
        duration: '',
        order_index: 0,
        is_free: false
      })
    }
    setError('')
    setNewAttachment({ file_name: '', file_url: '', file_type: '', file_size: '' })
  }, [lesson, isOpen, categoryId])

  const fetchNextOrderIndex = async () => {
    const { data, error } = await supabase
      .from('lessons')
      .select('order_index')
      .eq('category_id', categoryId)
      .order('order_index', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!error && data) {
      setFormData(prev => ({ ...prev, order_index: data.order_index + 1 }))
    } else {
      setFormData(prev => ({ ...prev, order_index: 1 }))
    }
  }

  const fetchAttachments = async (lessonId: string) => {
    const { data, error } = await supabase
      .from('lesson_attachments')
      .select('*')
      .eq('lesson_id', lessonId)

    if (!error && data) {
      setAttachments(data)
    }
  }

  const handleAddAttachment = () => {
    if (!newAttachment.file_name || !newAttachment.file_url) {
      setError('File name and URL are required for attachments')
      return
    }

    setAttachments([...attachments, { ...newAttachment }])
    setNewAttachment({ file_name: '', file_url: '', file_type: '', file_size: '' })
    setError('')
  }

  const handleRemoveAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index))
  }

  const handleDeleteExistingAttachment = async (attachmentId: string) => {
    try {
      const { error } = await supabase
        .from('lesson_attachments')
        .delete()
        .eq('id', attachmentId)

      if (error) throw error

      setAttachments(attachments.filter(a => a.id !== attachmentId))
    } catch (err) {
      console.error('Error deleting attachment:', err)
      setError('Failed to delete attachment')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.title) {
      setError('Lesson title is required')
      return
    }

    try {
      setLoading(true)

      let lessonId = lesson?.id

      if (lesson?.id) {
        const { error: updateError } = await supabase
          .from('lessons')
          .update({
            title: formData.title,
            description: formData.description || null,
            video_url: formData.video_url || null,
            thumbnail_url: formData.thumbnail_url || null,
            duration: formData.duration || null,
            order_index: formData.order_index,
            is_free: formData.is_free
          })
          .eq('id', lesson.id)

        if (updateError) throw updateError
      } else {
        const { data: insertData, error: insertError } = await supabase
          .from('lessons')
          .insert({
            category_id: categoryId,
            title: formData.title,
            description: formData.description || null,
            video_url: formData.video_url || null,
            thumbnail_url: formData.thumbnail_url || null,
            duration: formData.duration || null,
            order_index: formData.order_index,
            is_free: formData.is_free
          })
          .select()
          .single()

        if (insertError) throw insertError
        lessonId = insertData.id
      }

      const newAttachments = attachments.filter(a => !a.id)
      if (newAttachments.length > 0 && lessonId) {
        const attachmentsToInsert = newAttachments.map(a => ({
          lesson_id: lessonId,
          file_name: a.file_name,
          file_url: a.file_url,
          file_type: a.file_type || null,
          file_size: a.file_size || null
        }))

        const { error: attachError } = await supabase
          .from('lesson_attachments')
          .insert(attachmentsToInsert)

        if (attachError) throw attachError
      }

      onSuccess()
      onClose()
    } catch (err: any) {
      console.error('Error saving lesson:', err)
      setError(err.message || 'Failed to save lesson')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 md:bg-transparent md:relative flex items-center justify-center z-50 p-0 md:p-0">
      <div className="bg-white rounded-none md:rounded-lg shadow-xl w-full h-full md:max-w-3xl md:w-full md:max-h-[90vh] overflow-y-auto md:shadow-none md:bg-transparent">
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-green-600 md:bg-white md:border-b px-4 md:px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl md:text-2xl font-bold text-white md:text-gray-900">
            {lesson ? 'Edit Lesson' : 'Add New Lesson'}
          </h2>
          <button onClick={onClose} className="text-white md:text-gray-400 hover:text-blue-100 md:hover:text-gray-600">
            <X className="w-5 h-5 md:w-6 md:h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4 md:space-y-6 bg-white">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Lesson Title <span className="text-red-500">*</span>
            </label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Introduction to Machine Learning"
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
              placeholder="Enter lesson description..."
              rows={4}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Video URL
            </label>
            <Input
              value={formData.video_url}
              onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
              placeholder="https://www.youtube.com/watch?v=... or Vimeo URL"
            />
            <p className="text-xs text-gray-500 mt-1">Supports YouTube, Vimeo, and direct video URLs</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Thumbnail URL
            </label>
            <Input
              value={formData.thumbnail_url}
              onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
              placeholder="https://example.com/thumbnail.jpg"
            />
            <p className="text-xs text-gray-500 mt-1">Preview image for the lesson</p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duration
              </label>
              <Input
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                placeholder="e.g., 15 min"
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
            </div>

            <div className="flex items-end">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_free}
                  onChange={(e) => setFormData({ ...formData, is_free: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Free Preview</span>
              </label>
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Attachments</h3>

            {attachments.length > 0 && (
              <div className="space-y-2 mb-4">
                {attachments.map((attachment, index) => (
                  <div key={attachment.id || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3 flex-1">
                      <FileText className="w-5 h-5 text-gray-400" />
                      <div className="flex-1">
                        <div className="font-medium text-sm">{attachment.file_name}</div>
                        <a href={attachment.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline truncate block">
                          {attachment.file_url}
                        </a>
                        {attachment.file_size && (
                          <span className="text-xs text-gray-500">Size: {attachment.file_size}</span>
                        )}
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => attachment.id ? handleDeleteExistingAttachment(attachment.id) : handleRemoveAttachment(index)}
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    File Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={newAttachment.file_name}
                    onChange={(e) => setNewAttachment({ ...newAttachment, file_name: e.target.value })}
                    placeholder="e.g., Course_Notes.pdf"
                    size="sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    File URL <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={newAttachment.file_url}
                    onChange={(e) => setNewAttachment({ ...newAttachment, file_url: e.target.value })}
                    placeholder="https://..."
                    size="sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    File Type
                  </label>
                  <Input
                    value={newAttachment.file_type}
                    onChange={(e) => setNewAttachment({ ...newAttachment, file_type: e.target.value })}
                    placeholder="e.g., PDF, DOCX, ZIP"
                    size="sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    File Size
                  </label>
                  <Input
                    value={newAttachment.file_size}
                    onChange={(e) => setNewAttachment({ ...newAttachment, file_size: e.target.value })}
                    placeholder="e.g., 2.5 MB"
                    size="sm"
                  />
                </div>
              </div>
              <Button
                type="button"
                onClick={handleAddAttachment}
                variant="outline"
                size="sm"
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Attachment
              </Button>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700"
            >
              {loading ? 'Saving...' : lesson ? 'Update Lesson' : 'Create Lesson'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
