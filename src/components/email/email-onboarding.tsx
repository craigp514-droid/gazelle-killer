'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Building2, Briefcase, Globe, Sparkles, Check, Loader2 } from 'lucide-react'

interface EmailOnboardingProps {
  open: boolean
  onComplete: () => void
}

type OrgType = 'edo' | 'service_provider' | null

interface OrgData {
  orgType: OrgType
  orgWebsite: string
  orgName: string
  orgRegion: string
  orgValueProps: string
  defaultIntro: string
  defaultClose: string
}

export function EmailOnboarding({ open, onComplete }: EmailOnboardingProps) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [scraping, setScraping] = useState(false)
  
  const [data, setData] = useState<OrgData>({
    orgType: null,
    orgWebsite: '',
    orgName: '',
    orgRegion: '',
    orgValueProps: '',
    defaultIntro: '',
    defaultClose: '',
  })

  const updateData = (updates: Partial<OrgData>) => {
    setData(prev => ({ ...prev, ...updates }))
  }

  const scrapeWebsite = async () => {
    if (!data.orgWebsite) return
    
    setScraping(true)
    try {
      const res = await fetch('/api/email/scrape-org', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: data.orgWebsite }),
      })
      
      if (res.ok) {
        const scraped = await res.json()
        updateData({
          orgName: scraped.name || data.orgName,
          orgRegion: scraped.region || data.orgRegion,
          orgValueProps: scraped.valueProps || data.orgValueProps,
        })
      }
    } catch (e) {
      console.error('Failed to scrape:', e)
    } finally {
      setScraping(false)
    }
  }

  const generateIntro = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/email/generate-snippet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'intro',
          orgType: data.orgType,
          orgName: data.orgName,
          orgRegion: data.orgRegion,
        }),
      })
      
      if (res.ok) {
        const result = await res.json()
        updateData({ defaultIntro: result.content })
      }
    } catch (e) {
      console.error('Failed to generate intro:', e)
    } finally {
      setLoading(false)
    }
  }

  const generateClose = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/email/generate-snippet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'close',
          orgType: data.orgType,
        }),
      })
      
      if (res.ok) {
        const result = await res.json()
        updateData({ defaultClose: result.content })
      }
    } catch (e) {
      console.error('Failed to generate close:', e)
    } finally {
      setLoading(false)
    }
  }

  const saveAndComplete = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/email/save-onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      
      if (res.ok) {
        onComplete()
      }
    } catch (e) {
      console.error('Failed to save:', e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Set Up Your Outreach</DialogTitle>
        </DialogHeader>

        {/* Progress indicator */}
        <div className="flex items-center gap-2 mb-4">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-2 flex-1 rounded-full ${
                s <= step ? 'bg-orange-500' : 'bg-slate-200'
              }`}
            />
          ))}
        </div>

        {/* Step 1: Org Type */}
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-slate-600">What type of organization are you?</p>
            
            <div className="grid gap-4 md:grid-cols-2">
              <Card
                className={`cursor-pointer transition-all ${
                  data.orgType === 'edo'
                    ? 'ring-2 ring-orange-500 bg-orange-50'
                    : 'hover:border-orange-300'
                }`}
                onClick={() => updateData({ orgType: 'edo' })}
              >
                <CardHeader>
                  <Building2 className="h-8 w-8 text-orange-500 mb-2" />
                  <CardTitle className="text-lg">Economic Development Organization</CardTitle>
                  <CardDescription>
                    State, regional, or local EDO attracting businesses to your area
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card
                className={`cursor-pointer transition-all ${
                  data.orgType === 'service_provider'
                    ? 'ring-2 ring-orange-500 bg-orange-50'
                    : 'hover:border-orange-300'
                }`}
                onClick={() => updateData({ orgType: 'service_provider' })}
              >
                <CardHeader>
                  <Briefcase className="h-8 w-8 text-orange-500 mb-2" />
                  <CardTitle className="text-lg">Service Provider</CardTitle>
                  <CardDescription>
                    Site selection consultant, real estate, incentives advisory, etc.
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={() => setStep(2)}
                disabled={!data.orgType}
              >
                Continue
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Website & Org Info */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-slate-600">Tell us about your organization</p>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="website">Organization Website</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="website"
                    placeholder="https://yourorg.com"
                    value={data.orgWebsite}
                    onChange={(e) => updateData({ orgWebsite: e.target.value })}
                  />
                  <Button
                    variant="outline"
                    onClick={scrapeWebsite}
                    disabled={!data.orgWebsite || scraping}
                  >
                    {scraping ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Globe className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  We'll extract key info to help personalize your outreach
                </p>
              </div>

              <div>
                <Label htmlFor="orgName">Organization Name</Label>
                <Input
                  id="orgName"
                  placeholder="e.g., Greater Phoenix Economic Council"
                  value={data.orgName}
                  onChange={(e) => updateData({ orgName: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="region">Region / State</Label>
                <Input
                  id="region"
                  placeholder="e.g., Phoenix Metro, Arizona"
                  value={data.orgRegion}
                  onChange={(e) => updateData({ orgRegion: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="valueProps">
                  {data.orgType === 'edo' 
                    ? 'Key Differentiators' 
                    : 'Your Services & Value Proposition'}
                </Label>
                <Textarea
                  id="valueProps"
                  placeholder={data.orgType === 'edo'
                    ? "e.g., Strong automotive supply chain, skilled manufacturing workforce, speed to market..."
                    : "e.g., Site selection, incentive negotiation, real estate advisory..."
                  }
                  value={data.orgValueProps}
                  onChange={(e) => updateData({ orgValueProps: e.target.value })}
                  className="mt-1"
                  rows={3}
                />
                {data.orgType === 'edo' && (
                  <p className="text-xs text-slate-500 mt-1">
                    List what makes your region stand out — industry-specific strengths (e.g., "EV battery supply chain") or general advantages (e.g., "central US location, low cost of living")
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button
                onClick={() => setStep(3)}
                disabled={!data.orgName}
              >
                Continue
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Default Intro */}
        {step === 3 && (
          <div className="space-y-4">
            <p className="text-slate-600">Set your standard intro paragraph</p>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="intro">Intro Paragraph</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={generateIntro}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-1" />
                  )}
                  Generate
                </Button>
              </div>
              <Textarea
                id="intro"
                placeholder="Hi {first_name}, I'm [your name] with [org]. I came across [company] and..."
                value={data.defaultIntro}
                onChange={(e) => updateData({ defaultIntro: e.target.value })}
                rows={4}
              />
              <p className="text-xs text-slate-500">
                This opens your emails. Keep it short — the AI will personalize paragraph 2.
              </p>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button
                onClick={() => setStep(4)}
                disabled={!data.defaultIntro}
              >
                Continue
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Default Close */}
        {step === 4 && (
          <div className="space-y-4">
            <p className="text-slate-600">Set your standard closing paragraph</p>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="close">Close / CTA</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={generateClose}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-1" />
                  )}
                  Generate
                </Button>
              </div>
              <Textarea
                id="close"
                placeholder="Worth a 15-minute call to explore? Happy to work around your schedule."
                value={data.defaultClose}
                onChange={(e) => updateData({ defaultClose: e.target.value })}
                rows={3}
              />
              <p className="text-xs text-slate-500">
                Your call-to-action. Keep it low-pressure.
              </p>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(3)}>
                Back
              </Button>
              <Button
                onClick={saveAndComplete}
                disabled={!data.defaultClose || loading}
                className="bg-orange-500 hover:bg-orange-600"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Complete Setup
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
