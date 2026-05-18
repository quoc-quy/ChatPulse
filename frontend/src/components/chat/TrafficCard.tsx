import {
  AlertCircle,
  BookOpen,
  AlertTriangle,
  Car,
  ShieldAlert,
  Scale,
  Info,
  ExternalLink,
  ShieldMinus,
  MessageSquare,
  Lightbulb
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

// ─────────────────────────────────────────────
// TYPES (Đồng bộ với Backend mới nhất)
// ─────────────────────────────────────────────
export interface LegalReference {
  location: string
  documentId: string
  documentName: string
  url?: string
}

export interface PenaltyInfo {
  vehicleType: string
  fineRange: string
  additionalPenalties: string[]
  pointDeduction?: string
}

export interface TrafficViolationCard {
  type: 'violation'
  title: string
  behavior: string
  userFriendlyExplanation: string
  penalties: PenaltyInfo[]
  legalRefs: LegalReference[]
  practicalAdvice: string
  note?: string
}

export interface GeneralInfoCard {
  type: 'general'
  title: string
  summary: string
  userFriendlyExplanation: string
  details: string[]
  legalRefs: LegalReference[]
  practicalAdvice: string
  note?: string
}

export interface NotFoundCard {
  type: 'not_found'
  message: string
}

export type TrafficResponseCard = TrafficViolationCard | GeneralInfoCard | NotFoundCard

// ─────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────

const LegalReferencesList = ({ refs }: { refs: LegalReference[] }) => {
  if (!refs || refs.length === 0) return null
  return (
    <>
      <Separator className='bg-slate-200 dark:bg-slate-700/50 my-3' />
      <div className='bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700/50'>
        <h4 className='font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2 mb-2 text-sm'>
          <Scale className='w-4 h-4 text-blue-500' /> Căn cứ pháp lý
        </h4>
        <ul className='space-y-2 pl-1 text-xs text-slate-600 dark:text-slate-400'>
          {refs.map((ref, idx) => {
            const searchUrl = ref.documentId
              ? `https://thuvienphapluat.vn/page/tim-kiem-van-ban.aspx?keyword=${encodeURIComponent(ref.documentId)}`
              : ref.url

            return (
              <li key={idx} className='flex items-start gap-2'>
                <BookOpen className='w-3.5 h-3.5 mt-0.5 shrink-0 text-slate-400' />
                <div>
                  <span className='font-medium text-slate-700 dark:text-slate-300'>{ref.location}</span>
                  {ref.documentId && `, ${ref.documentId}`}
                  <p className='text-[11px] opacity-80 mt-0.5'>{ref.documentName}</p>
                  {searchUrl && (
                    <a
                      href={searchUrl}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='text-blue-500 hover:underline flex items-center gap-1 mt-0.5'
                    >
                      Tra cứu văn bản <ExternalLink className='w-3 h-3' />
                    </a>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </>
  )
}

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
export function TrafficCard({ data }: { data: TrafficResponseCard }) {
  if (!data) return null

  if (data.type === 'not_found') {
    return (
      <Card className='w-full max-w-2xl bg-yellow-50/50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-900/50 shadow-sm'>
        <CardContent className='p-4 flex items-start gap-3'>
          <AlertTriangle className='w-5 h-5 text-yellow-600 dark:text-yellow-500 shrink-0 mt-0.5' />
          <p className='text-sm text-yellow-800 dark:text-yellow-200/80 leading-relaxed'>{data.message}</p>
        </CardContent>
      </Card>
    )
  }

  if (data.type === 'general') {
    return (
      <Card className='w-full max-w-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border-blue-200 dark:border-blue-900/50 shadow-sm'>
        <CardHeader className='p-3 bg-blue-50/50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-900/30'>
          <CardTitle className='text-[16px] flex items-start gap-2 text-blue-700 dark:text-blue-400 leading-snug'>
            <Info className='w-5 h-5 shrink-0 mt-0.5 text-blue-500' />
            <span>{data.title || 'Thông tin tra cứu'}</span>
          </CardTitle>
        </CardHeader>

        <CardContent className='pt-4 space-y-4 text-sm'>
          {/* Summary & Explanation */}
          <div className='space-y-3'>
            <p className='font-semibold text-slate-800 dark:text-slate-200 text-[15px] leading-relaxed'>
              {data.summary}
            </p>
            {data.userFriendlyExplanation && (
              <div className='flex gap-2 text-slate-600 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-800/30 p-3 rounded-lg border border-slate-100 dark:border-slate-800'>
                <MessageSquare className='w-4 h-4 shrink-0 mt-0.5 opacity-70' />
                <p className='italic'>{data.userFriendlyExplanation}</p>
              </div>
            )}
          </div>

          {/* Details */}
          {data.details && data.details.length > 0 && (
            <ul className='space-y-2 pl-6 list-disc text-slate-700 dark:text-slate-300 marker:text-blue-400'>
              {data.details.map((detail, idx) => (
                <li key={idx} className='leading-relaxed'>
                  {detail}
                </li>
              ))}
            </ul>
          )}

          {/* Practical Advice */}
          {data.practicalAdvice && (
            <div className='bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300 p-3 rounded-md text-xs flex gap-2 border border-emerald-100 dark:border-emerald-800/50 mt-2'>
              <Lightbulb className='w-4 h-4 shrink-0' />
              <p className='font-medium leading-relaxed'>{data.practicalAdvice}</p>
            </div>
          )}

          {data.note && (
            <div className='bg-orange-50 dark:bg-orange-950/30 text-orange-800 dark:text-orange-300 p-3 rounded-md text-xs flex gap-2 border border-orange-100 dark:border-orange-900/50'>
              <AlertCircle className='w-4 h-4 shrink-0' />
              <p>{data.note}</p>
            </div>
          )}

          <LegalReferencesList refs={data.legalRefs} />
        </CardContent>
      </Card>
    )
  }

  if (data.type === 'violation') {
    return (
      <Card className='w-full max-w-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border-red-200 dark:border-red-900/50 shadow-sm overflow-hidden'>
        <CardHeader className='p-3 bg-red-50/50 dark:bg-red-950/30 border-b border-red-100 dark:border-red-900/30'>
          <CardTitle className='text-[16px] flex items-start gap-2 text-red-700 dark:text-red-400'>
            <ShieldAlert className='w-5 h-5 shrink-0 mt-0.5' />
            <div className='flex flex-col gap-1'>
              <span className='leading-snug'>{data.title || 'Mức Xử Phạt Vi Phạm'}</span>
              <span className='text-[13px] font-normal text-red-600/80 dark:text-red-400/80'>{data.behavior}</span>
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent className='pt-4 space-y-4 text-sm'>
          {/* User Friendly Explanation */}
          {data.userFriendlyExplanation && (
            <div className='flex gap-2 text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800'>
              <MessageSquare className='w-4 h-4 shrink-0 mt-0.5 text-slate-500' />
              <p className='italic leading-relaxed'>{data.userFriendlyExplanation}</p>
            </div>
          )}

          {/* Penalties List */}
          {data.penalties && data.penalties.length > 0 && (
            <div className='grid gap-3'>
              {data.penalties.map((penalty, idx) => (
                <div
                  key={idx}
                  className='bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3 shadow-sm flex flex-col sm:flex-row gap-3 sm:items-stretch'
                >
                  <div className='flex-1 space-y-2 sm:border-r border-slate-100 dark:border-slate-800 sm:pr-3'>
                    <div className='flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300'>
                      <Car className='w-4 h-4 opacity-70' /> {penalty.vehicleType}
                    </div>
                    <div className='text-lg font-bold text-red-600 dark:text-red-500 bg-red-50 dark:bg-red-950/20 px-2 py-1.5 rounded-md inline-block w-full'>
                      {penalty.fineRange}
                    </div>
                  </div>

                  <div className='flex-1 space-y-2'>
                    {penalty.additionalPenalties.length > 0 || penalty.pointDeduction ? (
                      <>
                        <p className='text-xs font-semibold text-slate-500 uppercase'>Hình phạt bổ sung</p>
                        <ul className='space-y-1.5 text-xs text-slate-600 dark:text-slate-400'>
                          {penalty.pointDeduction && (
                            <li className='flex items-start gap-1.5 text-orange-600 dark:text-orange-400 font-medium'>
                              <ShieldMinus className='w-3.5 h-3.5 mt-0.5 shrink-0' />
                              Trừ {penalty.pointDeduction}
                            </li>
                          )}
                          {penalty.additionalPenalties.map((add, i) => (
                            <li key={i} className='flex items-start gap-1.5'>
                              <span className='w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 mt-1 shrink-0' />
                              {add}
                            </li>
                          ))}
                        </ul>
                      </>
                    ) : (
                      <p className='text-xs text-slate-400 italic flex h-full items-center'>
                        Không có hình phạt bổ sung
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Practical Advice */}
          {data.practicalAdvice && (
            <div className='bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300 p-3 rounded-md text-xs flex gap-2 border border-emerald-100 dark:border-emerald-800/50 mt-2'>
              <Lightbulb className='w-4 h-4 shrink-0' />
              <p className='font-medium leading-relaxed'>{data.practicalAdvice}</p>
            </div>
          )}

          {data.note && (
            <div className='bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 p-3 rounded-md text-xs flex gap-2 border border-blue-100 dark:border-blue-800/50 mt-2'>
              <Info className='w-4 h-4 shrink-0' />
              <p>{data.note}</p>
            </div>
          )}

          <LegalReferencesList refs={data.legalRefs} />
        </CardContent>
      </Card>
    )
  }

  return null
}
