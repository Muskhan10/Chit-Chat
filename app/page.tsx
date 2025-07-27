"use client"

import { useState, useEffect } from "react"
import { LoginForm } from "@/components/login-form"
import { ChatInterface } from "@/components/chat-interface"
import { AdminPanel } from "@/components/admin-panel"

export interface User {
  id: string
  name: string
  email: string
  isAdmin: boolean
}

export interface Message {
  id: string
  userId: string
  userName: string
  content: string
  timestamp: Date
  isPrivate?: boolean
  targetUserId?: string
  reactions?: MessageReaction[]
  seenBy?: MessageSeen[]
}

export interface MessageReaction {
  id: string
  messageId: string
  userId: string
  userName: string
  emoji: string
}

export interface MessageSeen {
  id: string
  messageId: string
  userId: string
  userName: string
  seenAt: Date
}

export default function Home() {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [showAdminPanel, setShowAdminPanel] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if user is already logged in
    const savedUser = localStorage.getItem("currentUser")
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser))
    }
    setLoading(false)
  }, [])

  const handleLogin = (user: User) => {
    setCurrentUser(user)
    localStorage.setItem("currentUser", JSON.stringify(user))
  }

  const handleLogout = () => {
    setCurrentUser(null)
    localStorage.removeItem("currentUser")
    setShowAdminPanel(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!currentUser) {
    return <LoginForm onLogin={handleLogin} />
  }

  if (showAdminPanel && currentUser.isAdmin) {
    return <AdminPanel currentUser={currentUser} onBack={() => setShowAdminPanel(false)} onLogout={handleLogout} />
  }

  return (
    <ChatInterface currentUser={currentUser} onLogout={handleLogout} onAdminPanel={() => setShowAdminPanel(true)} />
  )
}
