import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { 
  Target, 
  MessageSquare, 
  TrendingUp, 
  Building2, 
  Users, 
  Zap,
  ArrowRight,
  CheckCircle2,
  Sparkles
} from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-xl">SignalFeed</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm text-slate-600 hover:text-slate-900">
              Sign In
            </Link>
            <Button asChild>
              <Link href="#demo">Book a Demo</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-100 text-orange-700 text-sm font-medium mb-6">
            <Sparkles className="h-4 w-4" />
            Built by economic developers, for economic developers
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold text-slate-900 leading-tight mb-6">
            Find growing companies
            <span className="text-orange-500"> before </span>
            they announce
          </h1>
          
          <p className="text-xl text-slate-600 mb-8 max-w-2xl mx-auto">
            SignalFeed helps economic development organizations identify expansion signals, 
            craft targeted outreach, and connect with companies at the right moment.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild className="text-lg px-8">
              <Link href="#demo">
                Book a Demo
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="text-lg px-8">
              <Link href="/login">
                Sign In
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Problem / Pain Points */}
      <section className="py-16 px-6 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            The old way of finding leads is broken
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-xl border">
              <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center mb-4">
                <span className="text-2xl">😓</span>
              </div>
              <h3 className="font-semibold text-lg mb-2">Reactive, not proactive</h3>
              <p className="text-slate-600">
                By the time you see a press release, the company has already picked a location. 
                You&apos;re always a step behind.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-xl border">
              <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center mb-4">
                <span className="text-2xl">📧</span>
              </div>
              <h3 className="font-semibold text-lg mb-2">Generic outreach</h3>
              <p className="text-slate-600">
                Mass emails that don&apos;t reference anything specific. No wonder response rates 
                are in the single digits.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-xl border">
              <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center mb-4">
                <span className="text-2xl">🔍</span>
              </div>
              <h3 className="font-semibold text-lg mb-2">Scattered intel</h3>
              <p className="text-slate-600">
                Funding news here, SEC filings there, job postings somewhere else. 
                No single source of truth for growth signals.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Solution / Features */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">
              One platform for the entire pipeline
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              From signal detection to first conversation, SignalFeed gives you everything 
              you need to reach companies at the perfect moment.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-16 h-16 rounded-2xl bg-orange-100 flex items-center justify-center mx-auto mb-4">
                <Target className="h-8 w-8 text-orange-600" />
              </div>
              <h3 className="font-semibold text-xl mb-3">Identify Growing Companies</h3>
              <p className="text-slate-600">
                Track funding rounds, expansion announcements, site searches, and hiring signals 
                across 1,100+ companies in key industries.
              </p>
            </div>
            
            <div className="text-center p-6">
              <div className="w-16 h-16 rounded-2xl bg-orange-100 flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="h-8 w-8 text-orange-600" />
              </div>
              <h3 className="font-semibold text-xl mb-3">Craft Targeted Messaging</h3>
              <p className="text-slate-600">
                AI-powered outreach builder creates personalized emails and LinkedIn messages 
                that reference real signals and connect to your region&apos;s strengths.
              </p>
            </div>
            
            <div className="text-center p-6">
              <div className="w-16 h-16 rounded-2xl bg-orange-100 flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="h-8 w-8 text-orange-600" />
              </div>
              <h3 className="font-semibold text-xl mb-3">Spot Growth Trends</h3>
              <p className="text-slate-600">
                Project intelligence shows where companies are expanding, which industries 
                are heating up, and where the next wave of investment is heading.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Who It's For */}
      <section className="py-16 px-6 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Built for teams doing business attraction
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-xl border">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="font-semibold text-xl">Economic Development Organizations</h3>
              </div>
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-slate-600">State, regional, and local EDOs</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-slate-600">Target companies aligned with your region&apos;s strengths</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-slate-600">Generate qualified leads for your pipeline</span>
                </li>
              </ul>
            </div>
            
            <div className="bg-white p-8 rounded-xl border">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="font-semibold text-xl">Service Providers</h3>
              </div>
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-slate-600">Site selection consultants and advisors</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-slate-600">Utilities, real estate, and infrastructure firms</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-slate-600">Connect with locationally active companies</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof / About */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 text-slate-700 text-sm font-medium mb-6">
            A decade of economic development expertise
          </div>
          
          <h2 className="text-3xl font-bold mb-6">
            Built by the team at Propel Development
          </h2>
          
          <p className="text-xl text-slate-600 mb-8 max-w-2xl mx-auto">
            SignalFeed was created by economic development professionals who&apos;ve spent 
            over 10 years doing lead generation for EDOs across the country. We built 
            the tool we wished we had.
          </p>
          
          <div className="grid grid-cols-3 gap-8 max-w-lg mx-auto">
            <div>
              <div className="text-4xl font-bold text-orange-500">10+</div>
              <div className="text-slate-600 text-sm">Years in ED</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-orange-500">1,100+</div>
              <div className="text-slate-600 text-sm">Companies tracked</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-orange-500">500+</div>
              <div className="text-slate-600 text-sm">Projects monitored</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA / Demo */}
      <section id="demo" className="py-20 px-6 bg-slate-900 text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">
            Ready to find your next win?
          </h2>
          
          <p className="text-xl text-slate-300 mb-8">
            See how SignalFeed can help your organization identify and connect with 
            growing companies. Book a 20-minute demo with our team.
          </p>
          
          <div className="bg-white rounded-xl p-8 text-left">
            <h3 className="text-slate-900 font-semibold text-lg mb-4">Request a Demo</h3>
            <form className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-slate-900"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input 
                    type="email" 
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-slate-900"
                    placeholder="you@organization.com"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Organization</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-slate-900"
                  placeholder="Your organization"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                <select className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-slate-900">
                  <option value="">Select your role</option>
                  <option value="edo">Economic Development Organization</option>
                  <option value="service">Site Selection / Service Provider</option>
                  <option value="utility">Utility</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <Button type="submit" size="lg" className="w-full text-lg">
                Request Demo
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </form>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold">SignalFeed</span>
            <span className="text-slate-400">by Propel Development</span>
          </div>
          <div className="text-slate-500 text-sm">
            © {new Date().getFullYear()} Propel Development. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
