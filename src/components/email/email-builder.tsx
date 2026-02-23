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
  ChevronDown,
} from 'lucide-react'

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

interface Template {
  id: string
  name: string
  content: string
  category: 'intro' | 'context' | 'close'
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
  
  // Flesch-Kincaid Grade Level formula
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
  
  // Penalize common AI phrases
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
  
  // Penalize overly formal language
  if (lowerText.includes('furthermore')) score -= 5
  if (lowerText.includes('moreover')) score -= 5
  if (lowerText.includes('in conclusion')) score -= 5
  if (lowerText.includes('regarding')) score -= 3
  
  // Penalize excessive exclamation marks
  const exclamations = (text.match(/!/g) || []).length
  if (exclamations > 2) score -= exclamations * 3
  
  // Reward contractions (more human)
  const contractions = (text.match(/\b(I'm|we're|you're|don't|can't|won't|isn't|aren't)\b/gi) || []).length
  score += contractions * 3
  
  // Reward sentence variety
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
  const [templates, setTemplates] = useState<Template[]>([])
  const [saveTemplateName, setSaveTemplateName] = useState('')
  const [savingTemplate, setSavingTemplate] = useState<'intro' | 'context' | 'close' | null>(null)

  const fullEmail = [intro, context, close].filter(Boolean).join('\n\n')
  const wordCount = fullEmail.split(/\s+/).filter(w => w.length > 0).length
  const readingLevel = calculateReadingLevel(fullEmail)
  const humanScore = calculateHumanScore(fullEmail)

  // Load templates on mount
  useEffect(() => {
    if (open) {
      loadTemplates()
    }
  }, [open])

  const loadTemplates = async () => {
    try {
      const res = await fetch('/api/email/templates')
      if (res.ok) {
        const data = await res.json()
        setTemplates(data.templates || [])
      }
    } catch (e) {
      console.error('Failed to load templates:', e)
    }
  }

  const generateSection = async (section: 'intro' | 'context' | 'close') => {
    setLoading(section)
    try {
      const res = await fetch('/api/email/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section,
          company,
          signals,
          existingIntro: section !== 'intro' ? intro : undefined,
          existingContext: section === 'close' ? context : undefined,
        }),
      })
      
      if (res.ok) {
        const data = await res.json()
        if (section === 'intro') setIntro(data.content)
        if (section === 'context') setContext(data.content)
        if (section === 'close') setClose(data.content)
      }
    } catch (e) {
      console.error('Failed to generate:', e)
    } finally {
      setLoading(null)
    }
  }

  const generateAll = async () => {
    setLoading('all')
    setError(null)
    try {
      const res = await fetch('/api/email/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section: 'all',
          company,
          signals,
        }),
      })
      
      const data = await res.json()
      
      if (res.ok) {
        setIntro(data.intro || '')
        setContext(data.context || '')
        setClose(data.close || '')
      } else {
        setError(data.error || `Error: ${res.status}`)
      }
    } catch (e) {
      console.error('Failed to generate:', e)
      setError('Failed to connect to server')
    } finally {
      setLoading(null)
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

  const saveTemplate = async (section: 'intro' | 'context' | 'close', name: string) => {
    const content = section === 'intro' ? intro : section === 'context' ? context : close
    if (!content || !name) return
    
    try {
      const res = await fetch('/api/email/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, category: section, content }),
      })
      
      if (res.ok) {
        await loadTemplates()
        setSavingTemplate(null)
        setSaveTemplateName('')
      }
    } catch (e) {
      console.error('Failed to save template:', e)
    }
  }

  const applyTemplate = (template: Template) => {
    if (template.category === 'intro') setIntro(template.content)
    if (template.category === 'context') setContext(template.content)
    if (template.category === 'close') setClose(template.content)
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

  const sectionTemplates = useCallback((category: 'intro' | 'context' | 'close') => {
    return templates.filter(t => t.category === category)
  }, [templates])

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

            {/* Generate All Button */}
            {!intro && !context && !close && (
              <Button
                onClick={generateAll}
                disabled={loading !== null}
                className="w-full bg-orange-500 hover:bg-orange-600"
              >
                {loading === 'all' ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                Generate Complete Draft
              </Button>
            )}

            {/* Paragraph Sections */}
            {['intro', 'context', 'close'].map((section) => {
              const sectionKey = section as 'intro' | 'context' | 'close'
              const value = sectionKey === 'intro' ? intro : sectionKey === 'context' ? context : close
              const setValue = sectionKey === 'intro' ? setIntro : sectionKey === 'context' ? setContext : setClose
              const label = sectionKey === 'intro' ? 'Intro' : sectionKey === 'context' ? 'Context / Value' : 'Close / CTA'
              const sectionTpls = sectionTemplates(sectionKey)

              return (
                <Card key={section} className="border-slate-200">
                  <CardHeader className="py-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium text-slate-700">
                        {label}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        {sectionTpls.length > 0 && (
                          <Select onValueChange={(id) => {
                            const tpl = sectionTpls.find(t => t.id === id)
                            if (tpl) applyTemplate(tpl)
                          }}>
                            <SelectTrigger className="h-7 w-[120px] text-xs">
                              <SelectValue placeholder="Templates" />
                            </SelectTrigger>
                            <SelectContent>
                              {sectionTpls.map(t => (
                                <SelectItem key={t.id} value={t.id} className="text-xs">
                                  {t.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => generateSection(sectionKey)}
                          disabled={loading !== null}
                          className="h-7 text-xs"
                        >
                          {loading === sectionKey ? (
                            <RefreshCw className="h-3 w-3 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3 w-3" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingSection(editingSection === sectionKey ? null : sectionKey)}
                          className="h-7 text-xs"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        {value && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSavingTemplate(sectionKey)}
                            className="h-7 text-xs"
                          >
                            <Save className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {editingSection === sectionKey ? (
                      <Textarea
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        className="min-h-[80px] text-sm"
                        placeholder={`Write your ${label.toLowerCase()}...`}
                      />
                    ) : (
                      <p className="text-sm text-slate-600 whitespace-pre-wrap min-h-[40px]">
                        {value || (
                          <span className="text-slate-400 italic">
                            Click generate or select a template
                          </span>
                        )}
                      </p>
                    )}
                    
                    {/* Save template inline */}
                    {savingTemplate === sectionKey && (
                      <div className="mt-2 flex gap-2">
                        <input
                          type="text"
                          value={saveTemplateName}
                          onChange={(e) => setSaveTemplateName(e.target.value)}
                          placeholder="Template name..."
                          className="flex-1 px-2 py-1 text-sm border rounded"
                        />
                        <Button
                          size="sm"
                          onClick={() => saveTemplate(sectionKey, saveTemplateName)}
                          className="h-7"
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => { setSavingTemplate(null); setSaveTemplateName('') }}
                          className="h-7"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}

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
                <CardTitle className="text-sm font-medium">Context Used</CardTitle>
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
