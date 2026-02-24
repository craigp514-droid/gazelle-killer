'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
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
  Settings,
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

// Flesch-Kincaid reading level calculation
function calculateReadingLevel(text: string): number {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
  const words = text.split(/\s+/).filter(w => w.length > 0)
  const syllables = words.reduce((count, word) => {
    return count + countSyllables(word)
  }, 0)
  
  if (sentences.length === 0 || words.length === 0) return 0
  
  const avgWordsPerSentence = words.length / sentences.length
  const avgSyllablesPerWord = syllables / words.length
  
  const grade = 0.39 * avgWordsPerSentence + 11.8 * avgSyllablesPerWord - 15.59
  return Math.max(1, Math.min(16, Math.round(grade)))
}

function countSyllables(word: string): number {
  word = word.toLowerCase().replace(/[^a-z]/g, '')
  if (word.length <= 3) return 1
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '')
  word = word.replace(/^y/, '')
  const matches = word.match(/[aeiouy]{1,2}/g)
  return matches ? matches.length : 1
}

// AI detection score (simplified heuristics)
function calculateHumanScore(text: string): number {
  let score = 100
  
  const aiPhrases = [
    'i hope this email finds you',
    'i wanted to reach out',
    'i am writing to',
    'please do not hesitate',
    'feel free to',
    'looking forward to hearing',
    'at your earliest convenience',
    'i would be happy to',
    'please let me know if',
  ]
  
  const lowerText = text.toLowerCase()
  aiPhrases.forEach(phrase => {
    if (lowerText.includes(phrase)) score -= 8
  })
  
  if (lowerText.includes('furthermore')) score -= 5
  if (lowerText.includes('moreover')) score -= 5
  if (lowerText.includes('in conclusion')) score -= 5
  if (lowerText.includes('regarding')) score -= 3
  
  const exclamations = (text.match(/!/g) || []).length
  if (exclamations > 2) score -= exclamations * 3
  
  const contractions = (text.match(/\b(I'm|we're|you're|don't|can't|won't|isn't|aren't)\b/gi) || []).length
  score += contractions * 3
  
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
  if (sentences.length > 2) {
    const lengths = sentences.map(s => s.trim().split(/\s+/).length)
    const variance = lengths.reduce((sum, len, _, arr) => {
      const avg = arr.reduce((a, b) => a + b, 0) / arr.length
      return sum + Math.abs(len - avg)
    }, 0) / lengths.length
    if (variance > 3) score += 5
  }
  
  return Math.max(0, Math.min(100, score))
}

export function EmailBuilder({ company, signals, open, onOpenChange }: EmailBuilderProps) {
  const [intro, setIntro] = useState('')
  const [context, setContext] = useState('')
  const [close, setClose] = useState('')
  const [editingSection, setEditingSection] = useState<'intro' | 'context' | 'close' | null>(null)
  const [loading, setLoading] = useState<'intro' | 'context' | 'close' | 'all' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  
  // Snippets
  const [introSnippets, setIntroSnippets] = useState<Snippet[]>([])
  const [closeSnippets, setCloseSnippets] = useState<Snippet[]>([])
  
  // Onboarding
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [onboardingChecked, setOnboardingChecked] = useState(false)
  
  // Saving snippets
  const [savingSnippet, setSavingSnippet] = useState<'intro' | 'close' | null>(null)
  const [snippetName, setSnippetName] = useState('')

  const fullEmail = [intro, context, close].filter(Boolean).join('\n\n')
  const wordCount = fullEmail.split(/\s+/).filter(w => w.length > 0).length
  const readingLevel = calculateReadingLevel(fullEmail)
  const humanScore = calculateHumanScore(fullEmail)

  // Check onboarding status and load snippets
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
          // Load snippets
          loadSnippets()
        }
      }
    } catch (e) {
      console.error('Failed to check onboarding:', e)
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
        
        // Set defaults
        const defaultIntro = intros.find((s: Snippet) => s.is_default)
        const defaultClose = closes.find((s: Snippet) => s.is_default)
        
        if (defaultIntro && !intro) setIntro(defaultIntro.content)
        if (defaultClose && !close) setClose(defaultClose.content)
      }
    } catch (e) {
      console.error('Failed to load snippets:', e)
    }
  }

  const handleOnboardingComplete = () => {
    setShowOnboarding(false)
    loadSnippets()
  }

  const generateContext = async () => {
    setLoading('context')
    setError(null)
    try {
      const res = await fetch('/api/email/generate-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company, signals }),
      })
      
      const data = await res.json()
      
      if (res.ok) {
        setContext(data.content || '')
      } else {
        setError(data.error || 'Failed to generate')
      }
    } catch (e) {
      console.error('Failed to generate:', e)
      setError('Failed to connect to server')
    } finally {
      setLoading(null)
    }
  }

  const generateIntro = async () => {
    setLoading('intro')
    setError(null)
    try {
      const res = await fetch('/api/email/generate-snippet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'intro' }),
      })
      
      const data = await res.json()
      if (res.ok) {
        setIntro(data.content || '')
      } else {
        setError(data.error || 'Failed to generate')
      }
    } catch (e) {
      setError('Failed to generate intro')
    } finally {
      setLoading(null)
    }
  }

  const generateClose = async () => {
    setLoading('close')
    setError(null)
    try {
      const res = await fetch('/api/email/generate-snippet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'close' }),
      })
      
      const data = await res.json()
      if (res.ok) {
        setClose(data.content || '')
      } else {
        setError(data.error || 'Failed to generate')
      }
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
      const res = await fetch('/api/email/snippets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          snippet_type: type, 
          name: snippetName, 
          content,
          is_default: false 
        }),
      })
      
      if (res.ok) {
        await loadSnippets()
        setSavingSnippet(null)
        setSnippetName('')
      }
    } catch (e) {
      console.error('Failed to save snippet:', e)
    }
  }

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(fullEmail)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    
    // Save as approved draft for style learning
    try {
      await fetch('/api/email/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: company.id,
          fullEmail,
          intro,
          context,
          close,
        }),
      })
    } catch (e) {
      console.error('Failed to save approved draft:', e)
    }
  }

  const getScoreColor = (score: number, type: 'length' | 'reading' | 'human') => {
    if (type === 'length') {
      if (score >= 50 && score <= 120) return 'bg-green-500'
      if (score >= 30 && score <= 150) return 'bg-yellow-500'
      return 'bg-red-500'
    }
    if (type === 'reading') {
      if (score >= 6 && score <= 9) return 'bg-green-500'
      if (score >= 4 && score <= 11) return 'bg-yellow-500'
      return 'bg-red-500'
    }
    if (type === 'human') {
      if (score >= 80) return 'bg-green-500'
      if (score >= 60) return 'bg-yellow-500'
      return 'bg-red-500'
    }
    return 'bg-slate-500'
  }

  // Show onboarding if needed
  if (showOnboarding) {
    return <EmailOnboarding open={true} onComplete={handleOnboardingComplete} />
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-orange-500" />
            Outreach Builder — {company.name}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Email Builder */}
          <div className="lg:col-span-2 space-y-4">
            {/* Error Display */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Intro Section */}
            <Card className="border-slate-200">
              <CardHeader className="py-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-slate-700">
                    Intro
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {introSnippets.length > 0 && (
                      <Select onValueChange={(id) => {
                        const snippet = introSnippets.find(s => s.id === id)
                        if (snippet) setIntro(snippet.content)
                      }}>
                        <SelectTrigger className="h-7 w-[120px] text-xs">
                          <SelectValue placeholder="Saved" />
                        </SelectTrigger>
                        <SelectContent>
                          {introSnippets.map(s => (
                            <SelectItem key={s.id} value={s.id} className="text-xs">
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={generateIntro}
                      disabled={loading !== null}
                      className="h-7 text-xs"
                    >
                      {loading === 'intro' ? (
                        <RefreshCw className="h-3 w-3 animate-spin" />
                      ) : (
                        <Sparkles className="h-3 w-3" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingSection(editingSection === 'intro' ? null : 'intro')}
                      className="h-7 text-xs"
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    {intro && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSavingSnippet('intro')}
                        className="h-7 text-xs"
                      >
                        <Save className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {editingSection === 'intro' ? (
                  <Textarea
                    value={intro}
                    onChange={(e) => setIntro(e.target.value)}
                    className="min-h-[60px] text-sm"
                    placeholder="Write your intro..."
                  />
                ) : (
                  <p className="text-sm text-slate-600 whitespace-pre-wrap min-h-[40px]">
                    {intro || <span className="text-slate-400 italic">Select a saved intro or generate one</span>}
                  </p>
                )}
                {savingSnippet === 'intro' && (
                  <div className="mt-2 flex gap-2">
                    <input
                      type="text"
                      value={snippetName}
                      onChange={(e) => setSnippetName(e.target.value)}
                      placeholder="Snippet name..."
                      className="flex-1 px-2 py-1 text-sm border rounded"
                    />
                    <Button size="sm" onClick={() => saveSnippet('intro')} className="h-7">Save</Button>
                    <Button size="sm" variant="ghost" onClick={() => { setSavingSnippet(null); setSnippetName('') }} className="h-7">
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Context Section - AI Generated */}
            <Card className="border-orange-200 bg-orange-50/50">
              <CardHeader className="py-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-slate-700">
                    Context / Value <span className="text-orange-500 text-xs ml-1">(AI)</span>
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={generateContext}
                      disabled={loading !== null}
                      className="h-7 text-xs bg-white"
                    >
                      {loading === 'context' ? (
                        <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                      ) : (
                        <Sparkles className="h-3 w-3 mr-1" />
                      )}
                      Generate
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingSection(editingSection === 'context' ? null : 'context')}
                      className="h-7 text-xs bg-white"
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {editingSection === 'context' ? (
                  <Textarea
                    value={context}
                    onChange={(e) => setContext(e.target.value)}
                    className="min-h-[80px] text-sm"
                    placeholder="AI will generate company-specific context..."
                  />
                ) : (
                  <p className="text-sm text-slate-600 whitespace-pre-wrap min-h-[60px]">
                    {context || (
                      <span className="text-slate-400 italic">
                        Click "Generate" to create company-specific context based on signals and your org info
                      </span>
                    )}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Close Section */}
            <Card className="border-slate-200">
              <CardHeader className="py-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-slate-700">
                    Close / CTA
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {closeSnippets.length > 0 && (
                      <Select onValueChange={(id) => {
                        const snippet = closeSnippets.find(s => s.id === id)
                        if (snippet) setClose(snippet.content)
                      }}>
                        <SelectTrigger className="h-7 w-[120px] text-xs">
                          <SelectValue placeholder="Saved" />
                        </SelectTrigger>
                        <SelectContent>
                          {closeSnippets.map(s => (
                            <SelectItem key={s.id} value={s.id} className="text-xs">
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={generateClose}
                      disabled={loading !== null}
                      className="h-7 text-xs"
                    >
                      {loading === 'close' ? (
                        <RefreshCw className="h-3 w-3 animate-spin" />
                      ) : (
                        <Sparkles className="h-3 w-3" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingSection(editingSection === 'close' ? null : 'close')}
                      className="h-7 text-xs"
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    {close && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSavingSnippet('close')}
                        className="h-7 text-xs"
                      >
                        <Save className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {editingSection === 'close' ? (
                  <Textarea
                    value={close}
                    onChange={(e) => setClose(e.target.value)}
                    className="min-h-[40px] text-sm"
                    placeholder="Write your close..."
                  />
                ) : (
                  <p className="text-sm text-slate-600 whitespace-pre-wrap min-h-[30px]">
                    {close || <span className="text-slate-400 italic">Select a saved close or generate one</span>}
                  </p>
                )}
                {savingSnippet === 'close' && (
                  <div className="mt-2 flex gap-2">
                    <input
                      type="text"
                      value={snippetName}
                      onChange={(e) => setSnippetName(e.target.value)}
                      placeholder="Snippet name..."
                      className="flex-1 px-2 py-1 text-sm border rounded"
                    />
                    <Button size="sm" onClick={() => saveSnippet('close')} className="h-7">Save</Button>
                    <Button size="sm" variant="ghost" onClick={() => { setSavingSnippet(null); setSnippetName('') }} className="h-7">
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Copy Button */}
            {fullEmail && (
              <Button
                onClick={copyToClipboard}
                className="w-full"
                variant={copied ? 'secondary' : 'default'}
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy to Clipboard
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Quality Scoring Panel */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Email Quality</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Length */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-600">📏 Length</span>
                    <span className={`font-medium ${
                      wordCount >= 50 && wordCount <= 120 ? 'text-green-600' : 
                      wordCount >= 30 && wordCount <= 150 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {wordCount} words
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${getScoreColor(wordCount, 'length')} transition-all`}
                      style={{ width: `${Math.min(100, (wordCount / 120) * 100)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">Target: 50-120 words</p>
                </div>

                {/* Reading Level */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-600">📖 Reading Level</span>
                    <span className={`font-medium ${
                      readingLevel >= 6 && readingLevel <= 9 ? 'text-green-600' : 
                      readingLevel >= 4 && readingLevel <= 11 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      Grade {readingLevel}
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${getScoreColor(readingLevel, 'reading')} transition-all`}
                      style={{ width: `${Math.min(100, (readingLevel / 12) * 100)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">Target: Grade 6-9</p>
                </div>

                {/* Human Score */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-600">🤖 Human Score</span>
                    <span className={`font-medium ${
                      humanScore >= 80 ? 'text-green-600' : 
                      humanScore >= 60 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {humanScore}%
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${getScoreColor(humanScore, 'human')} transition-all`}
                      style={{ width: `${humanScore}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">Target: 80%+ human</p>
                </div>
              </CardContent>
            </Card>

            {/* Context Used */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Company Context</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex flex-wrap gap-1">
                  {company.industry && (
                    <Badge variant="secondary" className="text-[10px]">
                      {company.industry}
                    </Badge>
                  )}
                  {company.hq_state && (
                    <Badge variant="secondary" className="text-[10px]">
                      {company.hq_state}
                    </Badge>
                  )}
                  {signals.length > 0 && (
                    <Badge variant="secondary" className="text-[10px]">
                      {signals.length} signal{signals.length !== 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
                {company.messaging_hook && (
                  <p className="text-[10px] text-slate-500 line-clamp-2">
                    Hook: {company.messaging_hook}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
