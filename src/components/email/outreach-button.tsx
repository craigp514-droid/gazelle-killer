'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Mail } from 'lucide-react'
import { EmailBuilder } from './email-builder'

interface Company {
  id: string
  name: string
  website?: string
  industry?: string
  hq_state?: string
  messaging_hook?: string
  linkedin_description?: string
}

interface Signal {
  signal_type: string
  title: string
  signal_date: string
}

interface OutreachButtonProps {
  company: Company
  signals: Signal[]
}

export function OutreachButton({ company, signals }: OutreachButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="bg-orange-500 hover:bg-orange-600"
      >
        <Mail className="h-4 w-4 mr-2" />
        Generate Outreach
      </Button>
      
      <EmailBuilder
        company={company}
        signals={signals}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  )
}
