import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ChevronRight } from 'lucide-react'
import { useState } from 'react'

interface MediaCollapsibleProps {
  title: string
  icon: any
  emptyText: string
  defaultOpen?: boolean
}

export function MediaCollapsible({ title, icon: Icon, emptyText, defaultOpen = true }: MediaCollapsibleProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
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
        <div className='flex flex-col items-center justify-center py-6 text-center gap-3 bg-muted/20 mx-4 mb-4 rounded-lg border border-dashed border-border/60'>
          <div className='p-3 bg-background rounded-full shadow-sm'>
            <Icon className='w-6 h-6 text-muted-foreground/50' />
          </div>
          <p className='text-[13px] text-muted-foreground px-4 leading-relaxed'>{emptyText}</p>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
