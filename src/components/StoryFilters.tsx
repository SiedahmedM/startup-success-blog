'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface StoryFiltersProps {
  category?: string
  search?: string
}

export default function StoryFilters({ category, search }: StoryFiltersProps) {
  const router = useRouter()
  const [searchValue, setSearchValue] = useState(search || '')

  const handleCategoryChange = (value: string) => {
    if (value) {
      router.push(`/stories?category=${value}`)
    } else {
      router.push('/stories')
    }
  }

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const value = e.currentTarget.value
      if (value.trim()) {
        router.push(`/stories?search=${encodeURIComponent(value.trim())}`)
      } else {
        router.push('/stories')
      }
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-8">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center space-x-4">
          <select 
            className="border-2 border-gray-300 rounded-lg px-4 py-2 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700 font-medium shadow-sm"
            defaultValue={category || ''}
            onChange={(e) => handleCategoryChange(e.target.value)}
          >
            <option value="">All Categories</option>
            <option value="funding">💰 Funding</option>
            <option value="success">🚀 Success</option>
            <option value="milestone">🎯 Milestone</option>
            <option value="pivot">🔄 Pivot</option>
          </select>
          
          <select className="border-2 border-gray-300 rounded-lg px-4 py-2 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700 font-medium shadow-sm">
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="funding">Highest Funding</option>
            <option value="confidence">Highest Confidence</option>
          </select>
        </div>

        <div className="relative">
          <input
            type="text"
            placeholder="Search stories..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="border-2 border-gray-300 rounded-lg pl-10 pr-4 py-2 w-64 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700 font-medium shadow-sm"
            onKeyPress={handleSearch}
          />
          <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>
    </div>
  )
} 