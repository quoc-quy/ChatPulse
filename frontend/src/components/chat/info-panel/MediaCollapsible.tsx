import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ChevronRight, Download, FileText, Link2, PlayCircle, X } from 'lucide-react'
import { useState } from 'react'
import { createPortal } from 'react-dom'

export interface MediaItem {
  id: string
  url: string
  name?: string
  isVideo?: boolean
}

interface MediaCollapsibleProps {
  title: string
  icon: any
  emptyText: string
  defaultOpen?: boolean
  type: 'media' | 'file' | 'link'
  items?: MediaItem[]
}

export function MediaCollapsible({
  title,
  icon: Icon,
  emptyText,
  defaultOpen = true,
  type,
  items = []
}: MediaCollapsibleProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  // Quản lý trạng thái Modal Media
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null)

  const renderContent = () => {
    if (items.length === 0) {
      return (
        <div className='flex flex-col items-center justify-center py-6 text-center gap-3 bg-muted/20 mx-4 mb-4 rounded-lg border border-dashed border-border/60'>
          <div className='p-3 bg-background rounded-full shadow-sm'>
            <Icon className='w-6 h-6 text-muted-foreground/50' />
          </div>
          <p className='text-[13px] text-muted-foreground px-4 leading-relaxed'>{emptyText}</p>
        </div>
      )
    }

    if (type === 'media') {
      return (
        <div className='grid grid-cols-3 gap-1 px-4 mb-4'>
          {items.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedMedia(item)} // Mở Modal thay vì nhảy tab mới
              className='relative aspect-square cursor-pointer hover:opacity-80 transition group rounded-md overflow-hidden bg-muted border border-border/40'
            >
              {item.isVideo ? (
                <>
                  <video src={item.url} className='w-full h-full object-cover' />
                  <div className='absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/50 transition'>
                    <PlayCircle className='w-6 h-6 text-white' />
                  </div>
                </>
              ) : (
                <img src={item.url} alt='media' className='w-full h-full object-cover' />
              )}
            </div>
          ))}
        </div>
      )
    }

    if (type === 'file') {
      return (
        <div className='flex flex-col gap-2 px-4 mb-4'>
          {items.map((item) => (
            <div
              key={item.id}
              className='flex items-center gap-3 p-2.5 rounded-lg border border-border/50 bg-muted/20 hover:bg-muted/60 transition'
            >
              <div className='w-10 h-10 rounded-md bg-blue-500/10 flex items-center justify-center shrink-0'>
                <FileText className='w-5 h-5 text-blue-500' />
              </div>
              <div className='flex-1 min-w-0'>
                <p className='text-[13px] font-medium truncate' title={item.name}>
                  {item.name}
                </p>
              </div>
              <a
                href={item.url}
                target='_blank'
                rel='noreferrer'
                className='p-2 rounded-full hover:bg-background text-muted-foreground hover:text-foreground shadow-sm border border-transparent hover:border-border transition'
              >
                <Download className='w-4 h-4' />
              </a>
            </div>
          ))}
        </div>
      )
    }

    if (type === 'link') {
      return (
        <div className='flex flex-col gap-2 px-4 mb-4'>
          {items.map((item) => (
            <a
              key={item.id}
              href={item.url}
              target='_blank'
              rel='noreferrer'
              className='flex items-center gap-3 p-2.5 rounded-lg border border-border/50 bg-muted/20 hover:bg-muted/60 transition group'
            >
              <div className='w-10 h-10 rounded-md bg-green-500/10 flex items-center justify-center shrink-0'>
                <Link2 className='w-5 h-5 text-green-500' />
              </div>
              <div className='flex-1 min-w-0'>
                <p className='text-[13px] font-medium text-blue-500 group-hover:underline truncate' title={item.url}>
                  {item.url}
                </p>
              </div>
            </a>
          ))}
        </div>
      )
    }
  }

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className='w-full border-b border-border/40 last:border-0'>
        <CollapsibleTrigger className='flex items-center justify-between px-4 py-3.5 hover:bg-muted transition-colors w-full group outline-none'>
          <div className='flex items-center gap-3'>
            <Icon className='w-5 h-5 text-foreground' />
            <span className='text-[15px] font-semibold text-foreground'>{title}</span>
          </div>
          <ChevronRight
            className={`w-4 h-4 text-muted-foreground transition-transform duration-300 ${isOpen ? 'rotate-90' : ''}`}
          />
        </CollapsibleTrigger>

        <CollapsibleContent className='overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down'>
          {renderContent()}
        </CollapsibleContent>
      </Collapsible>

      {/* RENDER MODAL DÙNG PORTAL RA NGOÀI BODY */}
      {selectedMedia &&
        createPortal(
          <div
            className='fixed inset-0 z-[99999] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm'
            onClick={() => setSelectedMedia(null)}
          >
            <div className='relative max-w-[90vw] max-h-[90vh] animate-in fade-in zoom-in-95 duration-200 flex items-center justify-center'>
              <button
                className='absolute -top-12 right-0 p-2 text-white/70 hover:text-white transition-colors bg-white/10 rounded-full z-50'
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedMedia(null)
                }}
              >
                <X className='w-6 h-6' />
              </button>
              {selectedMedia.isVideo ? (
                <video
                  src={selectedMedia.url}
                  controls
                  autoPlay
                  className='max-w-full max-h-[85vh] rounded-md bg-black shadow-lg'
                />
              ) : (
                <img
                  src={selectedMedia.url}
                  alt='Zoomed media'
                  className='max-w-full max-h-[85vh] object-contain rounded-md shadow-lg'
                />
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  )
}
