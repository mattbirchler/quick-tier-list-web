'use client'

import { useState, useEffect } from 'react'

interface ImageItem {
  id: string
  src: string
  name: string
}

interface TierData {
  S: ImageItem[]
  A: ImageItem[]
  B: ImageItem[]
  C: ImageItem[]
  D: ImageItem[]
  unranked: ImageItem[]
}

const TIER_COLORS = {
  S: 'bg-red-500',
  A: 'bg-orange-500', 
  B: 'bg-yellow-500',
  C: 'bg-green-500',
  D: 'bg-blue-500',
  unranked: 'bg-gray-300'
}

export default function TierList() {
  const [tierData, setTierData] = useState<TierData>({
    S: [],
    A: [],
    B: [],
    C: [],
    D: [],
    unranked: []
  })

  const [draggedItem, setDraggedItem] = useState<{item: ImageItem, fromTier: keyof TierData} | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 })
  const [tierNames, setTierNames] = useState({
    S: 'S',
    A: 'A',
    B: 'B', 
    C: 'C',
    D: 'D'
  })
  const [isStreamerMode, setIsStreamerMode] = useState(false)

  useEffect(() => {
    const savedTierData = localStorage.getItem('tierListData')
    if (savedTierData) {
      setTierData(JSON.parse(savedTierData))
    }
    
    const savedTierNames = localStorage.getItem('tierNames')
    if (savedTierNames) {
      setTierNames(JSON.parse(savedTierNames))
    }

    const savedStreamerMode = localStorage.getItem('isStreamerMode')
    if (savedStreamerMode) {
      setIsStreamerMode(JSON.parse(savedStreamerMode))
    }
  }, [])

  useEffect(() => {
    try {
      const dataString = JSON.stringify(tierData)
      localStorage.setItem('tierListData', dataString)
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.warn('LocalStorage quota exceeded. Clearing old data and retrying...')
        try {
          localStorage.clear()
          localStorage.setItem('tierListData', JSON.stringify(tierData))
        } catch (retryError) {
          console.error('Failed to save even after clearing localStorage:', retryError)
          alert('Storage limit exceeded. Consider using fewer or smaller images.')
        }
      } else {
        console.error('Error saving to localStorage:', error)
      }
    }
  }, [tierData])

  useEffect(() => {
    localStorage.setItem('tierNames', JSON.stringify(tierNames))
  }, [tierNames])

  useEffect(() => {
    localStorage.setItem('isStreamerMode', JSON.stringify(isStreamerMode))
  }, [isStreamerMode])


  const compressImage = (file: File, maxWidth = 150, maxHeight = 150, quality = 0.7): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')!
      const img = new Image()
      
      img.onload = () => {
        let { width, height } = img
        
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width
            width = maxWidth
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height
            height = maxHeight
          }
        }
        
        canvas.width = width
        canvas.height = height
        
        // Use appropriate background color based on user's color scheme preference
        const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches
        ctx.fillStyle = isDarkMode ? '#1F2937' : '#FFFFFF' // gray-800 for dark mode, white for light mode
        ctx.fillRect(0, 0, width, height)
        
        ctx.drawImage(img, 0, 0, width, height)
        
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      
      img.src = URL.createObjectURL(file)
    })
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return

    const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'))
    
    if (imageFiles.length === 0) return
    
    setIsUploading(true)
    setUploadProgress({ current: 0, total: imageFiles.length })
    
    const maxFileSize = 5 * 1024 * 1024 // 5MB in bytes
    
    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i]
      
      try {
        setUploadProgress(prev => ({ ...prev, current: i + 1 }))
        
        if (file.size > maxFileSize) {
          console.warn(`File ${file.name} is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 5MB.`)
          alert(`File "${file.name}" is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 5MB.`)
          continue
        }
        
        const compressedSrc = await compressImage(file)
        const newImage: ImageItem = {
          id: Date.now().toString() + Math.random().toString() + i.toString(),
          src: compressedSrc,
          name: file.name
        }
        
        setTierData(prev => ({
          ...prev,
          unranked: [...prev.unranked, newImage]
        }))
        
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (error) {
        console.error('Error processing image:', file.name, error)
      }
    }
    
    setIsUploading(false)
    setUploadProgress({ current: 0, total: 0 })
    event.target.value = ''
  }

  const handleDragStart = (item: ImageItem, fromTier: keyof TierData) => {
    setDraggedItem({ item, fromTier })
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent, toTier: keyof TierData) => {
    e.preventDefault()
    
    if (!draggedItem) return

    const { item, fromTier } = draggedItem

    if (fromTier === toTier) {
      setDraggedItem(null)
      return
    }

    setTierData(prev => {
      const newData = { ...prev }
      
      newData[fromTier] = newData[fromTier].filter(img => img.id !== item.id)
      newData[toTier] = [...newData[toTier], item]
      
      return newData
    })

    setDraggedItem(null)
  }

  const handleItemsAreaDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleItemsAreaDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Check if this is an image being moved between tiers
    if (draggedItem) {
      handleDrop(e, 'unranked')
      return
    }
    
    // Handle file drops
    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      await handleFileUpload({ target: { files, value: '' } } as any)
    }
  }

  const removeImage = (imageId: string, tier: keyof TierData) => {
    setTierData(prev => ({
      ...prev,
      [tier]: prev[tier].filter(img => img.id !== imageId)
    }))
  }

  const resetTierList = () => {
    setTierData(prev => {
      const allImages = [...prev.S, ...prev.A, ...prev.B, ...prev.C, ...prev.D, ...prev.unranked]
      return {
        S: [],
        A: [],
        B: [],
        C: [],
        D: [],
        unranked: allImages
      }
    })
  }

  const clearAllImages = () => {
    if (window.confirm('Are you sure you want to delete all images? This cannot be undone.')) {
      setTierData({
        S: [],
        A: [],
        B: [],
        C: [],
        D: [],
        unranked: []
      })
    }
  }

  const sortItemsAlphabetically = () => {
    setTierData(prev => ({
      ...prev,
      unranked: [...prev.unranked].sort((a, b) => a.name.localeCompare(b.name))
    }))
  }

  const shuffleItems = () => {
    setTierData(prev => {
      const shuffled = [...prev.unranked]
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
      }
      return {
        ...prev,
        unranked: shuffled
      }
    })
  }

  const updateTierName = (tier: keyof typeof tierNames, newName: string) => {
    setTierNames(prev => ({
      ...prev,
      [tier]: newName
    }))
  }

  const getMaxTierWidth = () => {
    const lengths = Object.values(tierNames).map(name => name.length)
    const maxLength = Math.max(...lengths)
    return Math.max(80, Math.min(144, 80 + (maxLength - 1) * 8)) // 80px base, max 144px (18 chars * 8px)
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <div className={`max-w-6xl ${isStreamerMode ? 'mr-auto ml-4' : 'mx-auto'}`}>
        <h1 className={`text-4xl font-bold text-gray-800 dark:text-gray-100 mb-8 ${isStreamerMode ? 'text-left' : 'text-center'}`}>
          Quick Tier List
        </h1>


        <div className="space-y-1">
          {(['S', 'A', 'B', 'C', 'D'] as const).map(tier => (
            <div key={tier} className="flex">
              <div 
                className={`h-20 flex items-center justify-center text-white text-lg font-bold ${TIER_COLORS[tier]} relative group`}
                style={{ width: `${getMaxTierWidth()}px` }}
              >
                <input
                  type="text"
                  value={tierNames[tier]}
                  onChange={(e) => updateTierName(tier, e.target.value)}
                  className="w-full h-full text-center bg-transparent text-white placeholder-white placeholder-opacity-70 border-none outline-none font-bold text-lg"
                  maxLength={18}
                />
              </div>
              <div 
                className="flex-1 min-h-20 border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-1 flex flex-wrap gap-1 items-start"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, tier)}
              >
                {tierData[tier].map(image => (
                  <div
                    key={image.id}
                    draggable
                    onDragStart={() => handleDragStart(image, tier)}
                    className="relative group cursor-move"
                  >
                    <img 
                      src={image.src} 
                      alt={image.name}
                      className="w-16 h-16 object-cover rounded"
                    />
                    <button
                      onClick={() => removeImage(image.id, tier)}
                      className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div>
            <div className="flex">
              <div 
                className={`h-20 flex items-center justify-center text-gray-600 dark:text-gray-400 text-sm font-bold ${TIER_COLORS.unranked}`}
                style={{ width: `${getMaxTierWidth()}px` }}
              >
                Items
              </div>
              <div 
                className="flex-1 min-h-20 border-2 border-dashed border-gray-400 dark:border-gray-500 bg-gray-50 dark:bg-gray-700 p-2 flex flex-wrap gap-1 items-start relative"
                onDragOver={handleItemsAreaDragOver}
                onDrop={handleItemsAreaDrop}
              >
              {tierData.unranked.length === 0 && !isUploading && (
                <div className="absolute inset-0 flex items-center justify-center text-gray-500 dark:text-gray-400 pointer-events-none">
                  <div className="text-center">
                    <div className="text-lg mb-2">📁</div>
                    <div className="text-sm">Drop image files here</div>
                  </div>
                </div>
              )}
              
              {isUploading && (
                <div className="absolute inset-0 flex items-center justify-center z-10">
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-md">
                    <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300 mb-2">
                      <span>Processing images...</span>
                      <span>{uploadProgress.current} / {uploadProgress.total}</span>
                    </div>
                    <div className="w-48 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              )}
              
              {tierData.unranked.map(image => (
                <div
                  key={image.id}
                  draggable
                  onDragStart={() => handleDragStart(image, 'unranked')}
                  className="relative group cursor-move"
                >
                  <img 
                    src={image.src} 
                    alt={image.name}
                    className="w-16 h-16 object-cover rounded"
                  />
                  <button
                    onClick={() => removeImage(image.id, 'unranked')}
                    className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ×
                  </button>
                </div>
              ))}
              </div>
            </div>
            
            <div className="flex gap-2 mt-2" style={{ marginLeft: `${getMaxTierWidth()}px` }}>
              <button
                onClick={sortItemsAlphabetically}
                disabled={tierData.unranked.length === 0}
                className="px-2 py-1 bg-blue-500 dark:bg-blue-600 text-white text-xs rounded hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Sort A-Z
              </button>
              <button
                onClick={shuffleItems}
                disabled={tierData.unranked.length === 0}
                className="px-2 py-1 bg-purple-500 dark:bg-purple-600 text-white text-xs rounded hover:bg-purple-600 dark:hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Shuffle
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-4 justify-center mt-8">
          <button
            onClick={resetTierList}
            className="px-4 py-2 bg-yellow-500 dark:bg-yellow-600 text-white rounded hover:bg-yellow-600 dark:hover:bg-yellow-700 transition-colors font-medium"
          >
            Reset Rankings
          </button>
          <button
            onClick={clearAllImages}
            className="px-4 py-2 bg-red-500 dark:bg-red-600 text-white rounded hover:bg-red-600 dark:hover:bg-red-700 transition-colors font-medium"
          >
            Clear All Images
          </button>
          <button
            onClick={() => setIsStreamerMode(!isStreamerMode)}
            className="px-4 py-2 bg-purple-500 dark:bg-purple-600 text-white rounded hover:bg-purple-600 dark:hover:bg-purple-700 transition-colors font-medium"
          >
            {isStreamerMode ? 'Exit Streamer Mode' : 'Streamer Mode'}
          </button>
        </div>
      </div>
    </div>
  )
}
