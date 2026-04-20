/* eslint-disable @typescript-eslint/no-explicit-any */
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { Message } from '@/types/message.type'
import { CallMessage } from '../chat/CallMessage'
import { AppContext } from '@/context/app.context'
import { useContext, useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { ReactionModal } from './ReactionModal'
import { ReactionBadge } from './ReactionBadge'
import { MessageActions } from './MessageActions'
import {
  Check,
  CheckCheck,
  Clock,
  Download,
  X,
  RefreshCcw,
  FileText,
  FileSpreadsheet,
  FileArchive,
  Film,
  Music,
  File as GenericFileIcon,
  FileCode,
  Image as ImageIcon
} from 'lucide-react'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface MessageItemProps {
  message: Message
  isMe: boolean
  senderName: string
  displayTime: string
  showTimeDivider: boolean
  dividerTimeStr: string
  isFirstInGroup?: boolean
  isLastInGroup?: boolean
  onDeleteForMe?: (messageId: string) => void
}

export interface FilePayload {
  url: string
  originalName: string
  size: number
  mimeType: string
}

// ─────────────────────────────────────────────
// Helpers: parse content
// ─────────────────────────────────────────────

/**
 * Parse `message.content` của tin nhắn media.
 * Hỗ trợ 3 dạng:
 *   1. JSON object { url, originalName, size, mimeType }  ← format mới (1 file)
 *   2. JSON array  [{ url, ... }, ...]                    ← format mới (nhiều file)
 *   3. JSON array  ["https://..."]                        ← legacy (mảng URL string)
 *   4. URL string thuần                                   ← legacy (1 URL)
 */
function parseMediaContent(content: string): FilePayload[] {
  try {
    const parsed = JSON.parse(content)

    // Array
    if (Array.isArray(parsed)) {
      if (parsed.length > 0 && typeof parsed[0] === 'object' && parsed[0].url) {
        // New format: array of FilePayload
        return parsed as FilePayload[]
      }
      // Legacy: array of URL strings
      return (parsed as string[]).map(legacyUrlToPayload)
    }

    // Single object
    if (typeof parsed === 'object' && parsed !== null && parsed.url) {
      return [parsed as FilePayload]
    }

    // Fallback: treat entire content as URL
    return [legacyUrlToPayload(content)]
  } catch {
    // Not JSON → plain URL
    return [legacyUrlToPayload(content)]
  }
}

function legacyUrlToPayload(url: string): FilePayload {
  const cleanUrl = url.split('?')[0].split('#')[0]
  const name = cleanUrl.split('/').pop() || 'file'
  return { url, originalName: name, size: 0, mimeType: guessMimeFromName(name) }
}

function guessMimeFromName(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() || ''
  const map: Record<string, string> = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    zip: 'application/zip',
    rar: 'application/x-rar-compressed',
    mp4: 'video/mp4',
    webm: 'video/webm',
    mov: 'video/quicktime',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    m4a: 'audio/mp4',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml'
  }
  return map[ext] || 'application/octet-stream'
}

// ─────────────────────────────────────────────
// Helpers: classify
// ─────────────────────────────────────────────
const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'bmp', 'svg', 'avif'])
const VIDEO_EXTS = new Set(['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv'])
const AUDIO_EXTS = new Set(['mp3', 'wav', 'm4a', 'ogg', 'flac', 'aac'])
const DOC_EXTS = new Set(['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'zip', 'rar', '7z'])

function getExt(p: FilePayload): string {
  return (p.originalName.split('.').pop() || '').toLowerCase()
}

function classify(p: FilePayload) {
  const ext = getExt(p)
  const mime = p.mimeType || ''
  const url = p.url

  const isImage =
    IMAGE_EXTS.has(ext) ||
    mime.startsWith('image/') ||
    url.startsWith('blob:') ||
    url.startsWith('data:image/') ||
    url.includes('/image/upload/')
  const isVideo = VIDEO_EXTS.has(ext) || mime.startsWith('video/')
  const isAudio = AUDIO_EXTS.has(ext) || mime.startsWith('audio/')
  const isPdf = ext === 'pdf' || mime === 'application/pdf'
  const isDoc = DOC_EXTS.has(ext) || (!isImage && !isVideo && !isAudio)

  return { isImage, isVideo, isAudio, isPdf, isDoc }
}

// ─────────────────────────────────────────────
// Helpers: formatting
// ─────────────────────────────────────────────
function formatBytes(bytes: number): string {
  if (!bytes) return ''
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1)
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}

// ─────────────────────────────────────────────
// FileTypeIcon: icon theo loại file
// ─────────────────────────────────────────────
function FileTypeIcon({ payload, size = 22 }: { payload: FilePayload; size?: number }) {
  const ext = getExt(payload)
  const mime = payload.mimeType || ''

  if (ext === 'pdf' || mime === 'application/pdf') return <FileText size={size} className='text-red-500' />
  if (['doc', 'docx'].includes(ext) || mime.includes('word')) return <FileText size={size} className='text-blue-500' />
  if (['xls', 'xlsx', 'csv'].includes(ext) || mime.includes('spreadsheet') || mime.includes('excel'))
    return <FileSpreadsheet size={size} className='text-green-500' />
  if (['ppt', 'pptx'].includes(ext) || mime.includes('presentation'))
    return <FileText size={size} className='text-orange-500' />
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext) || mime.includes('zip') || mime.includes('archive'))
    return <FileArchive size={size} className='text-purple-500' />
  if (VIDEO_EXTS.has(ext) || mime.startsWith('video/')) return <Film size={size} className='text-pink-500' />
  if (AUDIO_EXTS.has(ext) || mime.startsWith('audio/')) return <Music size={size} className='text-yellow-500' />
  if (['js', 'ts', 'tsx', 'jsx', 'py', 'java', 'cpp', 'c', 'html', 'css', 'json', 'xml', 'sh'].includes(ext))
    return <FileCode size={size} className='text-cyan-500' />
  if (IMAGE_EXTS.has(ext) || mime.startsWith('image/')) return <ImageIcon size={size} className='text-teal-500' />
  return <GenericFileIcon size={size} className='text-slate-400' />
}

function getBadgeColor(payload: FilePayload): string {
  const ext = getExt(payload)
  const mime = payload.mimeType || ''
  if (ext === 'pdf' || mime === 'application/pdf') return 'bg-red-500'
  if (['doc', 'docx'].includes(ext) || mime.includes('word')) return 'bg-blue-500'
  if (['xls', 'xlsx', 'csv'].includes(ext) || mime.includes('spreadsheet')) return 'bg-green-500'
  if (['ppt', 'pptx'].includes(ext) || mime.includes('presentation')) return 'bg-orange-500'
  if (['zip', 'rar', '7z'].includes(ext)) return 'bg-purple-500'
  if (VIDEO_EXTS.has(ext) || mime.startsWith('video/')) return 'bg-pink-500'
  if (AUDIO_EXTS.has(ext) || mime.startsWith('audio/')) return 'bg-yellow-500'
  return 'bg-slate-500'
}

// ─────────────────────────────────────────────
// PDF first-page preview (dùng PDF.js từ CDN)
// ─────────────────────────────────────────────
function PdfPreview({ url }: { url: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const pdfjsLib = (window as any).pdfjsLib
        if (!pdfjsLib) {
          setFailed(true)
          return
        }

        const pdf = await pdfjsLib.getDocument(url).promise
        if (cancelled) return
        const page = await pdf.getPage(1)
        if (cancelled) return

        const viewport = page.getViewport({ scale: 1 })
        const scale = 240 / viewport.width
        const scaled = page.getViewport({ scale })

        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')!
        canvas.width = scaled.width
        canvas.height = scaled.height

        await page.render({ canvasContext: ctx, viewport: scaled }).promise
        if (!cancelled) setReady(true)
      } catch {
        if (!cancelled) setFailed(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [url])

  if (failed) return null

  return (
    <div
      className='relative w-full flex items-center justify-center bg-muted/30 rounded-t-xl overflow-hidden'
      style={{ height: 150 }}
    >
      <canvas
        ref={canvasRef}
        className={`max-w-full max-h-[150px] object-contain transition-opacity duration-200 ${ready ? 'opacity-100' : 'opacity-0'}`}
      />
      {!ready && (
        <div className='absolute inset-0 flex items-center justify-center'>
          <div className='w-5 h-5 border-2 border-red-400 border-t-transparent rounded-full animate-spin' />
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// FileCard: card hiển thị 1 file document
// ─────────────────────────────────────────────
function FileCard({ payload, isMe }: { payload: FilePayload; isMe: boolean }) {
  const { isPdf } = classify(payload)
  const ext = getExt(payload)
  const badgeLabel = ext.toUpperCase() || 'FILE'
  const sizeLabel = formatBytes(payload.size)

  return (
    <div
      className={`w-[260px] sm:w-[300px] rounded-xl border shadow-sm overflow-hidden ${isMe ? 'bg-white/10 border-white/20' : 'bg-background border-border'}`}
    >
      {/* PDF → xem trước trang đầu tiên */}
      {isPdf && <PdfPreview url={payload.url} />}

      {/* Info row */}
      <div className='flex items-center gap-3 p-3'>
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${isMe ? 'bg-white/15' : 'bg-muted'}`}
        >
          <FileTypeIcon payload={payload} size={20} />
        </div>

        <div className='flex-1 min-w-0'>
          {/* Tên file gốc */}
          <p className='text-[13px] font-semibold truncate leading-snug' title={payload.originalName}>
            {payload.originalName}
          </p>
          <div className='flex items-center gap-1.5 mt-0.5'>
            {/* Badge loại file */}
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold text-white ${getBadgeColor(payload)}`}>
              {badgeLabel}
            </span>
            {/* Dung lượng */}
            {sizeLabel && <span className='text-[11px] opacity-60'>{sizeLabel}</span>}
          </div>
        </div>

        {/* Nút tải xuống */}
        <a
          href={payload.url}
          download={payload.originalName}
          target='_blank'
          rel='noreferrer'
          onClick={(e) => e.stopPropagation()}
          className={`p-2 rounded-full transition-colors shrink-0 ${isMe ? 'hover:bg-white/20' : 'hover:bg-muted'}`}
          title='Tải xuống'
        >
          <Download className='w-4 h-4' />
        </a>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────
export function MessageItem({
  message,
  isMe,
  senderName,
  displayTime,
  showTimeDivider,
  dividerTimeStr,
  isFirstInGroup = true,
  isLastInGroup = true,
  onDeleteForMe
}: MessageItemProps) {
  const { profile } = useContext(AppContext)
  const currentUserId = profile?._id || ''
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedMediaUrl, setSelectedMediaUrl] = useState<string | null>(null)

  const isCall = message.type === 'call'
  const isRevoked = message.type === 'revoked'
  const reactions = message.reactions || []
  const hasReactions = reactions.length > 0 && !isRevoked

  const isMedia = message.type === 'media' || message.type === 'image' || message.type === 'video'

  // Parse tất cả file trong message
  const payloads: FilePayload[] = isMedia ? parseMediaContent(message.content) : []

  // Classify từng item
  const clss = payloads.map(classify)
  const allVisual = clss.length > 0 && clss.every((c) => c.isImage || c.isVideo)

  let rowMarginClass = 'mb-[2px]'
  if (isLastInGroup) rowMarginClass = hasReactions ? 'mb-8' : 'mb-4'
  else rowMarginClass = hasReactions ? 'mb-5' : 'mb-[2px]'

  const getReplyContent = (): string => {
    if (!message.replyToMessage) return ''
    if (message.replyToMessage.type !== 'text') return '[Đa phương tiện]'
    return message.replyToMessage.content
  }

  const getInitials = (name?: string) => (name?.trim() ? name.trim().charAt(0).toUpperCase() : 'U')

  // ── Status icon ──────────────────────────────
  const renderMessageStatus = () => {
    if (!isMe || isCall || isRevoked) return null
    const status = message.status || 'SENT'

    if (status === 'FAILED') {
      return (
        <button
          onClick={() =>
            window.dispatchEvent(
              new CustomEvent('retry_send', { detail: { tempId: message._id, apiCall: (message as any)._apiCall } })
            )
          }
          className='flex items-center gap-1 ml-2 text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded text-[10px] hover:bg-red-500/20 transition'
        >
          <RefreshCcw className='w-3 h-3' /> Thử lại
        </button>
      )
    }

    return (
      <div className='flex items-center ml-1 opacity-70'>
        {status === 'SENDING' && <Clock className='w-[10px] h-[10px]' />}
        {status === 'SENT' && <Check className='w-[14px] h-[14px]' />}
        {status === 'DELIVERED' && <CheckCheck className='w-[14px] h-[14px] text-gray-400' />}
        {status === 'SEEN' && <CheckCheck className='w-[14px] h-[14px] text-blue-400' />}
      </div>
    )
  }

  // ── Content renderer ─────────────────────────
  const renderMessageContent = () => {
    // Text thuần
    if (!isMedia) {
      return (
        <p className='text-[15px] leading-relaxed whitespace-pre-wrap break-words [word-break:break-word] [overflow-wrap:anywhere]'>
          {message.content}
        </p>
      )
    }

    if (payloads.length === 0) return null

    // Audio
    if (clss.some((c) => c.isAudio)) {
      return <audio src={payloads[0].url} controls className='max-w-[240px]' />
    }

    // Tất cả ảnh/video → grid
    if (allVisual) {
      const urls = payloads.map((p) => p.url)
      return (
        <>
          {urls.length === 1 ? (
            clss[0].isVideo ? (
              <video src={urls[0]} controls className='max-w-[260px] max-h-[320px] rounded-xl bg-black shadow-sm' />
            ) : (
              <img
                src={urls[0]}
                alt='media'
                onClick={() => setSelectedMediaUrl(urls[0])}
                className='max-w-[260px] max-h-[320px] object-cover rounded-xl cursor-pointer hover:opacity-90 transition shadow-sm border border-border/20'
              />
            )
          ) : (
            <div
              className={`grid gap-1.5 max-w-[340px] rounded-xl overflow-hidden shadow-sm border border-border/20 ${
                urls.length === 2 ? 'grid-cols-2' : urls.length === 3 ? 'grid-cols-3' : 'grid-cols-4'
              }`}
            >
              {urls.map((url, idx) => {
                const isVid = clss[idx].isVideo
                return (
                  <div
                    key={idx}
                    className='relative w-full bg-muted cursor-pointer hover:opacity-90 transition aspect-square'
                    onClick={() => setSelectedMediaUrl(url)}
                  >
                    {isVid ? (
                      <video src={url} className='w-full h-full object-cover' />
                    ) : (
                      <img src={url} alt='media' className='w-full h-full object-cover' />
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Lightbox */}
          {selectedMediaUrl &&
            createPortal(
              <div
                className='fixed inset-0 z-[99999] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm'
                onClick={() => setSelectedMediaUrl(null)}
              >
                <div className='relative max-w-[90vw] max-h-[90vh] animate-in fade-in zoom-in-95 duration-200'>
                  <button
                    className='absolute -top-12 right-0 p-2 text-white/70 hover:text-white bg-white/10 rounded-full z-50'
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedMediaUrl(null)
                    }}
                  >
                    <X className='w-6 h-6' />
                  </button>
                  {VIDEO_EXTS.has(selectedMediaUrl.split('?')[0].split('.').pop()?.toLowerCase() || '') ? (
                    <video
                      src={selectedMediaUrl}
                      controls
                      autoPlay
                      className='max-w-full max-h-[85vh] rounded-md shadow-2xl'
                    />
                  ) : (
                    <img
                      src={selectedMediaUrl}
                      alt='preview'
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

    // Mixed hoặc toàn file document → FileCard cho mỗi item
    return (
      <div className='flex flex-col gap-2'>
        {payloads.map((p, idx) => {
          const c = clss[idx]
          if (c.isVideo)
            return (
              <video
                key={idx}
                src={p.url}
                controls
                className='max-w-[260px] max-h-[320px] rounded-xl bg-black shadow-sm'
              />
            )
          if (c.isImage)
            return (
              <img
                key={idx}
                src={p.url}
                alt='media'
                onClick={() => setSelectedMediaUrl(p.url)}
                className='max-w-[260px] max-h-[320px] object-cover rounded-xl cursor-pointer hover:opacity-90 transition shadow-sm'
              />
            )
          return <FileCard key={idx} payload={p} isMe={isMe} />
        })}
      </div>
    )
  }

  // ── System message ───────────────────────────
  if (message.type === 'system') {
    const isWarning = (message as any).isWarning
    return (
      <div id={`message-${message._id}`} className='flex flex-col w-full my-3'>
        {showTimeDivider && (
          <div className='flex justify-center mb-3'>
            <span className='px-3 py-1 bg-muted/60 text-muted-foreground text-[11px] rounded-full font-medium'>
              {dividerTimeStr}
            </span>
          </div>
        )}
        <div className='flex justify-center w-full animate-in fade-in zoom-in-95 duration-300'>
          <span
            className={`px-4 py-1.5 text-[12px] font-medium rounded-full shadow-sm text-center max-w-[85%] break-words ${
              isWarning ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-muted/60 text-muted-foreground'
            }`}
          >
            {message.content}
          </span>
        </div>
      </div>
    )
  }

  const getBubbleStyles = () => {
    if (allVisual && isMedia) return 'bg-transparent'
    // File document (không phải ảnh/video) → không dùng bubble có màu nền
    const allDocs = clss.length > 0 && clss.every((c) => !c.isImage && !c.isVideo && !c.isAudio)
    if (allDocs && isMedia) return 'bg-transparent'
    if (isMe) return 'bg-gradient-to-r from-[#6b45e9] to-[#a139e4] text-white rounded-tr-sm px-4 py-2.5 shadow-sm'
    return 'bg-background border border-border text-foreground rounded-tl-sm px-4 py-2.5 shadow-sm'
  }

  return (
    <div id={`message-${message._id}`} className='flex flex-col'>
      {showTimeDivider && (
        <div className='flex justify-center my-6'>
          <span className='px-3 py-1 bg-muted/60 text-muted-foreground text-[11px] rounded-full font-medium'>
            {dividerTimeStr}
          </span>
        </div>
      )}

      <div className={`flex gap-2 ${rowMarginClass} ${isMe ? 'justify-end' : 'justify-start'} group`}>
        {!isMe && (
          <div className='w-8 shrink-0'>
            {isFirstInGroup ? (
              <Avatar className='h-8 w-8 mt-1'>
                <AvatarImage src={message.sender?.avatar} alt={senderName} />
                <AvatarFallback className='text-xs font-semibold bg-blue-100 text-blue-600'>
                  {getInitials(senderName)}
                </AvatarFallback>
              </Avatar>
            ) : (
              <div className='h-8 w-8' />
            )}
          </div>
        )}

        <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[75%]`}>
          <div className='flex items-center gap-2 group/bubble relative'>
            <MessageActions
              message={message}
              isMe={isMe}
              currentUserId={currentUserId}
              onDeleteForMe={onDeleteForMe}
              decryptedContent={message.content}
            />

            {isRevoked ? (
              <div
                className={`flex flex-col px-4 py-2.5 rounded-2xl border border-border/60 bg-muted/30 text-muted-foreground/80 ${isMe ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}
              >
                <p className='text-[15px] italic select-none'>Tin nhắn đã được thu hồi</p>
              </div>
            ) : isCall ? (
              <CallMessage message={message} isMe={isMe} />
            ) : (
              <div className={`flex flex-col rounded-2xl relative ${getBubbleStyles()}`}>
                {/* Sender name (nhóm chat, không phải ảnh) */}
                {!isMe && isFirstInGroup && !(allVisual && isMedia) && (
                  <span className='text-xs font-semibold text-muted-foreground mb-1'>{senderName}</span>
                )}

                {/* Reply preview */}
                {message.replyToMessage && (
                  <div
                    className='mb-2 p-2 rounded-lg border-l-4 border-white/50 bg-black/10 flex flex-col text-sm cursor-pointer opacity-80 hover:opacity-100 transition'
                    onClick={() => {
                      const el = document.getElementById(`message-${message.replyToMessage?._id}`)
                      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                      el?.classList.add('bg-muted/50', 'transition-colors', 'duration-500')
                      setTimeout(() => el?.classList.remove('bg-muted/50'), 1500)
                    }}
                  >
                    <span className='font-semibold text-xs'>{message.replyToMessage.senderName}</span>
                    <span className='truncate text-xs opacity-90 max-w-[200px]'>{getReplyContent()}</span>
                  </div>
                )}

                {renderMessageContent()}

                {hasReactions && (
                  <div
                    className={`absolute -bottom-3.5 ${isMe ? 'right-2' : 'left-2'} z-10 cursor-pointer drop-shadow-sm`}
                    onClick={() => setIsModalOpen(true)}
                  >
                    <ReactionBadge reactions={reactions} isMe={isMe} onClick={() => setIsModalOpen(true)} />
                  </div>
                )}

                {isLastInGroup &&
                  (() => {
                    const allDocs = clss.length > 0 && clss.every((c) => !c.isImage && !c.isVideo && !c.isAudio)
                    const isDocOnly = allDocs && isMedia
                    return (
                      <div
                        className={`flex items-center mt-1 ${
                          (allVisual && isMedia) || isDocOnly
                            ? isMe
                              ? 'self-end mr-1'
                              : 'self-start ml-1'
                            : isMe
                              ? 'self-end text-white/80'
                              : 'self-start text-muted-foreground'
                        }`}
                      >
                        <span className='text-[10px]'>{displayTime}</span>
                        {renderMessageStatus()}
                      </div>
                    )
                  })()}
              </div>
            )}
          </div>
        </div>
      </div>

      <ReactionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} reactions={reactions} />
    </div>
  )
}
