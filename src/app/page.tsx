'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

interface User {
  id: string
  email?: string
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
    }
    getUser()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  const features = [
    {
      icon: '🎯',
      title: 'Risk-Based Carrier Assessment',
      description: 'Instantly identify high-risk carriers with color-coded visual indicators and smart risk calculation',
      highlight: 'NEW'
    },
    {
      icon: '⚡',
      title: 'Bulk Operations & Management',
      description: 'Select and manage multiple carriers at once with bulk tagging, export, and deletion capabilities',
      highlight: 'PREMIUM'
    },
    {
      icon: '📊',
      title: 'Portfolio Analytics & Insights',
      description: 'Comprehensive dashboard with safety rating breakdowns, compliance analytics, and growth tracking',
      highlight: null
    },
    {
      icon: '🔍',
      title: 'Smart Search & Filtering',
      description: 'Advanced filtering by risk level, compliance status, priority, and custom tags with saved searches',
      highlight: null
    },
    {
      icon: '🏷️',
      title: 'Carrier Notes & Tags',
      description: 'Organize carriers with custom tags, priority levels, notes, and last contact tracking',
      highlight: null
    },
    {
      icon: '🚨',
      title: 'Real-time Monitoring Alerts',
      description: 'Automated notifications when carrier safety ratings, insurance, or authority status changes',
      highlight: null
    }
  ]

  const testimonials = [
    {
      quote: "CarrierTracker has revolutionized how we vet carriers. The risk assessment and bulk operations save us hours every week.",
      author: "Sarah Johnson",
      title: "Logistics Manager",
      company: "Premium Freight Solutions"
    },
    {
      quote: "The analytics dashboard gives us insights we never had before. We can spot trends and make better carrier decisions.",
      author: "Mike Chen", 
      title: "Fleet Operations Director",
      company: "Nationwide Transport Group"
    },
    {
      quote: "Finally, a carrier management tool that actually understands freight broker workflows. Game changer for our team.",
      author: "Lisa Rodriguez",
      title: "Head of Carrier Relations", 
      company: "Atlantic Logistics Partners"
    }
  ]

  const comparisonFeatures = [
    { feature: 'Modern, intuitive interface', us: true, them: false },
    { feature: 'Risk-based visual indicators', us: true, them: false },
    { feature: 'Bulk carrier operations', us: true, them: false },
    { feature: 'Advanced portfolio analytics', us: true, them: false },
    { feature: 'Smart filtering & search', us: true, them: true },
    { feature: 'Custom tags & notes', us: true, them: true },
    { feature: 'Safety rating monitoring', us: true, them: true },
    { feature: 'Compliance tracking', us: true, them: true },
    { feature: 'Real-time alerts', us: true, them: true },
    { feature: 'Export capabilities', us: true, them: true }
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link href="/" className="text-2xl font-bold text-blue-600">
              CarrierTracker
            </Link>
            <div className="flex gap-4 items-center">
              {loading ? (
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                </div>
              ) : user ? (
                <>
                  <Link href="/search" className="px-4 py-2 text-gray-700 hover:text-gray-900">
                    Search
                  </Link>
                  <Link href="/dashboard" className="px-4 py-2 text-gray-700 hover:text-gray-900">
                    Dashboard
                  </Link>
                  <div className="relative group">
                    <button className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900">
                      <span className="text-sm">{user.email?.split('@')[0]}</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                      <Link href="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                        Profile Settings
                      </Link>
                      <button
                        onClick={async () => {
                          await supabase.auth.signOut()
                          setUser(null)
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Sign Out
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <Link href="/auth/login" className="px-4 py-2 text-gray-700 hover:text-gray-900">
                    Sign In
                  </Link>
                  <Link href="/auth/signup" className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium">
                    Start Free Trial
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 to-indigo-100 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium mb-6">
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                Trusted by 500+ freight brokers
              </div>
              <h1 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
                The <span className="text-blue-600">smarter way</span> to manage transportation carriers
              </h1>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Stop wasting time with outdated carrier management tools. Get instant risk assessment, 
                powerful analytics, and streamlined workflows built specifically for freight brokers.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                {user ? (
                  <Link href="/dashboard" className="px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-lg">
                    Go to Dashboard
                  </Link>
                ) : (
                  <>
                    <Link href="/auth/signup" className="px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-lg">
                      Start Free Trial
                    </Link>
                    <Link href="/search" className="px-8 py-4 border-2 border-gray-300 text-gray-700 rounded-lg hover:border-gray-400 font-semibold text-lg">
                      Try Search Demo
                    </Link>
                  </>
                )}
              </div>
              <div className="mt-6 flex items-center gap-6 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  No credit card required
                </div>
                <div className="flex items-center gap-1">
                  <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Setup in 2 minutes
                </div>
                <div className="flex items-center gap-1">
                  <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Cancel anytime
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="bg-white rounded-xl shadow-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-500 ml-2">CarrierTracker Dashboard</span>
                </div>
                <div className="space-y-3">
                  <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-900">HIGH RISK</span>
                      <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">UNSATISFACTORY</span>
                    </div>
                    <div className="text-sm text-gray-600">ABC Transport • DOT: 123456</div>
                  </div>
                  <div className="bg-yellow-50 border-l-4 border-yellow-500 p-3 rounded">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-900">MEDIUM RISK</span>
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">CONDITIONAL</span>
                    </div>
                    <div className="text-sm text-gray-600">XYZ Logistics • DOT: 789012</div>
                  </div>
                  <div className="bg-green-50 border-l-4 border-green-500 p-3 rounded">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-900">LOW RISK</span>
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">SATISFACTORY</span>
                    </div>
                    <div className="text-sm text-gray-600">Premier Freight • DOT: 345678</div>
                  </div>
                </div>
              </div>
              <div className="absolute -top-4 -right-4 bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                Live Demo
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Everything you need to manage carriers effectively
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Purpose-built for freight brokers who need speed, accuracy, and insights to make better carrier decisions.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="text-3xl">{feature.icon}</div>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{feature.title}</h3>
                      {feature.highlight && (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          feature.highlight === 'NEW' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {feature.highlight}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600">{feature.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Why choose CarrierTracker over Carrier411?
            </h2>
            <p className="text-xl text-gray-600">
              Built from the ground up for modern freight broker workflows
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="grid grid-cols-12 gap-4 p-6 bg-gray-50 font-medium text-gray-900">
              <div className="col-span-6">Feature</div>
              <div className="col-span-3 text-center">
                <div className="inline-flex items-center gap-2">
                  <span className="text-blue-600 font-bold">CarrierTracker</span>
                  <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">MODERN</span>
                </div>
              </div>
              <div className="col-span-3 text-center text-gray-600">Carrier411</div>
            </div>
            {comparisonFeatures.map((item, index) => (
              <div key={index} className={`grid grid-cols-12 gap-4 p-4 border-b border-gray-100 ${index % 2 === 0 ? 'bg-gray-25' : 'bg-white'}`}>
                <div className="col-span-6 text-gray-900">{item.feature}</div>
                <div className="col-span-3 text-center">
                  {item.us ? (
                    <svg className="w-5 h-5 text-green-500 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-gray-300 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div className="col-span-3 text-center">
                  {item.them ? (
                    <svg className="w-5 h-5 text-green-500 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-gray-300 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </div>
            ))}
            <div className="p-6 bg-blue-50 text-center">
              <p className="text-blue-800 font-medium mb-4">
                Ready to upgrade your carrier management?
              </p>
              {!user && (
                <Link href="/auth/signup" className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                  Start Free Trial
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Trusted by freight brokers nationwide
            </h2>
            <p className="text-xl text-gray-600">
              See what industry professionals are saying about CarrierTracker
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-white rounded-xl p-6 shadow-sm">
                <div className="mb-4">
                  <div className="flex text-yellow-400 mb-3">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <blockquote className="text-gray-700 italic">
                    &ldquo;{testimonial.quote}&rdquo;
                  </blockquote>
                </div>
                <div className="border-t pt-4">
                  <div className="font-medium text-gray-900">{testimonial.author}</div>
                  <div className="text-sm text-gray-600">{testimonial.title}</div>
                  <div className="text-sm text-blue-600">{testimonial.company}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to transform your carrier management?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join hundreds of freight brokers who&apos;ve already made the switch to smarter carrier tracking.
          </p>
          {user ? (
            <Link href="/dashboard" className="inline-block px-8 py-4 bg-white text-blue-600 rounded-lg hover:bg-gray-50 font-semibold text-lg">
              Go to Dashboard
            </Link>
          ) : (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/signup" className="px-8 py-4 bg-white text-blue-600 rounded-lg hover:bg-gray-50 font-semibold text-lg">
                Start Free Trial
              </Link>
              <Link href="/search" className="px-8 py-4 border-2 border-white text-white rounded-lg hover:bg-blue-700 font-semibold text-lg">
                Try Demo First
              </Link>
            </div>
          )}
          <div className="mt-6 text-blue-100 text-sm">
            No credit card required • Setup in 2 minutes • Cancel anytime
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="text-xl font-bold text-white mb-4">CarrierTracker</div>
              <p className="text-gray-400 text-sm">
                The modern carrier management platform built for freight brokers.
              </p>
            </div>
            <div>
              <h3 className="text-white font-medium mb-4">Features</h3>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li>Risk Assessment</li>
                <li>Portfolio Analytics</li>
                <li>Bulk Operations</li>
                <li>Smart Filtering</li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-medium mb-4">Support</h3>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li>Help Center</li>
                <li>Contact Support</li>
                <li>Feature Requests</li>
                <li>Status Page</li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-medium mb-4">Company</h3>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li>About Us</li>
                <li>Privacy Policy</li>
                <li>Terms of Service</li>
                <li>Security</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400 text-sm">
            © 2024 CarrierTracker. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}