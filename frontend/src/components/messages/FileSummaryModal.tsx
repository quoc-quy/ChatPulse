/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { messagesApi, type SummarizeResult } from '@/apis/messages.api'
import { Loader2, FileText, ImageIcon, Table, Info } from 'lucide-react'

interface FileSummaryModalProps {
  isOpen: boolean
  onClose: () => void
  messageId: string | null
}

export default function FileSummaryModal({ isOpen, onClose, messageId }: FileSummaryModalProps) {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<SummarizeResult | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen && messageId) {
      setLoading(true)
      setError('')
      setData(null)

      messagesApi
        .summarizeMessage(messageId)
        .then((res) => {
          setData(res.data.result)
        })
        .catch((err) => {
          setError('Có lỗi xảy ra khi AI đọc tài liệu này. Vui lòng thử lại.')
          console.error(err)
        })
        .finally(() => {
          setLoading(false)
        })
    }
  }, [isOpen, messageId])

  const getIcon = (type?: string) => {
    if (type === 'document') return <FileText className='w-5 h-5 text-blue-500' />
    if (type === 'image') return <ImageIcon className='w-5 h-5 text-green-500' />
    if (type === 'spreadsheet') return <Table className='w-5 h-5 text-emerald-500' />
    return <Info className='w-5 h-5 text-gray-500' />
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className='max-w-md bg-white dark:bg-gray-900 rounded-xl shadow-2xl'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2 text-xl font-bold bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent'>
            ✨ AI Phân tích tài liệu
          </DialogTitle>
        </DialogHeader>

        <div className='p-2'>
          {loading && (
            <div className='flex flex-col items-center justify-center py-8 space-y-4'>
              <Loader2 className='w-10 h-10 animate-spin text-indigo-500' />
              <p className='text-sm text-gray-500 animate-pulse'>AI đang đọc nội dung...</p>
            </div>
          )}

          {error && (
            <div className='p-4 text-sm text-red-600 bg-red-50 rounded-lg dark:bg-red-900/20 dark:text-red-400'>
              {error}
            </div>
          )}

          {data && !loading && (
            <div className='space-y-4'>
              <div className='flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-gray-800'>
                {getIcon(data.sourceType)}
                <span className='font-semibold text-gray-700 dark:text-gray-300 capitalize'>
                  Loại:{' '}
                  {data.sourceType === 'document'
                    ? 'Tài liệu văn bản'
                    : data.sourceType === 'spreadsheet'
                      ? 'Bảng tính'
                      : 'Hình ảnh'}
                </span>
              </div>

              <div>
                <h4 className='font-semibold text-gray-900 dark:text-white mb-2'>Tóm tắt nội dung:</h4>
                <p className='text-sm text-gray-600 dark:text-gray-300 leading-relaxed bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border border-gray-100 dark:border-gray-700'>
                  {data.summary}
                </p>
              </div>

              {data.keyPoints && data.keyPoints.length > 0 && (
                <div>
                  <h4 className='font-semibold text-gray-900 dark:text-white mb-2'>Các ý chính:</h4>
                  <ul className='space-y-2'>
                    {data.keyPoints.map((point, idx) => (
                      <li key={idx} className='flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300'>
                        <span className='text-indigo-500 mt-0.5'>•</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
