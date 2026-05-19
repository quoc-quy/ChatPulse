/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible'
import { ChevronDown, X, Download } from 'lucide-react'
import { createPortal } from 'react-dom'
import { Skeleton } from '@/components/ui/skeleton'

interface MediaCollapsibleProps {
  title: string
  icon: React.ElementType
  emptyText: string
  defaultOpen?: boolean
  type: 'media' | 'file' | 'link'
  messages: any[]
  isLoading?: boolean
}

// Hàm helper để xác định loại file dựa trên URL extension
const getFileType = (url: string) => {
  const cleanUrl = url.split('?')[0].split('#')[0]
  const ext = cleanUrl.split('.').pop()?.toLowerCase() || ''

  if (
    ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'bmp', 'svg'].includes(ext) ||
    url.startsWith('blob:') ||
    url.startsWith('data:image/') ||
    url.includes('/image/upload/')
  ) {
    return 'image'
  }
  if (['mp4', 'webm', 'ogg', 'mov'].includes(ext)) {
    return 'video'
  }
  if (['mp3', 'wav', 'm4a'].includes(ext)) {
    return 'audio'
  }
  // Nếu không thuộc các loại trên, mặc định nó là document/file
  return 'file'
}

export function MediaCollapsible({
  title,
  icon: Icon,
  emptyText,
  defaultOpen = false,
  type,
  messages,
  isLoading
}: MediaCollapsibleProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const [selectedMediaUrl, setSelectedMediaUrl] = useState<string | null>(null)

  // 1. LỌC VÀ CHUẨN BỊ DỮ LIỆU TỪ MẢNG MESSAGES
  const medias: { url: string; isVideo: boolean }[] = []
  const files: { url: string; name: string }[] = []
  const links: { url: string }[] = []
  // const urlRegex = /(https?:\/\/[^\s]+)/g

  const getFileNameFromUrl = (url: string) => {
    try {
      const cleanUrl = url.split('?')[0].split('#')[0]
      const pathSegments = cleanUrl.split('/')
      const fileName = pathSegments[pathSegments.length - 1]
      return decodeURIComponent(fileName) || 'Tài liệu không tên'
    } catch {
      return 'Tài liệu không tên'
    }
  }

  const handleDownload = async (url: string, fileName: string) => {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const blobUrl = window.URL.createObjectURL(blob)

      const a = document.createElement('a')
      a.href = blobUrl
      a.download = fileName // Ép buộc tên file tại đây
      document.body.appendChild(a)
      a.click()

      // Cleanup
      window.URL.revokeObjectURL(blobUrl)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Download failed:', error)
      // Fallback: Nếu fetch bị chặn bởi CORS, mở tab mới như cũ
      window.open(url, '_blank')
    }
  }

  messages.forEach((msg) => {
    if (msg.type === 'revoked') return

    // Chỉ xử lý các loại tin nhắn có chứa file/media
    if (['media', 'image', 'video', 'file'].includes(msg.type)) {
      let payloads: any[] = []
      try {
        const parsed = JSON.parse(msg.content)
        payloads = Array.isArray(parsed) ? parsed : [parsed]
      } catch {
        // Trường hợp content là URL đơn
        payloads = [{ url: msg.content }]
      }

      payloads.forEach((p) => {
        const url = typeof p === 'string' ? p : p.url
        const name = typeof p === 'string' ? getFileNameFromUrl(url) : p.originalName || getFileNameFromUrl(url)

        const fileType = getFileType(url)
        if (fileType === 'image' || fileType === 'video') {
          medias.push({ url, isVideo: fileType === 'video' })
        } else {
          files.push({ url, name })
        }
      })
    }
  })

  // Chọn mảng dữ liệu dựa trên prop `type`
  const activeItems = type === 'media' ? medias : type === 'file' ? files : links
  const hasItems = activeItems.length > 0

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className='w-full mt-2 border-b border-border/40 pb-2'>
        <CollapsibleTrigger className='flex w-full items-center justify-between p-4 hover:bg-muted/50 transition-colors cursor-pointer group'>
          <div className='flex items-center gap-3'>
            <div className='p-1.5 bg-blue-500/10 text-blue-500 rounded-md'>
              <Icon className='w-4 h-4' />
            </div>
            <span className='font-semibold text-[15px]'>{title}</span>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </CollapsibleTrigger>

        <CollapsibleContent className='px-4 pb-4 animate-in fade-in slide-in-from-top-2 duration-200'>
          {isLoading ? (
            // SKELETON KHI ĐANG TẢI
            <div className={type === 'media' ? 'grid grid-cols-3 gap-1.5 mt-1' : 'flex flex-col gap-2 mt-1'}>
              {Array.from({ length: type === 'media' ? 6 : 3 }).map((_, idx) =>
                type === 'media' ? (
                  <Skeleton key={idx} className='aspect-square rounded-md w-full' />
                ) : (
                  <Skeleton key={idx} className='h-12 w-full rounded-lg' />
                )
              )}
            </div>
          ) : !hasItems ? (
            <div className='p-4 text-center text-[13px] text-muted-foreground bg-muted/30 rounded-lg border border-dashed mt-1'>
              {emptyText}
            </div>
          ) : (
            <div className={type === 'media' ? 'grid grid-cols-3 gap-1.5 mt-1' : 'flex flex-col gap-2 mt-1'}>
              {/* RENDER THEO TYPE */}
              {type === 'media' &&
                medias.map((item, idx) => (
                  <div
                    key={idx}
                    className='relative aspect-square bg-muted rounded-md overflow-hidden cursor-pointer hover:opacity-80 transition group'
                    onClick={() => setSelectedMediaUrl(item.url)}
                  >
                    {item.isVideo ? (
                      <video src={item.url} className='w-full h-full object-cover' />
                    ) : (
                      <img src={item.url} alt={`media-${idx}`} className='w-full h-full object-cover' />
                    )}
                  </div>
                ))}

              {type === 'file' &&
                files.map((item, idx) => {
                  const ext = item.name.split('.').pop()?.toUpperCase() || 'FILE'
                  return (
                    <div
                      key={idx}
                      className='flex items-center gap-3 p-2.5 rounded-lg border border-border/50 hover:bg-muted transition-colors'
                    >
                      <div className='w-10 h-10 rounded bg-blue-500/10 flex flex-shrink-0 items-center justify-center'>
                        <Icon className='w-5 h-5 text-blue-500' />
                      </div>
                      <div className='flex-1 min-w-0'>
                        <p className='text-[13px] font-medium truncate'>{item.name}</p>
                        <p className='text-[11px] text-muted-foreground uppercase mt-0.5'>{ext}</p>
                      </div>

                      {/* Nút download được fix ở đây */}
                      <button
                        onClick={() => handleDownload(item.url, item.name)}
                        className='p-2 hover:bg-muted-foreground/10 rounded-full transition-colors'
                      >
                        <Download className='w-4 h-4 text-muted-foreground flex-shrink-0' />
                      </button>
                    </div>
                  )
                })}

              {type === 'link' &&
                links.map((item, idx) => (
                  <a
                    key={idx}
                    href={item.url}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors group'
                  >
                    <div className='w-8 h-8 rounded-full bg-background flex flex-shrink-0 items-center justify-center border border-border group-hover:border-blue-500/50 transition-colors'>
                      <Icon className='w-4 h-4 text-muted-foreground group-hover:text-blue-500 transition-colors' />
                    </div>
                    <p className='text-[13px] text-blue-500 hover:underline truncate'>{item.url}</p>
                  </a>
                ))}
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* ZOOM MODAL (Chỉ dùng cho Media) */}
      {selectedMediaUrl &&
        createPortal(
          <div
            className='fixed inset-0 z-[99999] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm'
            onClick={() => setSelectedMediaUrl(null)}
          >
            <div className='relative max-w-[90vw] max-h-[90vh] animate-in fade-in zoom-in-95 duration-200 flex items-center justify-center'>
              <button
                className='absolute -top-12 right-0 p-2 text-white/70 hover:text-white transition-colors bg-white/10 rounded-full z-50'
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedMediaUrl(null)
                }}
              >
                <X className='w-6 h-6' />
              </button>
              {['mp4', 'webm', 'ogg', 'mov'].includes(
                selectedMediaUrl.split('?')[0].split('.').pop()?.toLowerCase() || ''
              ) ? (
                <video
                  src={selectedMediaUrl}
                  controls
                  autoPlay
                  className='max-w-full max-h-[85vh] rounded-md shadow-2xl'
                />
              ) : (
                <img
                  src={selectedMediaUrl}
                  alt='Zoomed media'
                  className='max-w-full max-h-[85vh] object-contain rounded-md shadow-2xl'
                />
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  )
}
