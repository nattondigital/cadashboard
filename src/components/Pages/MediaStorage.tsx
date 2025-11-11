import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Folder, File, Plus, Upload, FolderPlus, Trash2, Download, Eye, MoreVertical, ArrowLeft, Search, Grid, List, Filter, X, ChevronRight } from 'lucide-react'
import { PageHeader } from '@/components/Common/PageHeader'
import { KPICard } from '@/components/Common/KPICard'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { supabase } from '@/lib/supabase'
import { formatDate } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { PermissionGuard } from '@/components/Common/PermissionGuard'

interface MediaFolder {
  id: string
  folder_name: string
  ghl_folder_id: string | null
  parent_id: string | null
  location_id: string
  created_at: string
  updated_at: string
}

interface MediaFile {
  id: string
  file_name: string
  file_url: string
  file_type: string | null
  file_size: number | null
  ghl_file_id: string | null
  folder_id: string | null
  location_id: string
  thumbnail_url: string | null
  uploaded_by: string | null
  created_at: string
  updated_at: string
}

export function MediaStorage() {
  const { canCreate, canDelete } = useAuth()
  const [folders, setFolders] = useState<MediaFolder[]>([])
  const [files, setFiles] = useState<MediaFile[]>([])
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string | null; name: string }[]>([{ id: null, name: 'Root' }])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false)
  const [showUploadFileModal, setShowUploadFileModal] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [folderName, setFolderName] = useState('')
  const [creating, setCreating] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [totalFilesCount, setTotalFilesCount] = useState(0)
  const [totalStorageSize, setTotalStorageSize] = useState(0)

  useEffect(() => {
    loadMediaItems()
    if (currentFolderId === null) {
      loadTotalStats()
    }
  }, [currentFolderId])

  const loadMediaItems = async () => {
    setLoading(true)
    try {
      let foldersQuery = supabase
        .from('media_folders')
        .select('*')

      if (currentFolderId === null) {
        foldersQuery = foldersQuery.is('parent_id', null)
      } else {
        foldersQuery = foldersQuery.eq('parent_id', currentFolderId)
      }

      const { data: foldersData, error: foldersError } = await foldersQuery
        .order('folder_name', { ascending: true })

      if (foldersError) throw foldersError
      setFolders(foldersData || [])

      let filesQuery = supabase
        .from('media_files')
        .select('*')

      if (currentFolderId === null) {
        filesQuery = filesQuery.is('folder_id', null)
      } else {
        filesQuery = filesQuery.eq('folder_id', currentFolderId)
      }

      const { data: filesData, error: filesError } = await filesQuery
        .order('file_name', { ascending: true })

      if (filesError) throw filesError
      setFiles(filesData || [])
    } catch (error) {
      console.error('Error loading media items:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadTotalStats = async () => {
    try {
      const { data: allFiles, error } = await supabase
        .from('media_files')
        .select('file_size')

      if (error) throw error

      const totalFiles = allFiles?.length || 0
      const totalStorage = allFiles?.reduce((acc, file) => acc + (file.file_size || 0), 0) || 0

      setTotalFilesCount(totalFiles)
      setTotalStorageSize(totalStorage)
    } catch (error) {
      console.error('Error loading total stats:', error)
    }
  }

  const navigateToFolder = async (folderId: string | null, folderName: string) => {
    if (folderId === currentFolderId) return

    setCurrentFolderId(folderId)

    if (folderId === null) {
      setBreadcrumbs([{ id: null, name: 'Root' }])
    } else {
      const folderIndex = breadcrumbs.findIndex(b => b.id === folderId)
      if (folderIndex !== -1) {
        setBreadcrumbs(breadcrumbs.slice(0, folderIndex + 1))
      } else {
        setBreadcrumbs([...breadcrumbs, { id: folderId, name: folderName }])
      }
    }
  }

  const createFolder = async () => {
    if (!folderName.trim()) return

    setCreating(true)
    try {
      const { data: integration, error: integrationError } = await supabase
        .from('integrations')
        .select('config')
        .eq('integration_type', 'ghl_api')
        .maybeSingle()

      if (integrationError) {
        console.error('Integration fetch error:', integrationError)
        throw new Error('Failed to fetch integration settings')
      }

      if (!integration) {
        alert('GHL API integration not found. Please configure it in Settings > Integrations first.')
        return
      }

      const accessToken = integration?.config?.accessToken
      if (!accessToken || accessToken.trim() === '') {
        alert('GHL Access Token is not configured. Please add your access token in Settings > Integrations > GHL API.')
        return
      }

      const locationId = integration?.config?.locationId || 'iDIRFjdZBWH7SqBzTowc'
      if (!locationId || locationId.trim() === '') {
        alert('GHL Location ID is not configured. Please add your Location ID in Settings > Integrations > GHL API.')
        return
      }

      const requestBody: any = {
        altId: locationId,
        altType: 'location',
        name: folderName.trim()
      }

      if (currentFolderId) {
        const { data: parentFolder } = await supabase
          .from('media_folders')
          .select('ghl_folder_id')
          .eq('id', currentFolderId)
          .maybeSingle()

        if (parentFolder?.ghl_folder_id) {
          requestBody.parentId = parentFolder.ghl_folder_id
        }
      }

      console.log('Creating folder with request:', {
        ...requestBody,
        tokenLength: accessToken.length,
        tokenPreview: `${accessToken.substring(0, 10)}...`
      })

      const response = await fetch('https://services.leadconnectorhq.com/medias/folder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Version': '2021-07-28',
          'Authorization': `Bearer ${accessToken.trim()}`
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        let errorMessage = 'Failed to create folder in GHL'
        try {
          const errorData = await response.json()
          errorMessage = errorData.message || errorData.error || errorMessage
          console.error('GHL API Error:', errorData)
        } catch (e) {
          const errorText = await response.text()
          console.error('GHL API Error (text):', errorText)
          errorMessage = errorText || errorMessage
        }
        throw new Error(`${errorMessage} (Status: ${response.status})`)
      }

      const ghlFolder = await response.json()
      console.log('GHL folder created:', ghlFolder)

      const { error: insertError } = await supabase
        .from('media_folders')
        .insert([{
          folder_name: folderName.trim(),
          ghl_folder_id: ghlFolder._id || ghlFolder.id,
          parent_id: currentFolderId,
          location_id: locationId
        }])

      if (insertError) throw insertError

      setFolderName('')
      setShowCreateFolderModal(false)
      await loadMediaItems()
      alert('Folder created successfully!')
    } catch (error: any) {
      console.error('Error creating folder:', error)
      alert(`Failed to create folder: ${error.message}`)
    } finally {
      setCreating(false)
    }
  }

  const uploadFile = async () => {
    if (!selectedFile) {
      alert('Please select a file to upload')
      return
    }

    if (currentFolderId === null) {
      alert('Files can only be uploaded to folders. Please navigate to a folder first.')
      return
    }

    setUploading(true)
    try {
      const { data: integration, error: integrationError } = await supabase
        .from('integrations')
        .select('config')
        .eq('integration_type', 'ghl_api')
        .maybeSingle()

      if (integrationError) {
        console.error('Integration fetch error:', integrationError)
        throw new Error('Failed to fetch integration settings')
      }

      if (!integration) {
        alert('GHL API integration not found. Please configure it in Settings > Integrations first.')
        return
      }

      const accessToken = integration?.config?.accessToken
      if (!accessToken || accessToken.trim() === '') {
        alert('GHL Access Token is not configured. Please add your access token in Settings > Integrations > GHL API.')
        return
      }

      const locationId = integration?.config?.locationId || 'iDIRFjdZBWH7SqBzTowc'
      if (!locationId || locationId.trim() === '') {
        alert('GHL Location ID is not configured. Please add your Location ID in Settings > Integrations > GHL API.')
        return
      }

      let ghlParentId = null
      if (currentFolderId) {
        const { data: currentFolder } = await supabase
          .from('media_folders')
          .select('ghl_folder_id')
          .eq('id', currentFolderId)
          .maybeSingle()

        if (currentFolder?.ghl_folder_id) {
          ghlParentId = currentFolder.ghl_folder_id
        }
      }

      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('name', selectedFile.name)
      if (ghlParentId) {
        formData.append('parentId', ghlParentId)
      }

      console.log('Uploading file:', {
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        fileType: selectedFile.type,
        parentId: ghlParentId,
        tokenLength: accessToken.length
      })

      const response = await fetch('https://services.leadconnectorhq.com/medias/upload-file', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Version': '2021-07-28',
          'Authorization': `Bearer ${accessToken.trim()}`
        },
        body: formData
      })

      if (!response.ok) {
        let errorMessage = 'Failed to upload file to GHL'
        try {
          const errorData = await response.json()
          errorMessage = errorData.message || errorData.error || errorMessage
          console.error('GHL API Error:', errorData)
        } catch (e) {
          const errorText = await response.text()
          console.error('GHL API Error (text):', errorText)
          errorMessage = errorText || errorMessage
        }
        throw new Error(`${errorMessage} (Status: ${response.status})`)
      }

      const ghlFile = await response.json()
      console.log('GHL file uploaded:', ghlFile)

      const { error: insertError } = await supabase
        .from('media_files')
        .insert([{
          file_name: selectedFile.name,
          file_url: ghlFile.url || ghlFile.fileUrl || '',
          file_type: selectedFile.type,
          file_size: selectedFile.size,
          ghl_file_id: ghlFile._id || ghlFile.id,
          folder_id: currentFolderId,
          location_id: locationId,
          thumbnail_url: ghlFile.thumbnailUrl || null
        }])

      if (insertError) throw insertError

      setSelectedFile(null)
      setShowUploadFileModal(false)
      await loadMediaItems()
      alert('File uploaded successfully!')
    } catch (error: any) {
      console.error('Error uploading file:', error)
      alert(`Failed to upload file: ${error.message}`)
    } finally {
      setUploading(false)
    }
  }

  const deleteFolder = async (folder: MediaFolder) => {
    if (!confirm(`Are you sure you want to delete "${folder.folder_name}"? This will delete all contents.`)) return

    try {
      const { error } = await supabase
        .from('media_folders')
        .delete()
        .eq('id', folder.id)

      if (error) throw error
      await loadMediaItems()
    } catch (error) {
      console.error('Error deleting folder:', error)
      alert('Failed to delete folder')
    }
  }

  const deleteFile = async (file: MediaFile) => {
    if (!confirm(`Are you sure you want to delete "${file.file_name}"?`)) return

    try {
      const { error } = await supabase
        .from('media_files')
        .delete()
        .eq('id', file.id)

      if (error) throw error
      await loadMediaItems()
    } catch (error) {
      console.error('Error deleting file:', error)
      alert('Failed to delete file')
    }
  }

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown'
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  }

  const getFileIcon = (fileType: string | null) => {
    if (!fileType) return <File className="w-8 h-8 text-gray-400" />

    if (fileType.startsWith('image/')) return <File className="w-8 h-8 text-blue-500" />
    if (fileType.startsWith('video/')) return <File className="w-8 h-8 text-purple-500" />
    if (fileType.includes('pdf')) return <File className="w-8 h-8 text-red-500" />
    if (fileType.includes('document') || fileType.includes('word')) return <File className="w-8 h-8 text-blue-600" />
    if (fileType.includes('sheet') || fileType.includes('excel')) return <File className="w-8 h-8 text-green-600" />

    return <File className="w-8 h-8 text-gray-400" />
  }

  const filteredFolders = folders.filter(f =>
    f.folder_name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredFiles = files.filter(f =>
    f.file_name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalStorage = files.reduce((acc, file) => acc + (file.file_size || 0), 0)

  const displayFilesCount = currentFolderId === null ? totalFilesCount : files.length
  const displayStorageSize = currentFolderId === null ? totalStorageSize : totalStorage

  return (
    <>
      {/* Desktop View */}
      <div className="hidden md:block min-h-screen bg-gradient-to-br from-gray-50 to-white p-6">
        <PageHeader
          title="Media Storage"
          subtitle="Manage your files and folders stored in GoHighLevel"
        />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <KPICard
            title="Total Folders"
            value={folders.length.toString()}
            icon={Folder}
            category="primary"
          />
          <KPICard
            title={currentFolderId === null ? "Total Files (All Folders)" : "Files in Current Folder"}
            value={displayFilesCount.toString()}
            icon={File}
            category="success"
          />
          <KPICard
            title={currentFolderId === null ? "Total Storage (All Folders)" : "Storage in Current Folder"}
            value={formatFileSize(displayStorageSize)}
            icon={Upload}
            category="warning"
          />
          <KPICard
            title="Current Location"
            value={breadcrumbs[breadcrumbs.length - 1].name}
            icon={Folder}
            category="secondary"
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <Card className="shadow-xl">
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center space-x-2">
                  <CardTitle>Media Library</CardTitle>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative flex-1 md:flex-initial md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search files and folders..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                    >
                      {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
                    </Button>
                    {canCreate('media') && (
                      <Button
                        onClick={() => setShowUploadFileModal(true)}
                        variant="outline"
                        disabled={currentFolderId === null}
                        title={currentFolderId === null ? "Please navigate to a folder to upload files" : "Upload a file to this folder"}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Upload File
                      </Button>
                    )}
                    {canCreate('media') && (
                      <Button onClick={() => setShowCreateFolderModal(true)}>
                        <FolderPlus className="w-4 h-4 mr-2" />
                        New Folder
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex items-center space-x-2 text-sm text-gray-600">
                {breadcrumbs.map((crumb, index) => (
                  <React.Fragment key={crumb.id || 'root'}>
                    {index > 0 && <span>/</span>}
                    <button
                      onClick={() => navigateToFolder(crumb.id, crumb.name)}
                      className="hover:text-brand-primary transition-colors"
                    >
                      {crumb.name}
                    </button>
                  </React.Fragment>
                ))}
              </div>

              {loading ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">Loading...</p>
                </div>
              ) : (
                <>
                  {filteredFolders.length === 0 && filteredFiles.length === 0 ? (
                    <div className="text-center py-12">
                      <Folder className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                      <p className="text-gray-500">No items in this folder</p>
                      <p className="text-sm text-gray-400 mt-2">Create a folder or upload files to get started</p>
                    </div>
                  ) : (
                    <>
                      {viewMode === 'grid' ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                          {filteredFolders.map((folder) => (
                            <motion.div
                              key={folder.id}
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="group relative border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-all cursor-pointer"
                            >
                              <div
                                onClick={() => navigateToFolder(folder.id, folder.folder_name)}
                                className="flex flex-col items-center"
                              >
                                <Folder className="w-12 h-12 text-yellow-500 mb-2" />
                                <p className="text-sm font-medium text-center truncate w-full">{folder.folder_name}</p>
                              </div>
                              {canDelete('media') && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <MoreVertical className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent>
                                    <DropdownMenuItem onClick={() => deleteFolder(folder)}>
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </motion.div>
                          ))}

                          {filteredFiles.map((file) => (
                            <motion.div
                              key={file.id}
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="group relative border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-all"
                            >
                              <div className="flex flex-col items-center">
                                {file.thumbnail_url || file.file_type?.startsWith('image/') ? (
                                  <img
                                    src={file.thumbnail_url || file.file_url}
                                    alt={file.file_name}
                                    className="w-12 h-12 object-cover rounded mb-2"
                                  />
                                ) : (
                                  <div className="mb-2">{getFileIcon(file.file_type)}</div>
                                )}
                                <p className="text-sm font-medium text-center truncate w-full">{file.file_name}</p>
                                <p className="text-xs text-gray-500">{formatFileSize(file.file_size)}</p>
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                  <DropdownMenuItem onClick={() => window.open(file.file_url, '_blank')}>
                                    <Eye className="w-4 h-4 mr-2" />
                                    View
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => window.open(file.file_url, '_blank')}>
                                    <Download className="w-4 h-4 mr-2" />
                                    Download
                                  </DropdownMenuItem>
                                  {canDelete('media') && (
                                    <DropdownMenuItem onClick={() => deleteFile(file)}>
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </motion.div>
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {filteredFolders.map((folder) => (
                            <div
                              key={folder.id}
                              className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                              onClick={() => navigateToFolder(folder.id, folder.folder_name)}
                            >
                              <div className="flex items-center space-x-3">
                                <Folder className="w-6 h-6 text-yellow-500" />
                                <div>
                                  <p className="font-medium">{folder.folder_name}</p>
                                  <p className="text-sm text-gray-500">Folder • {formatDate(folder.created_at)}</p>
                                </div>
                              </div>
                              {canDelete('media') && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                    <Button variant="ghost" size="icon">
                                      <MoreVertical className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent>
                                    <DropdownMenuItem onClick={() => deleteFolder(folder)}>
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </div>
                          ))}

                          {filteredFiles.map((file) => (
                            <div
                              key={file.id}
                              className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                              <div className="flex items-center space-x-3">
                                {file.thumbnail_url || file.file_type?.startsWith('image/') ? (
                                  <img
                                    src={file.thumbnail_url || file.file_url}
                                    alt={file.file_name}
                                    className="w-10 h-10 object-cover rounded"
                                  />
                                ) : (
                                  getFileIcon(file.file_type)
                                )}
                                <div>
                                  <p className="font-medium">{file.file_name}</p>
                                  <p className="text-sm text-gray-500">
                                    {formatFileSize(file.file_size)} • {formatDate(file.created_at)}
                                  </p>
                                </div>
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                  <DropdownMenuItem onClick={() => window.open(file.file_url, '_blank')}>
                                    <Eye className="w-4 h-4 mr-2" />
                                    View
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => window.open(file.file_url, '_blank')}>
                                    <Download className="w-4 h-4 mr-2" />
                                    Download
                                  </DropdownMenuItem>
                                  {canDelete('media') && (
                                    <DropdownMenuItem onClick={() => deleteFile(file)}>
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {showCreateFolderModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-lg p-6 w-full max-w-md"
            >
              <h2 className="text-xl font-bold mb-4">Create New Folder</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Folder Name</label>
                  <Input
                    value={folderName}
                    onChange={(e) => setFolderName(e.target.value)}
                    placeholder="Enter folder name"
                    onKeyPress={(e) => e.key === 'Enter' && createFolder()}
                  />
                </div>
                {currentFolderId && (
                  <p className="text-sm text-gray-500">
                    Creating in: {breadcrumbs[breadcrumbs.length - 1].name}
                  </p>
                )}
                <div className="flex space-x-2">
                  <Button onClick={createFolder} disabled={creating || !folderName.trim()} className="flex-1">
                    {creating ? 'Creating...' : 'Create Folder'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCreateFolderModal(false)
                      setFolderName('')
                    }}
                    disabled={creating}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {showUploadFileModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-lg p-6 w-full max-w-md"
            >
              <h2 className="text-xl font-bold mb-4">Upload File</h2>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select File
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                  <input
                    type="file"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                    {selectedFile ? (
                      <div>
                        <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm text-gray-600">Click to select a file</p>
                        <p className="text-xs text-gray-400 mt-1">or drag and drop</p>
                      </div>
                    )}
                  </label>
                </div>
                {currentFolderId && (
                  <p className="text-xs text-gray-500 mt-2">
                    File will be uploaded to: {breadcrumbs[breadcrumbs.length - 1].name}
                  </p>
                )}
              </div>
              <div className="flex space-x-2">
                <Button
                  onClick={uploadFile}
                  disabled={!selectedFile || uploading}
                  className="flex-1"
                >
                  {uploading ? 'Uploading...' : 'Upload'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowUploadFileModal(false)
                    setSelectedFile(null)
                  }}
                  disabled={uploading}
                >
                  Cancel
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </div>

      {/* Mobile View */}
      <div className="md:hidden min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
        {/* Mobile Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-6 sticky top-0 z-10 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            {currentFolderId ? (
              <button onClick={() => navigateToFolder(breadcrumbs[breadcrumbs.length - 2]?.id || null, breadcrumbs[breadcrumbs.length - 2]?.name || 'Root')}>
                <ArrowLeft className="w-6 h-6" />
              </button>
            ) : (
              <Folder className="w-6 h-6" />
            )}
            <h1 className="text-xl font-bold flex-1 text-center">{breadcrumbs[breadcrumbs.length - 1].name}</h1>
            <button onClick={() => setShowMobileMenu(!showMobileMenu)}>
              <MoreVertical className="w-6 h-6" />
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-300" />
            <input
              type="text"
              placeholder="Search files and folders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-full bg-white/20 text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-white/30"
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
              <div className="bg-blue-100 p-2 rounded-xl">
                <Folder className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{folders.length}</p>
                <p className="text-xs text-gray-500">Folders</p>
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
              <div className="bg-green-100 p-2 rounded-xl">
                <File className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{displayFilesCount}</p>
                <p className="text-xs text-gray-500">Files</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Folders and Files List */}
        <div className="px-4 pb-24">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredFolders.length === 0 && filteredFiles.length === 0 ? (
            <div className="text-center py-12">
              <Folder className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">No items in this folder</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredFolders.map((folder) => (
                <motion.div
                  key={folder.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigateToFolder(folder.id, folder.folder_name)}
                  className="bg-white rounded-2xl p-4 shadow-md active:shadow-lg transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-yellow-100 p-3 rounded-xl">
                        <Folder className="w-6 h-6 text-yellow-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">{folder.folder_name}</p>
                        <p className="text-xs text-gray-500">{formatDate(folder.created_at)}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </motion.div>
              ))}

              {filteredFiles.map((file) => (
                <motion.div
                  key={file.id}
                  whileTap={{ scale: 0.98 }}
                  className="bg-white rounded-2xl p-4 shadow-md"
                >
                  <div className="flex items-center gap-3">
                    {file.thumbnail_url || file.file_type?.startsWith('image/') ? (
                      <img
                        src={file.thumbnail_url || file.file_url}
                        alt={file.file_name}
                        className="w-12 h-12 object-cover rounded-xl"
                      />
                    ) : (
                      <div className="bg-gray-100 p-3 rounded-xl">
                        {getFileIcon(file.file_type)}
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800 text-sm">{file.file_name}</p>
                      <p className="text-xs text-gray-500">{formatFileSize(file.file_size)} • {formatDate(file.created_at)}</p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-2">
                          <MoreVertical className="w-4 h-4 text-gray-400" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => window.open(file.file_url, '_blank')}>
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => window.open(file.file_url, '_blank')}>
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </DropdownMenuItem>
                        {canDelete('media') && (
                          <DropdownMenuItem onClick={() => deleteFile(file)}>
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Fixed Bottom Action Buttons */}
        {canCreate('media') && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg z-20">
            <div className="flex gap-3">
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowCreateFolderModal(true)}
                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl py-4 font-bold text-sm shadow-lg flex items-center justify-center gap-2"
              >
                <FolderPlus className="w-5 h-5" />
                New Folder
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowUploadFileModal(true)}
                disabled={currentFolderId === null}
                className="flex-1 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-2xl py-4 font-bold text-sm shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Upload className="w-5 h-5" />
                Upload File
              </motion.button>
            </div>
            {currentFolderId === null && (
              <p className="text-xs text-center text-gray-500 mt-2">
                Navigate to a folder to upload files
              </p>
            )}
          </div>
        )}

        {/* Mobile Menu Dropdown */}
        <AnimatePresence>
          {showMobileMenu && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 z-50"
              onClick={() => setShowMobileMenu(false)}
            >
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="absolute right-0 top-0 bottom-0 w-64 bg-white shadow-xl p-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-gray-800">Menu</h3>
                  <button onClick={() => setShowMobileMenu(false)}>
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      setViewMode(viewMode === 'grid' ? 'list' : 'grid')
                      setShowMobileMenu(false)
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100"
                  >
                    {viewMode === 'grid' ? <List className="w-5 h-5" /> : <Grid className="w-5 h-5" />}
                    <span>Toggle View</span>
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile Create Folder Modal */}
        <AnimatePresence>
          {showCreateFolderModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end"
            >
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="bg-white rounded-t-3xl p-6 w-full"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-800">Create New Folder</h2>
                  <button onClick={() => { setShowCreateFolderModal(false); setFolderName('') }}>
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Folder Name</label>
                    <input
                      type="text"
                      value={folderName}
                      onChange={(e) => setFolderName(e.target.value)}
                      placeholder="Enter folder name"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  {currentFolderId && (
                    <p className="text-sm text-gray-500">
                      Creating in: {breadcrumbs[breadcrumbs.length - 1].name}
                    </p>
                  )}
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={createFolder}
                    disabled={creating || !folderName.trim()}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl py-4 font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {creating ? 'Creating...' : 'Create Folder'}
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile Upload File Modal */}
        <AnimatePresence>
          {showUploadFileModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end"
            >
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="bg-white rounded-t-3xl p-6 w-full"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-800">Upload File</h2>
                  <button onClick={() => { setShowUploadFileModal(false); setSelectedFile(null) }}>
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center">
                    <input
                      type="file"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      className="hidden"
                      id="mobile-file-upload"
                    />
                    <label htmlFor="mobile-file-upload" className="cursor-pointer">
                      <div className="bg-blue-100 w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                        <Upload className="w-8 h-8 text-blue-600" />
                      </div>
                      {selectedFile ? (
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{selectedFile.name}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-sm font-semibold text-gray-900">Tap to select a file</p>
                          <p className="text-xs text-gray-500 mt-1">Images, videos, documents</p>
                        </div>
                      )}
                    </label>
                  </div>
                  {currentFolderId && (
                    <p className="text-xs text-gray-500 text-center">
                      File will be uploaded to: {breadcrumbs[breadcrumbs.length - 1].name}
                    </p>
                  )}
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={uploadFile}
                    disabled={!selectedFile || uploading}
                    className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white rounded-2xl py-4 font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploading ? 'Uploading...' : 'Upload File'}
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}
