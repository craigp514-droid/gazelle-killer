'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Settings, Save, Loader2, Building2, Briefcase } from 'lucide-react'

interface OrgContext {
  org_type: 'edo' | 'service_provider' | null
  org_website: string
  org_name: string
  org_region: string
  org_value_props: string
}

export function ContextEditor() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [context, setContext] = useState<OrgContext>({
    org_type: null,
    org_website: '',
    org_name: '',
    org_region: '',
    org_value_props: '',
  })

  useEffect(() => {
    if (open) {
      loadContext()
    }
  }, [open])

  const loadContext = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/email/context')
      if (res.ok) {
        const data = await res.json()
        setContext({
          org_type: data.org_type || null,
          org_website: data.org_website || '',
          org_name: data.org_name || '',
          org_region: data.org_region || '',
          org_value_props: data.org_value_props || '',
        })
      }
    } catch (e) {
      console.error('Failed to load context:', e)
    } finally {
      setLoading(false)
    }
  }

  const saveContext = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/email/context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(context),
      })
      if (res.ok) {
        setOpen(false)
      }
    } catch (e) {
      console.error('Failed to save context:', e)
    } finally {
      setSaving(false)
    }
  }

  const updateContext = (updates: Partial<OrgContext>) => {
    setContext(prev => ({ ...prev, ...updates }))
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 text-xs">
          <Settings className="h-3 w-3 mr-1" />
          My Context
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Your Outreach Context</SheetTitle>
        </SheetHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="space-y-6 mt-6">
            {/* Org Type */}
            <div>
              <Label className="text-sm font-medium">Organization Type</Label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                <div
                  onClick={() => updateContext({ org_type: 'edo' })}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    context.org_type === 'edo' 
                      ? 'border-orange-400 bg-orange-50' 
                      : 'border-slate-200 hover:border-orange-200'
                  }`}
                >
                  <Building2 className="h-5 w-5 text-orange-500 mb-1" />
                  <p className="text-sm font-medium">EDO</p>
                  <p className="text-xs text-slate-500">Economic Development</p>
                </div>
                <div
                  onClick={() => updateContext({ org_type: 'service_provider' })}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    context.org_type === 'service_provider' 
                      ? 'border-orange-400 bg-orange-50' 
                      : 'border-slate-200 hover:border-orange-200'
                  }`}
                >
                  <Briefcase className="h-5 w-5 text-orange-500 mb-1" />
                  <p className="text-sm font-medium">Service Provider</p>
                  <p className="text-xs text-slate-500">Consultant / Advisor</p>
                </div>
              </div>
            </div>

            {/* Org Name */}
            <div>
              <Label htmlFor="orgName">Organization Name</Label>
              <Input
                id="orgName"
                value={context.org_name}
                onChange={(e) => updateContext({ org_name: e.target.value })}
                placeholder="e.g., Greater Phoenix Economic Council"
                className="mt-1"
              />
            </div>

            {/* Website */}
            <div>
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={context.org_website}
                onChange={(e) => updateContext({ org_website: e.target.value })}
                placeholder="https://yourorg.com"
                className="mt-1"
              />
            </div>

            {/* Region */}
            <div>
              <Label htmlFor="region">Region / State</Label>
              <Input
                id="region"
                value={context.org_region}
                onChange={(e) => updateContext({ org_region: e.target.value })}
                placeholder="e.g., Phoenix Metro, Arizona"
                className="mt-1"
              />
            </div>

            {/* Differentiators */}
            <div>
              <Label htmlFor="valueProps">
                {context.org_type === 'edo' ? 'Key Differentiators' : 'Services & Value Proposition'}
              </Label>
              <Textarea
                id="valueProps"
                value={context.org_value_props}
                onChange={(e) => updateContext({ org_value_props: e.target.value })}
                placeholder={context.org_type === 'edo'
                  ? "e.g., Strong automotive supply chain, skilled workforce, speed to market..."
                  : "e.g., Site selection, incentive negotiation, real estate advisory..."
                }
                className="mt-1"
                rows={4}
              />
              {context.org_type === 'edo' && (
                <p className="text-xs text-slate-500 mt-1">
                  List industry-specific strengths or general advantages that make your region stand out
                </p>
              )}
            </div>

            {/* Future: Selling point usage tracking would go here */}
            {/* 
            <div>
              <Label>Selling Point Insights</Label>
              <p className="text-xs text-slate-500 mt-1">
                As you use selling points, we'll learn which work best for different industries.
              </p>
            </div>
            */}

            {/* Save Button */}
            <Button 
              onClick={saveContext} 
              disabled={saving}
              className="w-full"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Context
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
