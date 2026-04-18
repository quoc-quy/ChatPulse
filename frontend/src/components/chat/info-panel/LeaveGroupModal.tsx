/* eslint-disable @typescript-eslint/no-explicit-any */
import { X, Loader2, AlertTriangle, ShieldCheck } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useState, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { ChatItem } from '@/context/app.context'
import { groupApi } from '@/apis/group.api'
import { toast } from 'sonner'

interface LeaveGroupModalProps {
  isOpen: boolean
  onClose: () => void
  chat?: ChatItem
  currentUserId?: string
  onLeaveSuccess?: () => void
  title?: string
  description?: string
  confirmText?: string
  onConfirm?: () => void
  mode?: 'leave_group' | 'unfriend' | 'disband'
}

export function LeaveGroupModal({
  isOpen,
  onClose,
  chat,
  currentUserId,
  onLeaveSuccess,
  title,
  description,
  confirmText,
  onConfirm,
  mode = 'leave_group'
}: LeaveGroupModalProps) {
  const [step, setStep] = useState<'confirm' | 'choose_admin'>('confirm')
  const [selectedAdminId, setSelectedAdminId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const resolvedTitle = title ?? (mode === 'disband' ? 'Giải tán nhóm' : 'Rời khỏi nhóm')
  const resolvedConfirmText = confirmText ?? (mode === 'disband' ? 'Giải tán nhóm' : 'Rời nhóm')

  const isAdmin = mode === 'leave_group' && chat ? String(chat.admin_id) === String(currentUserId) : false

  const otherMembers = useMemo(() => {
    if (mode !== 'leave_group' || !chat) return []
    return chat.participants?.filter((p: any) => String(p._id || p.user_id) !== String(currentUserId)) || []
  }, [chat?.participants, currentUserId, mode])

  useEffect(() => {
    if (isOpen) {
      setStep('confirm')
      setSelectedAdminId(null)
      setIsSubmitting(false)
    }
  }, [isOpen])

  const getInitials = (name: string) => {
    if (!name) return 'U'
    return name.charAt(0).toUpperCase()
  }

  const handleNextOrSubmit = async () => {
    // 1. Luồng Hủy kết bạn
    if (mode === 'unfriend' && onConfirm) {
      setIsSubmitting(true)
      try {
        await onConfirm()
        onClose()
      } catch (error) {
        console.error(error)
      } finally {
        setIsSubmitting(false)
      }
      return
    }

    // 2. Luồng Giải tán nhóm
    if (mode === 'disband' && chat) {
      setIsSubmitting(true)
      try {
        await groupApi.disbandGroup(chat.id)
        toast.success('Giải tán nhóm thành công')
        onLeaveSuccess?.()
        onClose()
      } catch (error) {
        console.error(error)
        toast.error('Lỗi khi giải tán nhóm')
      } finally {
        setIsSubmitting(false)
      }
      return
    }

    // 3. Luồng Rời nhóm
    if (mode === 'leave_group' && chat && onLeaveSuccess) {
      if (isAdmin && otherMembers.length > 0 && step === 'confirm') {
        setStep('choose_admin')
        return
      }

      setIsSubmitting(true)
      try {
        if (isAdmin && otherMembers.length > 0 && selectedAdminId) {
          await groupApi.promoteAdmin(chat.id, selectedAdminId)
        }
        const res = await groupApi.leaveGroup(chat.id)

        if (res?.data?.result?.deleted === true) {
          toast.success('Đã rời nhóm. Nhóm đã được xóa vì bạn là thành viên cuối cùng.')
        } else {
          toast.success('Đã rời khỏi nhóm thành công')
        }

        onLeaveSuccess()
        onClose()
      } catch (error) {
        console.error(error)
        toast.error('Có lỗi xảy ra khi rời nhóm')
      } finally {
        setIsSubmitting(false)
      }
    }
  }

  if (!isOpen) return null

  return createPortal(
    <div
      className='fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 animate-in fade-in duration-200'
      onClick={() => !isSubmitting && onClose()}
    >
      <div
        className='bg-background w-full max-w-[400px] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200'
        onClick={(e) => e.stopPropagation()}
      >
        {step === 'confirm' ? (
          <div className='p-6'>
            <div className={`flex items-center gap-3 mb-4 ${mode === 'disband' ? 'text-red-600' : 'text-destructive'}`}>
              <AlertTriangle className='w-6 h-6' />
              <h3 className='text-lg font-bold'>{resolvedTitle}</h3>
            </div>

            <p className='text-[15px] text-muted-foreground mb-6 leading-relaxed'>
              {description ? (
                description
              ) : mode === 'disband' ? (
                <>
                  Bạn có chắc chắn muốn giải tán nhóm{' '}
                  <span className='font-semibold text-foreground'>{chat?.name}</span> không?
                  <span className='block mt-3 text-[14px] text-red-500 font-medium p-3 bg-red-50 dark:bg-red-950/30 rounded-md border border-red-200/50'>
                    Hành động này không thể hoàn tác. Tất cả thành viên sẽ bị xóa khỏi nhóm.
                  </span>
                </>
              ) : (
                <>
                  Bạn có chắc chắn muốn rời khỏi nhóm{' '}
                  <span className='font-semibold text-foreground'>{chat?.name}</span> không?
                  {isAdmin && otherMembers.length > 0 && (
                    <span className='block mt-3 text-[14px] text-blue-500 font-medium p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200/50'>
                      Vì bạn là Trưởng nhóm, bạn cần chọn một Trưởng nhóm mới trước khi rời đi.
                    </span>
                  )}
                </>
              )}
            </p>

            <div className='flex items-center justify-end gap-3'>
              <button
                onClick={onClose}
                disabled={isSubmitting}
                className='px-4 py-2 rounded-md text-[14px] font-medium text-muted-foreground hover:bg-muted transition-colors'
              >
                Hủy
              </button>
              <button
                onClick={handleNextOrSubmit}
                disabled={isSubmitting}
                className='flex items-center justify-center gap-2 px-6 py-2 rounded-md text-[14px] font-medium text-white bg-destructive hover:bg-destructive/90 transition-all'
              >
                {isSubmitting && <Loader2 className='w-4 h-4 animate-spin' />}
                {mode === 'leave_group' && isAdmin && otherMembers.length > 0 && step === 'confirm'
                  ? 'Tiếp tục'
                  : resolvedConfirmText}
              </button>
            </div>
          </div>
        ) : (
          mode === 'leave_group' && (
            <div className='flex flex-col max-h-[80vh]'>
              <div className='flex h-14 items-center px-4 border-b border-border/40 relative shrink-0'>
                <ShieldCheck className='w-5 h-5 text-blue-500 mr-2' />
                <h2 className='text-[17px] font-semibold flex-1'>Chọn Trưởng nhóm mới</h2>
                <button
                  onClick={onClose}
                  className='p-1.5 rounded-full hover:bg-muted text-muted-foreground transition-colors'
                >
                  <X className='w-5 h-5' />
                </button>
              </div>

              <div className='flex-1 overflow-y-auto p-3 scroll-smooth'>
                <p className='px-1 pb-3 text-[13px] text-muted-foreground'>
                  Vui lòng chọn một thành viên để chuyển quyền Trưởng nhóm trước khi bạn rời đi.
                </p>
                <div className='flex flex-col gap-1'>
                  {otherMembers.map((member: any) => {
                    const memberId = String(member._id || member.user_id)
                    const isSelected = selectedAdminId === memberId
                    return (
                      <div
                        key={memberId}
                        onClick={() => setSelectedAdminId(memberId)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-muted/80'}`}
                      >
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'border-blue-500' : 'border-muted-foreground/40'}`}
                        >
                          {isSelected && <div className='w-2.5 h-2.5 bg-blue-500 rounded-full' />}
                        </div>
                        <Avatar className='h-10 w-10 border border-border'>
                          <AvatarImage src={member.avatar} />
                          <AvatarFallback className='text-xs bg-blue-100 text-blue-600'>
                            {getInitials(member.userName || member.fullName)}
                          </AvatarFallback>
                        </Avatar>
                        <span className='text-[14px] text-foreground font-medium flex-1 truncate'>
                          {member.userName || member.fullName}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className='border-t border-border/40 shrink-0 bg-background flex items-center justify-end gap-3 px-4 py-3'>
                <button
                  onClick={() => setStep('confirm')}
                  disabled={isSubmitting}
                  className='px-4 py-2 rounded-md text-[14px] font-medium text-muted-foreground hover:bg-muted transition-colors'
                >
                  Quay lại
                </button>
                <button
                  onClick={handleNextOrSubmit}
                  disabled={!selectedAdminId || isSubmitting}
                  className={`flex items-center justify-center gap-2 px-6 py-2 rounded-md text-[14px] font-medium text-white transition-all ${selectedAdminId && !isSubmitting ? 'bg-destructive hover:bg-destructive/90' : 'bg-destructive/50 cursor-not-allowed'}`}
                >
                  {isSubmitting && <Loader2 className='w-4 h-4 animate-spin' />}
                  Xác nhận & Rời nhóm
                </button>
              </div>
            </div>
          )
        )}
      </div>
    </div>,
    document.body
  )
}
