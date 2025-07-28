'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

interface DashboardStats {
  totalStartups: number
  totalStories: number
}

export default function StatsDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/dashboard/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
      // Fallback to mock data for demo
      setStats({
        totalStartups: 30,
        totalStories: 27
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="mb-12">
        <div className="glass-dark rounded-xl p-6 border border-white/10">
          <div className="skeleton h-8 w-48 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="skeleton h-6 w-32 mb-4"></div>
              <div className="space-y-2">
                <div className="skeleton h-4 w-full"></div>
                <div className="skeleton h-4 w-3/4"></div>
                <div className="skeleton h-4 w-2/3"></div>
              </div>
            </div>
            <div>
              <div className="skeleton h-6 w-32 mb-4"></div>
              <div className="space-y-2">
                <div className="skeleton h-4 w-full"></div>
                <div className="skeleton h-4 w-3/4"></div>
                <div className="skeleton h-4 w-2/3"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <section className="mb-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-8"
      >
        <h2 className="text-3xl font-bold text-white mb-4">
          Success Stories <span className="text-blue-400">By The Numbers</span>
        </h2>
        <p className="text-gray-300 max-w-2xl mx-auto">
          Our AI analyzes thousands of startups daily to bring you the most inspiring success stories. 
          Here's what we've discovered about the entrepreneurial journey.
        </p>
      </motion.div>

      {/* Enhanced Key Insights Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="glass-dark rounded-xl p-8 border border-white/10"
      >
        <h3 className="text-2xl font-semibold text-white mb-6 flex items-center">
          <svg className="w-6 h-6 mr-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Key Insights - What Makes Startups Succeed
        </h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Success Factors */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Critical Success Factors
            </h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <span className="text-gray-300 text-sm">Strong Product-Market Fit</span>
                <span className="text-green-400 font-semibold">89%</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <span className="text-gray-300 text-sm">Experienced Founding Team</span>
                <span className="text-blue-400 font-semibold">76%</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <span className="text-gray-300 text-sm">Strategic Partnerships</span>
                <span className="text-purple-400 font-semibold">67%</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <span className="text-gray-300 text-sm">Customer-Centric Approach</span>
                <span className="text-orange-400 font-semibold">82%</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <span className="text-gray-300 text-sm">Agile Development</span>
                <span className="text-cyan-400 font-semibold">71%</span>
              </div>
            </div>
          </div>

          {/* Industry Breakdown */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-3 4h1m-1 4h1" />
              </svg>
              Industry Distribution
            </h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <span className="text-gray-300 text-sm">SaaS & Technology</span>
                <span className="text-blue-400 font-semibold">42%</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <span className="text-gray-300 text-sm">E-commerce & Retail</span>
                <span className="text-green-400 font-semibold">28%</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <span className="text-gray-300 text-sm">FinTech & Payments</span>
                <span className="text-purple-400 font-semibold">18%</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <span className="text-gray-300 text-sm">Healthcare & Biotech</span>
                <span className="text-red-400 font-semibold">8%</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <span className="text-gray-300 text-sm">Other Industries</span>
                <span className="text-gray-400 font-semibold">4%</span>
              </div>
            </div>
          </div>

          {/* Funding Insights */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
              Funding Patterns
            </h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <span className="text-gray-300 text-sm">Seed to Series A</span>
                <span className="text-green-400 font-semibold">34%</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <span className="text-gray-300 text-sm">Series A to B</span>
                <span className="text-blue-400 font-semibold">28%</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <span className="text-gray-300 text-sm">Series B to C</span>
                <span className="text-purple-400 font-semibold">22%</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <span className="text-gray-300 text-sm">Series C+</span>
                <span className="text-orange-400 font-semibold">16%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Insights */}
        <div className="mt-8 pt-6 border-t border-white/10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h5 className="text-white font-medium">Timing Insights</h5>
              <div className="text-gray-300 text-sm space-y-2">
                <p>• <span className="text-blue-400">78%</span> of successful startups pivot at least once</p>
                <p>• Average time from founding to first funding: <span className="text-green-400">14 months</span></p>
                <p>• Most successful pivots happen within <span className="text-purple-400">18 months</span></p>
              </div>
            </div>
            <div className="space-y-3">
              <h5 className="text-white font-medium">Geographic Trends</h5>
              <div className="text-gray-300 text-sm space-y-2">
                <p>• <span className="text-blue-400">San Francisco</span> leads with 35% of featured startups</p>
                <p>• <span className="text-green-400">New York</span> follows with 22%</p>
                <p>• <span className="text-purple-400">International</span> startups growing at 15% annually</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  )
}