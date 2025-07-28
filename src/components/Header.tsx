'use client'

import Link from 'next/link'
import { useState } from 'react'

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">S</span>
              </div>
              <span className="text-xl font-bold text-gray-900">
                Startup Success Stories
              </span>
            </Link>
          </div>

          <nav className="hidden md:flex items-center space-x-8">
            <Link 
              href="/stories" 
              className="text-gray-600 hover:text-gray-900 font-medium"
            >
              All Stories
            </Link>
            <Link 
              href="/categories" 
              className="text-gray-600 hover:text-gray-900 font-medium"
            >
              Categories
            </Link>
            <Link 
              href="/about" 
              className="text-gray-600 hover:text-gray-900 font-medium"
            >
              About
            </Link>
          </nav>

          <div className="hidden md:flex items-center space-x-4">
            <Link
              href="/submit"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Submit Story
            </Link>
          </div>

          <button
            className="md:hidden p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {isMenuOpen && (
          <div className="md:hidden border-t border-gray-200 pt-4 pb-4">
            <div className="flex flex-col space-y-3">
              <Link 
                href="/stories" 
                className="text-gray-600 hover:text-gray-900 font-medium"
              >
                All Stories
              </Link>
              <Link 
                href="/categories" 
                className="text-gray-600 hover:text-gray-900 font-medium"
              >
                Categories
              </Link>
              <Link 
                href="/about" 
                className="text-gray-600 hover:text-gray-900 font-medium"
              >
                About
              </Link>
              <Link
                href="/submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors w-fit"
              >
                Submit Story
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}