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
}

export default function Home() {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [showAdminPanel, setShowAdminPanel] = useState(false)

  useEffect(() => {
    // Check if user is already logged in
    const savedUser = localStorage.getItem("currentUser")
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser))
    }
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
