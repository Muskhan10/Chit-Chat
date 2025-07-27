"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Trash2, Send, Users, MessageSquare, Shield } from "lucide-react"
import type { User, Message } from "@/app/page"

interface AdminPanelProps {
  currentUser: User
  onBack: () => void
  onLogout: () => void
}

export function AdminPanel({ currentUser, onBack, onLogout }: AdminPanelProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState<string>("")
  const [privateMessage, setPrivateMessage] = useState("")

  useEffect(() => {
    // Load messages and users
    const savedMessages = localStorage.getItem("messages")
    if (savedMessages) {
      setMessages(JSON.parse(savedMessages))
    }

    const savedUsers = JSON.parse(localStorage.getItem("users") || "[]")
    setUsers(savedUsers)
  }, [])

  const deleteMessage = (messageId: string) => {
    const updatedMessages = messages.filter((msg) => msg.id !== messageId)
    setMessages(updatedMessages)
    localStorage.setItem("messages", JSON.stringify(updatedMessages))
  }

  const sendPrivateMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!privateMessage.trim() || !selectedUser) return

    const targetUser = users.find((u) => u.id === selectedUser)
    if (!targetUser) return

    const message: Message = {
      id: Date.now().toString(),
      userId: currentUser.id,
      userName: currentUser.name,
      content: privateMessage,
      timestamp: new Date(),
      isPrivate: true,
      targetUserId: selectedUser,
    }

    const updatedMessages = [...messages, message]
    setMessages(updatedMessages)
    localStorage.setItem("messages", JSON.stringify(updatedMessages))
    setPrivateMessage("")
    setSelectedUser("")
  }

  const getUserById = (userId: string) => {
    return users.find((u) => u.id === userId) || { name: "Unknown User" }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Button
                onClick={onBack}
                variant="outline"
                size="sm"
                className="flex items-center space-x-1 bg-transparent"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Chat</span>
              </Button>
              <div className="flex items-center space-x-2">
                <div className="bg-gradient-to-r from-red-600 to-pink-600 p-2 rounded-full">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent">
                    Admin Panel
                  </h1>
                  <p className="text-sm text-gray-500">Manage users and messages</p>
                </div>
              </div>
            </div>
            <Button
              onClick={onLogout}
              variant="outline"
              size="sm"
              className="flex items-center space-x-1 bg-transparent"
            >
              <span>Logout</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Message Management */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MessageSquare className="h-5 w-5" />
                <span>Message Management</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`p-3 rounded-lg border ${
                        message.isPrivate ? "bg-yellow-50 border-yellow-200" : "bg-gray-50"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-xs">
                                {message.userName.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium">{message.userName}</span>
                            {message.isPrivate && (
                              <Badge variant="outline" className="text-xs">
                                Private to {getUserById(message.targetUserId || "").name}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-700">{message.content}</p>
                          <p className="text-xs text-gray-500 mt-1">{new Date(message.timestamp).toLocaleString()}</p>
                        </div>
                        <Button
                          onClick={() => deleteMessage(message.id)}
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* User Management & Private Messaging */}
          <div className="space-y-6">
            {/* Users List */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>Registered Users</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-48">
                  <div className="space-y-3">
                    {users.map((user) => (
                      <div key={user.id} className="flex items-center space-x-3 p-2 rounded-lg bg-gray-50">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-sm">
                            {user.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{user.name}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                        {user.isAdmin && (
                          <Badge variant="secondary" className="text-xs">
                            Admin
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Private Message */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Send className="h-5 w-5" />
                  <span>Send Private Message</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={sendPrivateMessage} className="space-y-4">
                  <div>
                    <Select value={selectedUser} onValueChange={setSelectedUser}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a user" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name} ({user.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Textarea
                      value={privateMessage}
                      onChange={(e) => setPrivateMessage(e.target.value)}
                      placeholder="Type your private message..."
                      rows={3}
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700"
                    disabled={!selectedUser || !privateMessage.trim()}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Send Private Message
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
