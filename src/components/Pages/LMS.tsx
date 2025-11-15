import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Plus, BookOpen, FolderOpen, PlayCircle, FileText, Edit, Trash2, ArrowLeft, X, Clock, Users, Award, Star, Eye, Download } from 'lucide-react'
import { PageHeader } from '@/components/Common/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { supabase } from '@/lib/supabase'
import { CourseModal } from '@/components/LMS/CourseModal'
import { CategoryModal } from '@/components/LMS/CategoryModal'
import { LessonModal } from '@/components/LMS/LessonModal'
import { formatCurrency } from '@/lib/utils'
import { linkifyText } from '@/lib/linkify'
import { useAuth } from '@/contexts/AuthContext'
import { PermissionGuard } from '@/components/Common/PermissionGuard'

interface Course {
  id: string
  course_id: string
  title: string
  description: string
  thumbnail_url?: string
  instructor: string
  duration?: string
  level: string
  status: string
  price: number
  created_at: string
}

interface Category {
  id: string
  course_id: string
  title: string
  description?: string
  order_index: number
  created_at: string
}

interface Lesson {
  id: string
  category_id: string
  title: string
  description?: string
  video_url?: string
  thumbnail_url?: string
  duration?: string
  order_index: number
  is_free: boolean
  created_at: string
}

interface Attachment {
  id: string
  lesson_id: string
  file_name: string
  file_url: string
  file_type?: string
  file_size?: string
  created_at: string
}

type View = 'courses' | 'categories' | 'lessons' | 'lesson-detail' | 'add-lesson' | 'edit-lesson' | 'add-course' | 'edit-course' | 'add-category' | 'edit-category'

export function LMS() {
  const { canCreate, canUpdate, canDelete } = useAuth()
  const [view, setView] = useState<View>('courses')
  const [courses, setCourses] = useState<Course[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null)
  const [loading, setLoading] = useState(true)

  const [showCourseModal, setShowCourseModal] = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [showLessonModal, setShowLessonModal] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)

  // Check if device is mobile
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    fetchCourses()
  }, [])

  useEffect(() => {
    if (selectedCourse) {
      fetchCategories(selectedCourse.id)
    }
  }, [selectedCourse])

  useEffect(() => {
    if (selectedCategory) {
      fetchLessons(selectedCategory.id)
    }
  }, [selectedCategory])

  useEffect(() => {
    if (selectedLesson) {
      fetchAttachments(selectedLesson.id)
    }
  }, [selectedLesson])

  const fetchCourses = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setCourses(data || [])
    } catch (err) {
      console.error('Error fetching courses:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async (courseId: string) => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('course_id', courseId)
        .order('order_index', { ascending: true })

      if (error) throw error

      const categoriesWithLessons = await Promise.all(
        (data || []).map(async (category) => {
          const { data: lessonsData } = await supabase
            .from('lessons')
            .select('*')
            .eq('category_id', category.id)
            .order('order_index', { ascending: true })

          return {
            ...category,
            lessons: lessonsData || []
          }
        })
      )

      setCategories(categoriesWithLessons as any)
    } catch (err) {
      console.error('Error fetching categories:', err)
    }
  }

  const fetchLessons = async (categoryId: string) => {
    try {
      const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('category_id', categoryId)
        .order('order_index', { ascending: true })

      if (error) throw error
      setLessons(data || [])
    } catch (err) {
      console.error('Error fetching lessons:', err)
    }
  }

  const fetchAttachments = async (lessonId: string) => {
    try {
      const { data, error } = await supabase
        .from('lesson_attachments')
        .select('*')
        .eq('lesson_id', lessonId)
        .order('created_at', { ascending: true })

      if (error) throw error
      setAttachments(data || [])
    } catch (err) {
      console.error('Error fetching attachments:', err)
    }
  }

  const handleDeleteCourse = async (id: string) => {
    if (!confirm('Are you sure? This will delete all categories and lessons in this course.')) return

    try {
      const { error } = await supabase.from('courses').delete().eq('id', id)
      if (error) throw error
      fetchCourses()
    } catch (err) {
      console.error('Error deleting course:', err)
      alert('Failed to delete course')
    }
  }

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Are you sure? This will delete all lessons in this category.')) return

    try {
      const { error } = await supabase.from('categories').delete().eq('id', id)
      if (error) throw error
      if (selectedCourse) fetchCategories(selectedCourse.id)
    } catch (err) {
      console.error('Error deleting category:', err)
      alert('Failed to delete category')
    }
  }

  const handleDeleteLesson = async (id: string) => {
    if (!confirm('Are you sure? This will delete all attachments for this lesson.')) return

    try {
      const { error } = await supabase.from('lessons').delete().eq('id', id)
      if (error) throw error
      if (selectedCourse) fetchCategories(selectedCourse.id)
    } catch (err) {
      console.error('Error deleting lesson:', err)
      alert('Failed to delete lesson')
    }
  }

  const handleDeleteAttachment = async (id: string) => {
    if (!confirm('Are you sure you want to delete this attachment?')) return

    try {
      const { error } = await supabase.from('lesson_attachments').delete().eq('id', id)
      if (error) throw error
      if (selectedLesson) fetchAttachments(selectedLesson.id)
    } catch (err) {
      console.error('Error deleting attachment:', err)
      alert('Failed to delete attachment')
    }
  }

  const handleViewCourse = (course: Course) => {
    setSelectedCourse(course)
    setSelectedCategory(null)
    setSelectedLesson(null)
    setView('categories')
  }


  const handleBackToCourses = () => {
    setSelectedCourse(null)
    setSelectedCategory(null)
    setSelectedLesson(null)
    setView('courses')
  }

  const handleBackToCategories = () => {
    setSelectedCategory(null)
    setSelectedLesson(null)
    setView('categories')
  }

  const handleViewLesson = async (lesson: Lesson) => {
    setSelectedLesson(lesson)
    await fetchAttachments(lesson.id)
    setView('lesson-detail')
  }

  const getEmbedUrl = (url: string) => {
    if (!url) return null

    if (url.includes('youtube.com/watch?v=')) {
      const videoId = url.split('v=')[1]?.split('&')[0]
      return `https://www.youtube.com/embed/${videoId}`
    }

    if (url.includes('youtu.be/')) {
      const videoId = url.split('youtu.be/')[1]?.split('?')[0]
      return `https://www.youtube.com/embed/${videoId}`
    }

    if (url.includes('vimeo.com/')) {
      const videoId = url.split('vimeo.com/')[1]?.split('?')[0]
      return `https://player.vimeo.com/video/${videoId}`
    }

    if (url.match(/\.(mp4|webm|ogg)$/i)) {
      return url
    }

    return null
  }

  const renderCourses = () => (
    <div className="space-y-6">
      {/* Mobile Header */}
      <div className="md:hidden bg-gradient-to-r from-blue-600 to-green-600 -mx-4 -mt-6 px-4 py-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Courses</h2>
            <p className="text-blue-100 text-sm mt-1">{courses.length} courses available</p>
          </div>
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden md:flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">All Courses</h2>
          <p className="text-gray-600 mt-1">Manage your course library</p>
        </div>
        <PermissionGuard module="lms" action="insert">
          <Button
            onClick={() => {
              setEditingItem(null)
              setView('add-course')
            }}
            className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Course
          </Button>
        </PermissionGuard>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading courses...</div>
      ) : courses.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12 text-gray-500">
            No courses yet. Create your first course!
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {courses.map((course, index) => {
            const statusColors = {
              'Published': 'bg-green-100 text-green-800',
              'Draft': 'bg-yellow-100 text-yellow-800',
              'Archived': 'bg-gray-100 text-gray-800',
              'Under Review': 'bg-blue-100 text-blue-800'
            }

            const levelColors = {
              'Beginner': 'bg-green-100 text-green-800',
              'Intermediate': 'bg-yellow-100 text-yellow-800',
              'Advanced': 'bg-red-100 text-red-800'
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
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * index }}
                className="h-full"
              >
                <Card
                  className="shadow-lg hover:shadow-xl transition-all duration-300 h-full flex flex-col overflow-hidden active:scale-98 md:hover:scale-102"
                  onClick={() => handleViewCourse(course)}
                >
                  <div className="relative">
                    {course.thumbnail_url ? (
                      <img
                        src={course.thumbnail_url}
                        alt={course.title}
                        className="w-full h-40 md:h-48 object-cover"
                      />
                    ) : (
                      <div className="w-full h-40 md:h-48 bg-gradient-to-br from-blue-100 to-green-100 flex items-center justify-center">
                        <BookOpen className="w-12 h-12 md:w-16 md:h-16 text-gray-400" />
                      </div>
                    )}
                    <div className="absolute top-2 md:top-4 right-2 md:right-4 flex gap-2">
                      <Badge className={`text-xs ${statusColors[course.status] || 'bg-gray-100 text-gray-800'}`}>
                        {course.status}
                      </Badge>
                    </div>
                    <div className="absolute top-2 md:top-4 left-2 md:left-4">
                      <Badge className={`text-xs ${levelColors[course.level] || 'bg-gray-100 text-gray-800'}`}>
                        {course.level}
                      </Badge>
                    </div>
                  </div>

                  <CardContent className="p-4 md:p-6 flex-1 flex flex-col">
                    <div className="flex-1">
                      <h3 className="text-lg md:text-xl font-bold text-brand-text mb-2 line-clamp-2">
                        {course.title}
                      </h3>

                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {course.description}
                      </p>

                      <div className="flex flex-wrap gap-3 mb-3 text-xs md:text-sm text-gray-600">
                        {course.duration && (
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 md:w-4 md:h-4 text-gray-400" />
                            <span>{course.duration}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 md:w-4 md:h-4 text-gray-400" />
                          <span className="hidden md:inline">Course ID: </span>
                          <span>{course.course_id}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mb-3">
                        <div className="text-xl md:text-2xl font-bold text-brand-primary">
                          {formatCurrency(course.price)}
                        </div>
                        <div className="text-xs md:text-sm text-gray-500 line-clamp-1">
                          by {course.instructor}
                        </div>
                      </div>
                    </div>

                    {/* Desktop Actions */}
                    <div className="hidden md:flex items-center space-x-2 pt-4 border-t">
                      <Button
                        size="sm"
                        variant="default"
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleViewCourse(course)
                        }}
                      >
                        <FolderOpen className="w-4 h-4 mr-2" />
                        <span>View</span>
                      </Button>
                      {canUpdate('lms') && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditingItem(course)
                            setView('edit-course')
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      )}
                      {canDelete('lms') && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteCourse(course.id)
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )

  const renderCategories = () => (
    <div className="space-y-4 md:space-y-6">
      {/* Mobile Header */}
      <div className="md:hidden bg-gradient-to-r from-blue-600 to-green-600 -mx-4 -mt-6 px-4 py-4 mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBackToCourses}
          className="text-white hover:bg-white/20 mb-3 -ml-2"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div className="flex items-center justify-between">
          <div className="flex-1 pr-2">
            <h2 className="text-xl font-bold text-white line-clamp-1">{selectedCourse?.title}</h2>
            <p className="text-blue-100 text-sm mt-1">{categories.length} categories</p>
          </div>
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden md:flex items-center space-x-4">
        <Button variant="outline" onClick={handleBackToCourses}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Courses
        </Button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-900">{selectedCourse?.title}</h2>
          <p className="text-gray-600 mt-1">Manage course categories and modules</p>
        </div>
        <PermissionGuard module="lms" action="insert">
          <Button
            onClick={() => {
              setEditingItem(null)
              setView('add-category')
            }}
            className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Category
          </Button>
        </PermissionGuard>
      </div>

      {categories.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12 text-gray-500">
            No categories yet. Create your first category!
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3 md:space-y-6">
          {categories.map((category: any, categoryIndex) => (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: categoryIndex * 0.05 }}
            >
              <Card className="overflow-hidden">
                <CardContent className="p-4 md:p-6">
                  {/* Mobile Layout */}
                  <div className="md:hidden">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3 flex-1">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
                          <span className="text-white font-bold">
                            {categoryIndex + 1}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-bold text-gray-900 line-clamp-1">
                            {category.title}
                          </h3>
                          {category.description && (
                            <p className="text-xs text-gray-600 line-clamp-1">{category.description}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Desktop Layout */}
                  <div className="hidden md:block">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
                          <span className="text-white font-bold text-lg">
                            {categoryIndex + 1}
                          </span>
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">
                            {category.title}
                          </h3>
                          {category.description && (
                            <p className="text-sm text-gray-600">{category.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {canCreate('lms') && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedCategory(category)
                              setEditingItem(null)
                              setView('add-lesson')
                            }}
                            className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Lesson
                          </Button>
                        )}
                        {canUpdate('lms') && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingItem(category)
                              setView('edit-category')
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        )}
                        {canDelete('lms') && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteCategory(category.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {category.lessons && category.lessons.length > 0 && (
                    <div className="md:ml-15 space-y-2">
                      {category.lessons.map((lesson: Lesson) => (
                        <div
                          key={lesson.id}
                          onClick={() => handleViewLesson(lesson)}
                          className="flex items-center justify-between p-3 md:p-4 bg-gray-50 hover:bg-gray-100 active:bg-gray-200 rounded-lg cursor-pointer transition-colors group"
                        >
                          <div className="flex items-center space-x-2 md:space-x-3 flex-1 min-w-0">
                            <div className="w-8 h-8 md:w-10 md:h-10 bg-white rounded-lg flex items-center justify-center border-2 border-gray-200 group-hover:border-blue-500 transition-colors flex-shrink-0">
                              <PlayCircle className="w-4 h-4 md:w-5 md:h-5 text-gray-600 group-hover:text-blue-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2">
                                <span className="font-medium text-sm md:text-base text-gray-900 line-clamp-1">
                                  {lesson.title}
                                </span>
                                {lesson.is_free && (
                                  <Badge className="bg-blue-100 text-blue-800 text-xs flex-shrink-0">
                                    Free
                                  </Badge>
                                )}
                              </div>
                              {lesson.duration && (
                                <span className="text-xs md:text-sm text-gray-500">
                                  {lesson.duration}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="hidden md:flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                            {canUpdate('lms') && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setSelectedLesson(lesson)
                                  setSelectedCategory(category)
                                  setEditingItem(lesson)
                                  setView('edit-lesson')
                                }}
                                className="h-9 w-9"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            )}
                            {canDelete('lms') && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteLesson(lesson.id)}
                                className="text-red-600 hover:text-red-700 h-9 w-9"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {(!category.lessons || category.lessons.length === 0) && (
                    <div className="md:ml-15 p-3 md:p-4 bg-gray-50 rounded-lg text-center text-gray-500 text-xs md:text-sm">
                      No lessons yet. Click "Add Lesson" to create your first lesson.
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )

  const renderLessons = () => (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="outline" onClick={handleBackToCategories}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Categories
        </Button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-900">{selectedCategory?.title}</h2>
          <p className="text-gray-600 mt-1">Manage lessons in this category</p>
        </div>
        <Button
          onClick={() => {
            setEditingItem(null)
            setSelectedLesson(null)
            setShowLessonModal(true)
          }}
          className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Lesson
        </Button>
      </div>

      {lessons.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12 text-gray-500">
            No lessons yet. Create your first lesson!
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {lessons.map((lesson, index) => (
            <motion.div
              key={lesson.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                          <PlayCircle className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">{lesson.title}</h3>
                          {lesson.duration && (
                            <span className="text-sm text-gray-500">{lesson.duration}</span>
                          )}
                        </div>
                        {lesson.is_free && (
                          <Badge className="bg-blue-100 text-blue-800">Free Preview</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {canUpdate('lms') && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingItem(lesson)
                            setSelectedLesson(lesson)
                            setShowLessonModal(true)
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      )}
                      {canDelete('lms') && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteLesson(lesson.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {lesson.description && (
                    <p className="text-gray-600 mb-4 ml-13">{lesson.description}</p>
                  )}

                  {lesson.video_url && (
                    <div className="mb-4 ml-13">
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <PlayCircle className="w-4 h-4" />
                        <a href={lesson.video_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          {lesson.video_url}
                        </a>
                      </div>
                    </div>
                  )}

                  {selectedLesson?.id === lesson.id && attachments.length > 0 && (
                    <div className="ml-13 mt-4 p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-semibold text-gray-900 mb-3">Attachments</h4>
                      <div className="space-y-2">
                        {attachments.map((attachment) => (
                          <div key={attachment.id} className="flex items-center justify-between p-2 bg-white rounded border">
                            <div className="flex items-center space-x-3">
                              <FileText className="w-5 h-5 text-gray-400" />
                              <div>
                                <a href={attachment.file_url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-blue-600 hover:underline">
                                  {attachment.file_name}
                                </a>
                                {attachment.file_size && (
                                  <span className="text-xs text-gray-500 ml-2">({attachment.file_size})</span>
                                )}
                              </div>
                            </div>
                            {canDelete('lms') && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteAttachment(attachment.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )

  const renderLessonDetail = () => {
    if (!selectedLesson) return null

    const embedUrl = getEmbedUrl(selectedLesson.video_url || '')
    const isDirectVideo = selectedLesson.video_url?.match(/\.(mp4|webm|ogg)$/i)

    return (
      <div className="space-y-4 md:space-y-6">
        {/* Mobile Header */}
        <div className="md:hidden bg-gradient-to-r from-blue-600 to-green-600 -mx-4 -mt-6 px-4 py-4 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToCategories}
            className="text-white hover:bg-white/20 mb-3 -ml-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h2 className="text-xl font-bold text-white line-clamp-2">{selectedLesson.title}</h2>
            {selectedLesson.duration && (
              <p className="text-blue-100 text-sm mt-1 flex items-center">
                <Clock className="w-3.5 h-3.5 mr-1" />
                {selectedLesson.duration}
              </p>
            )}
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden md:flex items-center space-x-4">
          <Button variant="outline" onClick={handleBackToCategories}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Course
          </Button>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900">{selectedLesson.title}</h2>
            {selectedLesson.duration && (
              <p className="text-gray-600 mt-1 flex items-center">
                <Clock className="w-4 h-4 mr-1" />
                {selectedLesson.duration}
              </p>
            )}
          </div>
        </div>

        {selectedLesson.thumbnail_url && !selectedLesson.video_url && (
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="aspect-video bg-gradient-to-br from-blue-100 to-green-100">
                <img
                  src={selectedLesson.thumbnail_url}
                  alt={selectedLesson.title}
                  className="w-full h-full object-cover"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {selectedLesson.video_url && embedUrl && (
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="aspect-video bg-black">
                {isDirectVideo ? (
                  <video
                    controls
                    className="w-full h-full"
                    src={embedUrl}
                    poster={selectedLesson.thumbnail_url}
                  >
                    Your browser does not support the video tag.
                  </video>
                ) : (
                  <iframe
                    src={embedUrl}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {selectedLesson.description && (
          <Card>
            <CardContent className="p-4 md:p-6">
              <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-3">
                About this Lesson
              </h3>
              <div className="text-sm md:text-base text-gray-700 whitespace-pre-wrap">
                {linkifyText(selectedLesson.description)}
              </div>
            </CardContent>
          </Card>
        )}

        {attachments.length > 0 && (
          <Card>
            <CardContent className="p-4 md:p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Course Materials
              </h3>
              <div className="space-y-3">
                {attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center space-x-3 flex-1">
                      <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border-2 border-gray-200">
                        <FileText className="w-5 h-5 text-gray-600" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">
                          {attachment.file_name}
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                          {attachment.file_type && (
                            <span>{attachment.file_type}</span>
                          )}
                          {attachment.file_size && (
                            <>
                              <span>•</span>
                              <span>{attachment.file_size}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(attachment.file_url, '_blank')}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Learning Management System"
        subtitle="Create and manage your courses, categories, and lessons"
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-8"
      >
        {view === 'courses' && renderCourses()}
        {view === 'categories' && renderCategories()}
        {view === 'lessons' && renderLessons()}
        {view === 'lesson-detail' && renderLessonDetail()}
        {(view === 'add-lesson' || view === 'edit-lesson') && selectedCategory && (
          <LessonModal
            isOpen={true}
            onClose={() => {
              setView('categories')
              setEditingItem(null)
              setSelectedLesson(null)
            }}
            categoryId={selectedCategory.id}
            lesson={view === 'edit-lesson' ? editingItem : null}
            onSuccess={() => {
              setView('categories')
              if (selectedCourse) {
                fetchCategories(selectedCourse.id)
              }
            }}
          />
        )}
        {(view === 'add-course' || view === 'edit-course') && (
          <CourseModal
            isOpen={true}
            onClose={() => {
              setView('courses')
              setEditingItem(null)
            }}
            course={view === 'edit-course' ? editingItem : null}
            onSuccess={() => {
              setView('courses')
              fetchCourses()
            }}
          />
        )}
        {(view === 'add-category' || view === 'edit-category') && selectedCourse && (
          <CategoryModal
            isOpen={true}
            onClose={() => {
              setView('categories')
              setEditingItem(null)
            }}
            courseId={selectedCourse.id}
            category={view === 'edit-category' ? editingItem : null}
            onSuccess={() => {
              setView('categories')
              fetchCategories(selectedCourse.id)
            }}
          />
        )}
      </motion.div>
    </div>
  )
}
