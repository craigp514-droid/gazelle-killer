'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Copy,
  Check,
  RefreshCw,
  Pencil,
  Save,
  Sparkles,
  X,
  Plus,
} from 'lucide-react'
import { EmailOnboarding } from './email-onboarding'
import { ContextEditor } from './context-editor'

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

interface Snippet {
  id: string
  name: string
  content: string
  snippet_type: 'intro' | 'close'
  is_default: boolean
}

interface EmailBuilderProps {
  company: Company
  signals: Signal[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

const GENERAL_VALUE_STATEMENTS = [
  "We'd love to share more about how our region might align with your growth goals.",
  "We'd love to explore your outlook and share how our region might support your plans.",
  "Happy to share what we're seeing in the industry and how we might be a fit.",
  "Would be glad to provide some context on our region if it's ever relevant.",
]

export function EmailBuilder({ company, signals, open, onOpenChange }: EmailBuilderProps) {
  const [intro, setIntro] = useState('')
  const [noticeStatement, setNoticeStatement] = useState('')
  const [valueAddition, setValueAddition] = useState<'none' | 'general' | 'selling'>('none')
  const [selectedGeneralValue, setSelectedGeneralValue] = useState('')
  const [sellingPointKeyword, setSellingPointKeyword] = useState('')
  const [sellingPointText, setSellingPointText] = useState('')
  const [close, setClose] = useState('')
  
  const [editingSection, setEditingSection] = useState<'intro' | 'p2' | 'close' | null>(null)
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  
  const [introSnippets, setIntroSnippets] = useState<Snippet[]>([])
  const [closeSnippets, setCloseSnippets] = useState<Snippet[]>([])
  
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [onboardingChecked, setOnboardingChecked] = useState(false)
  
  const [savingSnippet, setSavingSnippet] = useState<'intro' | 'close' | null>(null)
  const [snippetName, setSnippetName] = useState('')

  // Build paragraph 2
  const buildParagraph2 = () => {
    let parts = []
    if (noticeStatement) parts.push(noticeStatement)
    if (valueAddition === 'general' && selectedGeneralValue) {
      parts.push(selectedGeneralValue)
    } else if (valueAddition === 'selling' && sellingPointText) {
      parts.push(sellingPointText)
    }
    return parts.join(' ')
  }

  const paragraph2 = buildParagraph2()
  const fullEmail = [intro, paragraph2, close].filter(Boolean).join('\n\n')
  const wordCount = fullEmail.split(/\s+/).filter(w => w.length > 0).length

  useEffect(() => {
    if (open && !onboardingChecked) {
      checkOnboarding()
    }
  }, [open, onboardingChecked])

  const checkOnboarding = async () => {
    try {
      const res = await fetch('/api/email/check-onboarding')
      if (res.ok) {
        const data = await res.json()
        setOnboardingChecked(true)
        if (!data.complete) {
          setShowOnboarding(true)
        } else {
          loadSnippets()
        }
      }
    } catch (e) {
      setOnboardingChecked(true)
    }
  }

  const loadSnippets = async () => {
    try {
      const res = await fetch('/api/email/snippets')
      if (res.ok) {
        const data = await res.json()
        const intros = data.snippets?.filter((s: Snippet) => s.snippet_type === 'intro') || []
        const closes = data.snippets?.filter((s: Snippet) => s.snippet_type === 'close') || []
        setIntroSnippets(intros)
        setCloseSnippets(closes)
        const defaultIntro = intros.find((s: Snippet) => s.is_default)
        const defaultClose = closes.find((s: Snippet) => s.is_default)
        if (defaultIntro && !intro) setIntro(defaultIntro.content)
        if (defaultClose && !close) setClose(defaultClose.content)
      }
    } catch (e) {
      console.error('Failed to load snippets:', e)
    }
  }

  const generateNotice = async () => {
    setLoading('notice')
    setError(null)
    try {
      const res = await fetch('/api/email/generate-notice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company, signals }),
      })
      const data = await res.json()
      if (res.ok) {
        setNoticeStatement(data.content || '')
      } else {
        setError(data.error || 'Failed to generate')
      }
    } catch (e) {
      setError('Failed to connect')
    } finally {
      setLoading(null)
    }
  }

  const generateSellingPoint = async () => {
    if (!sellingPointKeyword) return
    setLoading('selling')
    setError(null)
    try {
      const res = await fetch('/api/email/generate-selling-point', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: sellingPointKeyword, company }),
      })
      const data = await res.json()
      if (res.ok) {
        setSellingPointText(data.content || '')
      } else {
        setError(data.error || 'Failed to generate')
      }
    } catch (e) {
      setError('Failed to connect')
    } finally {
      setLoading(null)
    }
  }

  const generateIntro = async () => {
    setLoading('intro')
    try {
      const res = await fetch('/api/email/generate-snippet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'intro' }),
      })
      const data = await res.json()
      if (res.ok) setIntro(data.content || '')
    } catch (e) {
      setError('Failed to generate intro')
    } finally {
      setLoading(null)
    }
  }

  const generateClose = async () => {
    setLoading('close')
    try {
      const res = await fetch('/api/email/generate-snippet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'close' }),
      })
      const data = await res.json()
      if (res.ok) setClose(data.content || '')
    } catch (e) {
      setError('Failed to generate close')
    } finally {
      setLoading(null)
    }
  }

  const saveSnippet = async (type: 'intro' | 'close') => {
    const content = type === 'intro' ? intro : close
    if (!content || !snippetName) return
    try {
      await fetch('/api/email/snippets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snippet_type: type, name: snippetName, content, is_default: false }),
      })
      await loadSnippets()
      setSavingSnippet(null)
      setSnippetName('')
    } catch (e) {
      console.error('Failed to save snippet:', e)
    }
  }

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(fullEmail)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (showOnboarding) {
    return <EmailOnboarding open={true} onComplete={() => { setShowOnboarding(false); loadSnippets() }} />
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-orange-500" />
              Outreach Builder — {company.name}
            </DialogTitle>
            <ContextEditor />
          </div>
        </DialogHeader>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
            )}

            {/* PARAGRAPH 1 - Blue */}
            <Card className="border-l-4 border-l-blue-400 bg-blue-50/30">
              <CardHeader className="py-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-400 text-white text-xs flex items-center justify-center font-bold">1</span>
                    Intro
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {introSnippets.length > 0 && (
                      <Select onValueChange={(id) => {
                        const s = introSnippets.find(x => x.id === id)
                        if (s) setIntro(s.content)
                      }}>
                        <SelectTrigger className="h-7 w-[100px] text-xs"><SelectValue placeholder="Saved" /></SelectTrigger>
                        <SelectContent>
                          {introSnippets.map(s => <SelectItem key={s.id} value={s.id} className="text-xs">{s.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}
                    <Button size="sm" variant="outline" onClick={generateIntro} disabled={loading !== null} className="h-7 text-xs">
                      {loading === 'intro' ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingSection(editingSection === 'intro' ? null : 'intro')} className="h-7 text-xs">
                      <Pencil className="h-3 w-3" />
                    </Button>
                    {intro && <Button size="sm" variant="ghost" onClick={() => setSavingSnippet('intro')} className="h-7 text-xs"><Save className="h-3 w-3" /></Button>}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {editingSection === 'intro' ? (
                  <Textarea value={intro} onChange={(e) => setIntro(e.target.value)} className="min-h-[60px] text-sm bg-white" />
                ) : (
                  <p className="text-sm text-slate-600 whitespace-pre-wrap min-h-[40px]">
                    {intro || <span className="text-slate-400 italic">Select saved intro or generate one</span>}
                  </p>
                )}
                {savingSnippet === 'intro' && (
                  <div className="mt-2 flex gap-2">
                    <Input value={snippetName} onChange={(e) => setSnippetName(e.target.value)} placeholder="Name..." className="h-7 text-sm" />
                    <Button size="sm" onClick={() => saveSnippet('intro')} className="h-7">Save</Button>
                    <Button size="sm" variant="ghost" onClick={() => setSavingSnippet(null)} className="h-7"><X className="h-3 w-3" /></Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* PARAGRAPH 2 - Orange */}
            <Card className="border-l-4 border-l-orange-400 bg-orange-50/30">
              <CardHeader className="py-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-orange-400 text-white text-xs flex items-center justify-center font-bold">2</span>
                    Context
                    <span className="text-orange-500 text-xs font-normal">(AI-assisted)</span>
                  </CardTitle>
                  <Button size="sm" variant="outline" onClick={() => setEditingSection(editingSection === 'p2' ? null : 'p2')} className="h-7 text-xs">
                    <Pencil className="h-3 w-3" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-4">
                {editingSection === 'p2' ? (
                  <Textarea 
                    value={paragraph2} 
                    onChange={(e) => {
                      setNoticeStatement(e.target.value)
                      setValueAddition('none')
                    }} 
                    className="min-h-[80px] text-sm bg-white" 
                    placeholder="Write your context paragraph..."
                  />
                ) : (
                  <>
                    {/* Talking Point Generator */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-slate-500 font-medium">Talking Point</p>
                        <Button size="sm" variant="outline" onClick={generateNotice} disabled={loading !== null} className="h-7 text-xs bg-white">
                          {loading === 'notice' ? <RefreshCw className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
                          Generate
                        </Button>
                      </div>
                      {noticeStatement ? (
                        <p className="text-sm text-slate-600 p-2 bg-white rounded border">{noticeStatement}</p>
                      ) : (
                        <p className="text-sm text-slate-400 italic p-2">Click Generate — AI creates a relevant talking point from signals or company info</p>
                      )}
                    </div>

                    {/* Value Addition */}
                    <div className="space-y-2 pt-2 border-t border-orange-200">
                      <p className="text-xs text-slate-500 font-medium">Add Value Statement? <span className="text-slate-400 font-normal">(optional)</span></p>
                      <div className="flex gap-2 flex-wrap">
                        <Button size="sm" variant={valueAddition === 'none' ? 'default' : 'outline'} onClick={() => setValueAddition('none')} className="text-xs h-7">
                          Keep it short
                        </Button>
                        <Button size="sm" variant={valueAddition === 'general' ? 'default' : 'outline'} onClick={() => setValueAddition('general')} className="text-xs h-7">
                          <Plus className="h-3 w-3 mr-1" /> General value
                        </Button>
                        <Button size="sm" variant={valueAddition === 'selling' ? 'default' : 'outline'} onClick={() => setValueAddition('selling')} className="text-xs h-7">
                          <Plus className="h-3 w-3 mr-1" /> Selling point
                        </Button>
                      </div>

                      {valueAddition === 'general' && (
                        <div className="space-y-2 mt-2">
                          {GENERAL_VALUE_STATEMENTS.map((stmt, i) => (
                            <div
                              key={i}
                              onClick={() => setSelectedGeneralValue(stmt)}
                              className={`p-2 text-sm rounded-lg cursor-pointer border transition-all ${
                                selectedGeneralValue === stmt ? 'border-orange-400 bg-orange-100' : 'border-slate-200 bg-white hover:border-orange-200'
                              }`}
                            >
                              {stmt}
                            </div>
                          ))}
                        </div>
                      )}

                      {valueAddition === 'selling' && (
                        <div className="space-y-2 mt-2">
                          <div className="flex gap-2">
                            <Input
                              value={sellingPointKeyword}
                              onChange={(e) => setSellingPointKeyword(e.target.value)}
                              placeholder="e.g., incentives, talent, proximity..."
                              className="text-sm bg-white"
                            />
                            <Button size="sm" onClick={generateSellingPoint} disabled={!sellingPointKeyword || loading === 'selling'}>
                              {loading === 'selling' ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                            </Button>
                          </div>
                          {sellingPointText && (
                            <p className="text-sm text-slate-600 p-2 bg-white rounded border">{sellingPointText}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* PARAGRAPH 3 - Green */}
            <Card className="border-l-4 border-l-green-400 bg-green-50/30">
              <CardHeader className="py-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-green-400 text-white text-xs flex items-center justify-center font-bold">3</span>
                    Close / CTA
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {closeSnippets.length > 0 && (
                      <Select onValueChange={(id) => {
                        const s = closeSnippets.find(x => x.id === id)
                        if (s) setClose(s.content)
                      }}>
                        <SelectTrigger className="h-7 w-[100px] text-xs"><SelectValue placeholder="Saved" /></SelectTrigger>
                        <SelectContent>
                          {closeSnippets.map(s => <SelectItem key={s.id} value={s.id} className="text-xs">{s.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}
                    <Button size="sm" variant="outline" onClick={generateClose} disabled={loading !== null} className="h-7 text-xs">
                      {loading === 'close' ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingSection(editingSection === 'close' ? null : 'close')} className="h-7 text-xs">
                      <Pencil className="h-3 w-3" />
                    </Button>
                    {close && <Button size="sm" variant="ghost" onClick={() => setSavingSnippet('close')} className="h-7 text-xs"><Save className="h-3 w-3" /></Button>}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {editingSection === 'close' ? (
                  <Textarea value={close} onChange={(e) => setClose(e.target.value)} className="min-h-[40px] text-sm bg-white" />
                ) : (
                  <p className="text-sm text-slate-600 whitespace-pre-wrap min-h-[30px]">
                    {close || <span className="text-slate-400 italic">Select saved close or generate one</span>}
                  </p>
                )}
                {savingSnippet === 'close' && (
                  <div className="mt-2 flex gap-2">
                    <Input value={snippetName} onChange={(e) => setSnippetName(e.target.value)} placeholder="Name..." className="h-7 text-sm" />
                    <Button size="sm" onClick={() => saveSnippet('close')} className="h-7">Save</Button>
                    <Button size="sm" variant="ghost" onClick={() => setSavingSnippet(null)} className="h-7"><X className="h-3 w-3" /></Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Copy Button */}
            {fullEmail && (
              <Button onClick={copyToClipboard} className="w-full" variant={copied ? 'secondary' : 'default'}>
                {copied ? <><Check className="h-4 w-4 mr-2" /> Copied!</> : <><Copy className="h-4 w-4 mr-2" /> Copy to Clipboard</>}
              </Button>
            )}
          </div>

          {/* Preview Panel */}
          <div className="space-y-4">
            {/* Optimal Email Length */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Optimal Email Length</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-600">Words</span>
                  <span className={`font-medium ${wordCount >= 50 && wordCount <= 120 ? 'text-green-600' : wordCount > 0 ? 'text-yellow-600' : 'text-slate-400'}`}>
                    {wordCount} / 50-120
                  </span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all ${
                      wordCount >= 50 && wordCount <= 120 ? 'bg-green-500' : 
                      wordCount > 120 ? 'bg-red-500' : 
                      wordCount > 0 ? 'bg-yellow-500' : 'bg-slate-200'
                    }`} 
                    style={{ width: `${Math.min(100, (wordCount / 120) * 100)}%` }} 
                  />
                </div>
              </CardContent>
            </Card>

            {/* Full Email Preview */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Email Preview</CardTitle>
                  {fullEmail && (
                    <Button size="sm" variant="outline" onClick={copyToClipboard} className="h-7 text-xs">
                      {copied ? <><Check className="h-3 w-3 mr-1" /> Copied</> : <><Copy className="h-3 w-3 mr-1" /> Copy</>}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {fullEmail ? (
                  <div className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-lg border min-h-[200px] space-y-3">
                    {intro && <p className="border-l-2 border-blue-400 pl-2">{intro}</p>}
                    {paragraph2 && <p className="border-l-2 border-orange-400 pl-2">{paragraph2}</p>}
                    {close && <p className="border-l-2 border-green-400 pl-2">{close}</p>}
                  </div>
                ) : (
                  <div className="text-sm text-slate-400 italic bg-slate-50 p-4 rounded-lg border min-h-[200px]">
                    Your email will appear here as you build it...
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
