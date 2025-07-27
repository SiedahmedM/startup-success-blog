'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

interface DashboardStats {
  totalStartups: number
  totalFunding: number
  avgTimeToSuccess: number
  pivotSuccessRate: number
  totalStories: number
  avgConfidence: number
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
        totalStartups: 1247,
        totalFunding: 2400000000,
        avgTimeToSuccess: 18,
        pivotSuccessRate: 73,
        totalStories: 892,
        avgConfidence: 85
      })
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000000) {
      return `$${(amount / 1000000000).toFixed(1)}B`
    } else if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}K`
    } else {
      return `$${amount}`
    }
  }

  const statsData = [
    {
      title: 'Startups Featured',
      value: stats?.totalStartups.toLocaleString() || '0',
      icon: 'Building2',
      color: 'from-blue-500 to-cyan-500',
      description: 'Companies analyzed and featured'
    },
    {
      title: 'Total Funding Raised',
      value: stats ? formatCurrency(stats.totalFunding) : '$0',
      icon: 'DollarSign',
      color: 'from-green-500 to-emerald-500',
      description: 'Capital raised by featured startups'
    },
    {
      title: 'Avg. Time to Success',
      value: stats ? `${stats.avgTimeToSuccess} months` : '0 months',
      icon: 'Clock',
      color: 'from-purple-500 to-indigo-500',
      description: 'From founding to breakthrough'
    },
    {
      title: 'Pivot Success Rate',
      value: stats ? `${stats.pivotSuccessRate}%` : '0%',
      icon: 'TrendingUp',
      color: 'from-orange-500 to-red-500',
      description: 'Startups that succeeded after pivoting'
    },
    {
      title: 'Success Stories',
      value: stats?.totalStories.toLocaleString() || '0',
      icon: 'Users',
      color: 'from-pink-500 to-rose-500',
      description: 'AI-generated stories published'
    },
    {
      title: 'AI Confidence',
      value: stats ? `${stats.avgConfidence}%` : '0%',
      icon: 'BarChart3',
      color: 'from-teal-500 to-cyan-500',
      description: 'Average story accuracy score'
    }
  ]

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="glass-dark rounded-xl p-6 border border-white/10">
            <div className="skeleton h-12 w-12 rounded-full mb-4"></div>
            <div className="skeleton h-8 w-24 mb-2"></div>
            <div className="skeleton h-4 w-32"></div>
          </div>
        ))}
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statsData.map((stat, index) => {
          const getIcon = (iconName: string) => {
            switch (iconName) {
              case 'Building2':
                return <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-3 4h1m-1 4h1" /></svg>
              case 'DollarSign':
                return <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" /></svg>
              case 'Clock':
                return <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              case 'TrendingUp':
                return <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
              case 'Users':
                return <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              case 'BarChart3':
                return <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              default:
                return <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            }
          }
          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              whileHover={{ y: -5, scale: 1.02 }}
              className="glass-dark rounded-xl p-6 border border-white/10 hover-glow group cursor-pointer"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-full bg-gradient-to-r ${stat.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  {getIcon(stat.icon)}
                </div>
                <div className="text-right">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.5, delay: index * 0.1 + 0.3 }}
                    className="text-2xl font-bold text-white group-hover:text-blue-300 transition-colors"
                  >
                    {stat.value}
                  </motion.div>
                </div>
              </div>
              
              <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-blue-300 transition-colors">
                {stat.title}
              </h3>
              
              <p className="text-gray-400 text-sm">
                {stat.description}
              </p>

              {/* Animated progress bar for percentage values */}
              {stat.value.includes('%') && (
                <div className="mt-4">
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${parseInt(stat.value)}%` }}
                      transition={{ duration: 1, delay: index * 0.1 + 0.5 }}
                      className={`h-2 bg-gradient-to-r ${stat.color} rounded-full`}
                    />
                  </div>
                </div>
              )}
            </motion.div>
          )
        })}
      </div>

      {/* Additional insights */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.8 }}
        className="mt-8 glass-dark rounded-xl p-6 border border-white/10"
      >
        <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
          <svg className="w-5 h-5 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
          Key Insights
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-white font-medium mb-2">Most Common Success Factors</h4>
            <ul className="space-y-2 text-gray-300 text-sm">
              <li className="flex items-center">
                <div className="w-2 h-2 bg-blue-400 rounded-full mr-2"></div>
                Strong product-market fit (89%)
              </li>
              <li className="flex items-center">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                Experienced founding team (76%)
              </li>
              <li className="flex items-center">
                <div className="w-2 h-2 bg-purple-400 rounded-full mr-2"></div>
                Strategic partnerships (67%)
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-medium mb-2">Industry Breakdown</h4>
            <ul className="space-y-2 text-gray-300 text-sm">
              <li className="flex items-center justify-between">
                <span>SaaS & Tech</span>
                <span className="text-blue-400">42%</span>
              </li>
              <li className="flex items-center justify-between">
                <span>E-commerce</span>
                <span className="text-green-400">28%</span>
              </li>
              <li className="flex items-center justify-between">
                <span>FinTech</span>
                <span className="text-purple-400">18%</span>
              </li>
              <li className="flex items-center justify-between">
                <span>Others</span>
                <span className="text-gray-400">12%</span>
              </li>
            </ul>
          </div>
        </div>
      </motion.div>
    </section>
  )
}