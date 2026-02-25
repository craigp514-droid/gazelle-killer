'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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

// Scoring functions
function calculateReadingLevel(text: string): number {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
  const words = text.split(/\s+/).filter(w => w.length > 0)
  if (sentences.length === 0 || words.length === 0) return 0
  const syllables = words.reduce((count, word) => count + countSyllables(word), 0)
  const grade = 0.39 * (words.length / sentences.length) + 11.8 * (syllables / words.length) - 15.59
  return Math.max(1, Math.min(16, Math.round(grade)))
}

function countSyllables(word: string): number {
  word = word.toLowerCase().replace(/[^a-z]/g, '')
  if (word.length <= 3) return 1
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '')
  const matches = word.match(/[aeiouy]{1,2}/g)
  return matches ? matches.length : 1
}

function calculateHumanScore(text: string): number {
  let score = 100
  const aiPhrases = ['i hope this email finds you', 'i wanted to reach out', 'please do not hesitate', 'feel free to', 'at your earliest convenience']
  const lowerText = text.toLowerCase()
  aiPhrases.forEach(phrase => { if (lowerText.includes(phrase)) score -= 8 })
  const contractions = (text.match(/\b(I'm|we're|you're|don't|can't|won't)\b/gi) || []).length
  score += contractions * 3
  return Math.max(0, Math.min(100, score))
}

export function EmailBuilder({ company, signals, open, onOpenChange }: EmailBuilderProps) {
  const [intro, setIntro] = useState('')
  const [noticeStatement, setNoticeStatement] = useState('')
  const [valueAddition, setValueAddition] = useState<'none' | 'general' | 'selling'>('none')
  const [selectedGeneralValue, setSelectedGeneralValue] = useState('')
  const [sellingPointKeyword, setSellingPointKeyword] = useState('')
  const [sellingPointText, setSellingPointText] = useState('')
  const [close, setClose] = useState('')
  
  const [editingSection, setEditingSection] = useState<'intro' | 'notice' | 'close' | null>(null)
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  
  const [introSnippets, setIntroSnippets] = useState<Snippet[]>([])
  const [closeSnippets, setCloseSnippets] = useState<Snippet[]>([])
  
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [onboardingChecked, setOnboardingChecked] = useState(false)
  
  const [savingSnippet, setSavingSnippet] = useState<'intro' | 'close' | null>(null)
  const [snippetName, setSnippetName] = useState('')

  // Build the context paragraph
  const buildContextParagraph = () => {
    let parts = []
    if (noticeStatement) parts.push(noticeStatement)
    if (valueAddition === 'general' && selectedGeneralValue) {
      parts.push(selectedGeneralValue)
    } else if (valueAddition === 'selling' && sellingPointText) {
      parts.push(sellingPointText)
    }
    return parts.join(' ')
  }

  const contextParagraph = buildContextParagraph()
  const fullEmail = [intro, contextParagraph, close].filter(Boolean).join('\n\n')
  const wordCount = fullEmail.split(/\s+/).filter(w => w.length > 0).length
  const readingLevel = calculateReadingLevel(fullEmail)
  const humanScore = calculateHumanScore(fullEmail)

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

  const getScoreColor = (score: number, type: 'length' | 'reading' | 'human') => {
    if (type === 'length') return score >= 50 && score <= 120 ? 'bg-green-500' : score >= 30 && score <= 150 ? 'bg-yellow-500' : 'bg-red-500'
    if (type === 'reading') return score >= 6 && score <= 9 ? 'bg-green-500' : score >= 4 && score <= 11 ? 'bg-yellow-500' : 'bg-red-500'
    if (type === 'human') return score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
    return 'bg-slate-500'
  }

  if (showOnboarding) {
    return <EmailOnboarding open={true} onComplete={() => { setShowOnboarding(false); loadSnippets() }} />
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-orange-500" />
            Outreach Builder — {company.name}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
            )}

            {/* Intro */}
            <Card>
              <CardHeader className="py-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-slate-700">Intro</CardTitle>
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
                  <Textarea value={intro} onChange={(e) => setIntro(e.target.value)} className="min-h-[60px] text-sm" />
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

            {/* "I noticed..." Statement */}
            <Card className="border-orange-200 bg-orange-50/50">
              <CardHeader className="py-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-slate-700">
                    "I noticed..." <span className="text-orange-500 text-xs ml-1">(AI)</span>
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={generateNotice} disabled={loading !== null} className="h-7 text-xs bg-white">
                      {loading === 'notice' ? <RefreshCw className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
                      Generate
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingSection(editingSection === 'notice' ? null : 'notice')} className="h-7 text-xs bg-white">
                      <Pencil className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {editingSection === 'notice' ? (
                  <Textarea value={noticeStatement} onChange={(e) => setNoticeStatement(e.target.value)} className="min-h-[60px] text-sm" placeholder="I noticed that..." />
                ) : (
                  <p className="text-sm text-slate-600 whitespace-pre-wrap min-h-[40px]">
                    {noticeStatement || <span className="text-slate-400 italic">Click Generate — AI will create a relevant talking point based on signals or company info</span>}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Optional Value Addition */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-medium text-slate-700">Add Value Statement? <span className="text-slate-400 text-xs">(optional)</span></CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <div className="flex gap-2">
                  <Button size="sm" variant={valueAddition === 'none' ? 'default' : 'outline'} onClick={() => setValueAddition('none')} className="text-xs">
                    Keep it short
                  </Button>
                  <Button size="sm" variant={valueAddition === 'general' ? 'default' : 'outline'} onClick={() => setValueAddition('general')} className="text-xs">
                    <Plus className="h-3 w-3 mr-1" /> General value
                  </Button>
                  <Button size="sm" variant={valueAddition === 'selling' ? 'default' : 'outline'} onClick={() => setValueAddition('selling')} className="text-xs">
                    <Plus className="h-3 w-3 mr-1" /> Selling point
                  </Button>
                </div>

                {valueAddition === 'general' && (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-500">Select a soft value statement:</p>
                    {GENERAL_VALUE_STATEMENTS.map((stmt, i) => (
                      <div
                        key={i}
                        onClick={() => setSelectedGeneralValue(stmt)}
                        className={`p-2 text-sm rounded-lg cursor-pointer border transition-all ${
                          selectedGeneralValue === stmt ? 'border-orange-400 bg-orange-50' : 'border-slate-200 hover:border-orange-200'
                        }`}
                      >
                        {stmt}
                      </div>
                    ))}
                  </div>
                )}

                {valueAddition === 'selling' && (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-500">Enter a keyword for your selling point:</p>
                    <div className="flex gap-2">
                      <Input
                        value={sellingPointKeyword}
                        onChange={(e) => setSellingPointKeyword(e.target.value)}
                        placeholder="e.g., incentives, talent, proximity..."
                        className="text-sm"
                      />
                      <Button size="sm" onClick={generateSellingPoint} disabled={!sellingPointKeyword || loading === 'selling'}>
                        {loading === 'selling' ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                      </Button>
                    </div>
                    {sellingPointText && (
                      <div className="p-2 text-sm bg-slate-50 rounded-lg border">
                        {sellingPointText}
                        <Button size="sm" variant="ghost" className="ml-2 h-6 text-xs" onClick={() => setEditingSection('notice')}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Close */}
            <Card>
              <CardHeader className="py-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-slate-700">Close / CTA</CardTitle>
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
                  <Textarea value={close} onChange={(e) => setClose(e.target.value)} className="min-h-[40px] text-sm" />
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

          {/* Scoring Panel */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Email Quality</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-600">📏 Length</span>
                    <span className={`font-medium ${wordCount >= 50 && wordCount <= 120 ? 'text-green-600' : 'text-yellow-600'}`}>{wordCount} words</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full ${getScoreColor(wordCount, 'length')} transition-all`} style={{ width: `${Math.min(100, (wordCount / 120) * 100)}%` }} />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">Target: 50-120 words</p>
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-600">📖 Reading Level</span>
                    <span className={`font-medium ${readingLevel >= 6 && readingLevel <= 9 ? 'text-green-600' : 'text-yellow-600'}`}>Grade {readingLevel}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full ${getScoreColor(readingLevel, 'reading')} transition-all`} style={{ width: `${Math.min(100, (readingLevel / 12) * 100)}%` }} />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">Target: Grade 6-9</p>
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-600">🤖 Human Score</span>
                    <span className={`font-medium ${humanScore >= 80 ? 'text-green-600' : 'text-yellow-600'}`}>{humanScore}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full ${getScoreColor(humanScore, 'human')} transition-all`} style={{ width: `${humanScore}%` }} />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">Target: 80%+ human</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Company Context</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex flex-wrap gap-1">
                  {company.industry && <Badge variant="secondary" className="text-[10px]">{company.industry}</Badge>}
                  {company.hq_state && <Badge variant="secondary" className="text-[10px]">{company.hq_state}</Badge>}
                  {signals.length > 0 && <Badge variant="secondary" className="text-[10px]">{signals.length} signal{signals.length !== 1 ? 's' : ''}</Badge>}
                </div>
                {company.messaging_hook && <p className="text-[10px] text-slate-500 line-clamp-2">Hook: {company.messaging_hook}</p>}
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
