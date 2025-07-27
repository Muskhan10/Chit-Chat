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
import { ArrowLeft, Trash2, Send, Users, MessageSquare, Shield, Eye, AlertCircle } from "lucide-react"
import { supabase } from "@/lib/supabase"
import type { User, Message, MessageReaction } from "@/app/page"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface AdminPanelProps {
  currentUser: User
  onBack: () => void
  onLogout: () => void
  databaseReady: boolean
}

export function AdminPanel({ currentUser, onBack, onLogout, databaseReady }: AdminPanelProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState<string>("")
  const [privateMessage, setPrivateMessage] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadData()

    if (databaseReady) {
      // Subscribe to real-time changes only if database is ready
      const subscription = supabase
        .channel("admin-panel")
        .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
          loadMessages()
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "users" }, () => {
          loadUsers()
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "message_reactions" }, () => {
          loadMessages()
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "message_seen" }, () => {
          loadMessages()
        })
        .subscribe()

      return () => {
        subscription.unsubscribe()
      }
    }
  }, [databaseReady])

  const loadData = async () => {
    await Promise.all([loadMessages(), loadUsers()])
  }

  const loadMessages = async () => {
    try {
      if (databaseReady) {
        // Try to load from database
        const { data: messagesData, error: messagesError } = await supabase
          .from("messages")
          .select("*")
          .order("created_at", { ascending: false })

        if (messagesError) throw messagesError

        const { data: reactionsData } = await supabase.from("message_reactions").select("*")
        const { data: seenData } = await supabase.from("message_seen").select("*")

        const messagesWithReactions = messagesData.map((msg) => ({
          id: msg.id,
          userId: msg.user_id,
          userName: msg.user_name,
          content: msg.content,
          timestamp: new Date(msg.created_at),
          isPrivate: msg.is_private,
          targetUserId: msg.target_user_id,
          reactions: reactionsData
            ? reactionsData
                .filter((r) => r.message_id === msg.id)
                .map((r) => ({
                  id: r.id,
                  messageId: r.message_id,
                  userId: r.user_id,
                  userName: r.user_name,
                  emoji: r.emoji,
                }))
            : [],
          seenBy: seenData
            ? seenData
                .filter((s) => s.message_id === msg.id)
                .map((s) => ({
                  id: s.id,
                  messageId: s.message_id,
                  userId: s.user_id,
                  userName: s.user_name,
                  seenAt: new Date(s.seen_at),
                }))
            : [],
        }))

        setMessages(messagesWithReactions)
      } else {
        // Load from localStorage
        const savedMessages = localStorage.getItem("messages")
        if (savedMessages) {
          const localMessages = JSON.parse(savedMessages)
          setMessages(
            localMessages.map((msg: any) => ({
              ...msg,
              timestamp: new Date(msg.timestamp),
              reactions: msg.reactions || [],
              seenBy: msg.seenBy || [],
            })),
          )
        }
      }
    } catch (error) {
      console.error("Error loading messages:", error)
      // Fallback to localStorage
      const savedMessages = localStorage.getItem("messages")
      if (savedMessages) {
        const localMessages = JSON.parse(savedMessages)
        setMessages(
          localMessages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
            reactions: msg.reactions || [],
            seenBy: msg.seenBy || [],
          })),
        )
      }
    }
  }

  const loadUsers = async () => {
    try {
      if (databaseReady) {
        const { data, error } = await supabase.from("users").select("*").order("created_at", { ascending: false })

        if (error) throw error

        const formattedUsers = data.map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          isAdmin: user.is_admin,
        }))

        setUsers(formattedUsers)
      } else {
        // Load from localStorage
        const savedUsers = localStorage.getItem("users")
        if (savedUsers) {
          const localUsers = JSON.parse(savedUsers)
          setUsers(
            localUsers.map((user: any) => ({
              id: user.id,
              name: user.name,
              email: user.email,
              isAdmin: user.isAdmin || user.is_admin || false,
            })),
          )
        }
      }
    } catch (error) {
      console.error("Error loading users:", error)
      // Fallback to localStorage
      const savedUsers = localStorage.getItem("users")
      if (savedUsers) {
        const localUsers = JSON.parse(savedUsers)
        setUsers(
          localUsers.map((user: any) => ({
            id: user.id,
            name: user.name,
            email: user.email,
            isAdmin: user.isAdmin || user.is_admin || false,
          })),
        )
      }
    }
  }

  const deleteMessage = async (messageId: string) => {
    try {
      const { error } = await supabase.from("messages").delete().eq("id", messageId)

      if (error) throw error
    } catch (error) {
      console.error("Error deleting message:", error)
    }
  }

  const sendPrivateMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!privateMessage.trim() || !selectedUser || loading) return

    setLoading(true)
    try {
      const targetUser = users.find((u) => u.id === selectedUser)
      if (!targetUser) return

      await supabase.from("messages").insert({
        user_id: currentUser.id,
        user_name: currentUser.name,
        content: privateMessage,
        is_private: true,
        target_user_id: selectedUser,
      })

      setPrivateMessage("")
      setSelectedUser("")
    } catch (error) {
      console.error("Error sending private message:", error)
    } finally {
      setLoading(false)
    }
  }

  const getUserById = (userId: string) => {
    return users.find((u) => u.id === userId) || { name: "Unknown User" }
  }

  const groupReactions = (reactions: MessageReaction[]) => {
    const grouped: { [emoji: string]: MessageReaction[] } = {}
    reactions.forEach((reaction) => {
      if (!grouped[reaction.emoji]) {
        grouped[reaction.emoji] = []
      }
      grouped[reaction.emoji].push(reaction)
    })
    return grouped
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

      {!databaseReady && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Running in offline mode. Some admin features may be limited.</AlertDescription>
          </Alert>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Users List */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>All Users ({users.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
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

          {/* Message Management */}
          <Card className="shadow-lg lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MessageSquare className="h-5 w-5" />
                <span>Message Management</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`p-4 rounded-lg border ${
                        message.isPrivate ? "bg-yellow-50 border-yellow-200" : "bg-gray-50"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center space-x-2">
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
                        <Button
                          onClick={() => deleteMessage(message.id)}
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <p className="text-sm text-gray-700 mb-2">{message.content}</p>

                      {/* Reactions */}
                      {message.reactions && message.reactions.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {Object.entries(groupReactions(message.reactions)).map(([emoji, reactions]) => (
                            <Badge key={emoji} variant="outline" className="text-xs">
                              {emoji} {reactions.length}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Seen By */}
                      {message.seenBy && message.seenBy.length > 0 && (
                        <div className="flex items-center space-x-1 text-xs text-gray-500 mb-2">
                          <Eye className="h-3 w-3" />
                          <span>Seen by: {message.seenBy.map((s) => s.userName).join(", ")}</span>
                        </div>
                      )}

                      <p className="text-xs text-gray-500">{new Date(message.timestamp).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Private Message */}
          <Card className="shadow-lg lg:col-span-3">
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
                      {users
                        .filter((user) => user.id !== currentUser.id)
                        .map((user) => (
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
                    disabled={loading}
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700"
                  disabled={!selectedUser || !privateMessage.trim() || loading}
                >
                  <Send className="h-4 w-4 mr-2" />
                  {loading ? "Sending..." : "Send Private Message"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
