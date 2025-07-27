'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string | MentorResponse
  timestamp: string
  category?: string
}

interface MentorResponse {
  message: string
  examples: Array<{
    startup: string
    struggle: string
    solution: string
    outcome: string
  }>
  actionSteps: string[]
  category: string
}

const QUICK_PROMPTS = [
  { text: "I want to quit", icon: 'Heart', color: "from-red-500 to-pink-500" },
  { text: "No users yet", icon: 'Users', color: "from-blue-500 to-cyan-500" },
  { text: "Out of money", icon: 'DollarSign', color: "from-green-500 to-emerald-500" },
  { text: "Feeling alone", icon: 'Lightbulb', color: "from-purple-500 to-indigo-500" }
]

export default function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [userId] = useState(() => {
    if (typeof window !== 'undefined') {
      let id = localStorage.getItem('chat-user-id')
      if (!id) {
        id = Math.random().toString(36).substring(2) + Date.now().toString(36)
        localStorage.setItem('chat-user-id', id)
      }
      return id
    }
    return 'anonymous'
  })
  const [isTyping, setIsTyping] = useState(false)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  useEffect(() => {
    // Load conversation history
    const savedConversationId = localStorage.getItem('chat-conversation-id')
    if (savedConversationId) {
      setConversationId(savedConversationId)
      loadChatHistory(savedConversationId)
    } else {
      // Show welcome message
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: {
          message: "Hey there! I'm your AI mentor, here to help you through the tough moments every founder faces. What's weighing on your mind today?",
          examples: [],
          actionSteps: [],
          category: 'welcome'
        } as MentorResponse,
        timestamp: new Date().toISOString()
      }])
    }
  }, [])

  const loadChatHistory = async (convId: string) => {
    try {
      const response = await fetch(`/api/chat/mentor?conversationId=${convId}`)
      const data = await response.json()
      if (data.messages) {
        setMessages(data.messages)
      }
    } catch (error) {
      console.error('Failed to load chat history:', error)
    }
  }

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)
    setIsTyping(true)

    try {
      const response = await fetch('/api/chat/mentor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content.trim(),
          conversationId,
          userId
        })
      })

      const data = await response.json()

      if (data.success) {
        if (!conversationId) {
          setConversationId(data.conversationId)
          localStorage.setItem('chat-conversation-id', data.conversationId)
        }

        // Simulate typing delay
        await new Promise(resolve => setTimeout(resolve, 1500))

        const assistantMessage: ChatMessage = {
          id: data.messageId,
          role: 'assistant',
          content: data.response,
          timestamp: new Date().toISOString(),
          category: data.response.category
        }

        setMessages(prev => [...prev, assistantMessage])
      } else {
        throw new Error(data.error || 'Failed to send message')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: {
          message: "I'm sorry, I'm having trouble connecting right now. Please try again in a moment.",
          examples: [],
          actionSteps: ["Try refreshing the page", "Check your internet connection"],
          category: 'error'
        } as MentorResponse,
        timestamp: new Date().toISOString()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
      setIsTyping(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(inputValue)
  }

  const handleQuickPrompt = (prompt: string) => {
    sendMessage(prompt)
  }

  const renderMessage = (message: ChatMessage) => {
    if (message.role === 'user') {
      return (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex justify-end mb-4"
        >
          <div className="bg-blue-600 text-white p-3 rounded-2xl rounded-br-sm max-w-xs">
            <p className="text-sm">{message.content as string}</p>
          </div>
        </motion.div>
      )
    }

    const response = message.content as MentorResponse
    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex justify-start mb-6"
      >
        <div className="bg-gray-800 text-white p-4 rounded-2xl rounded-bl-sm max-w-sm space-y-3">
          <p className="text-sm text-gray-100">{response.message}</p>
          
          {response.examples.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-blue-300 uppercase tracking-wide">
                Success Examples
              </h4>
              {response.examples.slice(0, 2).map((example, index) => (
                <div key={index} className="bg-gray-700 p-2 rounded-lg">
                  <p className="text-xs font-medium text-blue-200">{example.startup}</p>
                  <p className="text-xs text-gray-300 mt-1">{example.solution}</p>
                </div>
              ))}
            </div>
          )}
          
          {response.actionSteps.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-green-300 uppercase tracking-wide">
                Action Steps
              </h4>
              <ul className="space-y-1">
                {response.actionSteps.map((step, index) => (
                  <li key={index} className="text-xs text-gray-300 flex items-start">
                    <span className="text-green-400 mr-2">•</span>
                    {step}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </motion.div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        <AnimatePresence>
          {messages.map((message) => (
            <div key={message.id}>
              {renderMessage(message)}
            </div>
          ))}
        </AnimatePresence>
        
        {isTyping && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start mb-4"
          >
            <div className="bg-gray-800 text-white p-3 rounded-2xl rounded-bl-sm">
              <div className="flex space-x-1">
                <motion.div
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ repeat: Infinity, duration: 0.6, delay: 0 }}
                  className="w-2 h-2 bg-gray-400 rounded-full"
                />
                <motion.div
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }}
                  className="w-2 h-2 bg-gray-400 rounded-full"
                />
                <motion.div
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }}
                  className="w-2 h-2 bg-gray-400 rounded-full"
                />
              </div>
            </div>
          </motion.div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts */}
      {messages.length <= 1 && (
        <div className="p-4 border-t border-gray-700">
          <p className="text-xs text-gray-400 mb-3 text-center">Quick prompts to get started:</p>
          <div className="grid grid-cols-2 gap-2">
            {QUICK_PROMPTS.map((prompt, index) => {
              const getIcon = (iconName: string) => {
                switch (iconName) {
                  case 'Heart':
                    return <svg width={14} height={14} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                  case 'Users':
                    return <svg width={14} height={14} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                  case 'DollarSign':
                    return <svg width={14} height={14} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" /></svg>
                  case 'Lightbulb':
                    return <svg width={14} height={14} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                  default:
                    return <svg width={14} height={14} fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>
                }
              }
              return (
                <motion.button
                  key={prompt.text}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => handleQuickPrompt(prompt.text)}
                  disabled={isLoading}
                  className={`bg-gradient-to-r ${prompt.color} text-white p-2 rounded-lg text-xs font-medium flex items-center space-x-2 hover:scale-105 transition-transform disabled:opacity-50`}
                >
                  {getIcon(prompt.icon)}
                  <span>{prompt.text}</span>
                </motion.button>
              )
            })}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-gray-700">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Share what's troubling you..."
            disabled={isLoading}
            className="flex-1 bg-gray-800 text-white p-3 rounded-lg border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm disabled:opacity-50"
          />
          <motion.button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <svg width={16} height={16} className="animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            ) : (
              <svg width={16} height={16} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
            )}
          </motion.button>
        </form>
      </div>
    </div>
  )
}