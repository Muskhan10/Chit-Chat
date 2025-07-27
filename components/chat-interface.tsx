"use client"

import type React from "react"
import { Users } from "lucide-react" // Import Users component

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { MessageCircle, Send, LogOut, Settings, Smile, Eye } from "lucide-react"
import type { User, Message, MessageReaction } from "@/app/page"

interface ChatInterfaceProps {
  currentUser: User
  onLogout: () => void
  onAdminPanel: () => void
}

const EMOJI_LIST = ["👍", "❤️", "😂", "😮", "😢", "😡", "👏", "🔥"]

export function ChatInterface({ currentUser, onLogout, onAdminPanel }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadMessages()

    // Set up polling for real-time updates
    const interval = setInterval(loadMessages, 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    markMessagesAsSeen()
  }, [messages])

  const loadMessages = () => {
    try {
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
    } catch (error) {
      console.error("Error loading messages:", error)
    }
  }

  const markMessagesAsSeen = () => {
    const visibleMessages = getVisibleMessages()
    let updated = false

    const updatedMessages = messages.map((message) => {
      if (message.userId !== currentUser.id && !message.seenBy?.some((s) => s.userId === currentUser.id)) {
        updated = true
        return {
          ...message,
          seenBy: [
            ...(message.seenBy || []),
            {
              id: Date.now().toString(),
              messageId: message.id,
              userId: currentUser.id,
              userName: currentUser.name,
              seenAt: new Date(),
            },
          ],
        }
      }
      return message
    })

    if (updated) {
      setMessages(updatedMessages)
      localStorage.setItem("messages", JSON.stringify(updatedMessages))
    }
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || loading) return

    setLoading(true)
    try {
      const message: Message = {
        id: Date.now().toString(),
        userId: currentUser.id,
        userName: currentUser.name,
        content: newMessage,
        timestamp: new Date(),
        reactions: [],
        seenBy: [],
      }

      const updatedMessages = [...messages, message]
      setMessages(updatedMessages)
      localStorage.setItem("messages", JSON.stringify(updatedMessages))
      setNewMessage("")
    } catch (error) {
      console.error("Error sending message:", error)
    } finally {
      setLoading(false)
    }
  }

  const addReaction = (messageId: string, emoji: string) => {
    try {
      const updatedMessages = messages.map((message) => {
        if (message.id === messageId) {
          const existingReaction = message.reactions?.find((r) => r.userId === currentUser.id && r.emoji === emoji)

          if (existingReaction) {
            // Remove reaction
            return {
              ...message,
              reactions: message.reactions?.filter((r) => r.id !== existingReaction.id) || [],
            }
          } else {
            // Add reaction
            const newReaction = {
              id: Date.now().toString(),
              messageId: messageId,
              userId: currentUser.id,
              userName: currentUser.name,
              emoji: emoji,
            }
            return {
              ...message,
              reactions: [...(message.reactions || []), newReaction],
            }
          }
        }
        return message
      })

      setMessages(updatedMessages)
      localStorage.setItem("messages", JSON.stringify(updatedMessages))
    } catch (error) {
      console.error("Error adding reaction:", error)
    }
  }

  const getVisibleMessages = () => {
    return messages.filter(
      (msg) => !msg.isPrivate || msg.userId === currentUser.id || msg.targetUserId === currentUser.id,
    )
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
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-2 rounded-full">
                <MessageCircle className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Chīt-Chãt
                </h1>
                <p className="text-sm text-gray-500">Welcome, {currentUser.name}!</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {currentUser.isAdmin && (
                <Button
                  onClick={onAdminPanel}
                  variant="outline"
                  size="sm"
                  className="flex items-center space-x-1 bg-transparent"
                >
                  <Settings className="h-4 w-4" />
                  <span>Admin Panel</span>
                </Button>
              )}
              <Button
                onClick={onLogout}
                variant="outline"
                size="sm"
                className="flex items-center space-x-1 bg-transparent"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Chat Area */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Online Users Sidebar */}
          <div className="lg:col-span-1">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" /> {/* Users component used here */}
                  <span>Online Users</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">{/* Placeholder for online users */}</div>
              </CardContent>
            </Card>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-3">
            <Card className="shadow-lg h-[600px] flex flex-col">
              <CardHeader>
                <CardTitle>Global Chat</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <ScrollArea className="flex-1 pr-4">
                  <div className="space-y-4">
                    {getVisibleMessages().map((message) => (
                      <div key={message.id} className="space-y-2">
                        <div className={`flex ${message.userId === currentUser.id ? "justify-end" : "justify-start"}`}>
                          <div
                            className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg relative group ${
                              message.userId === currentUser.id
                                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
                                : "bg-gray-100 text-gray-900"
                            } ${message.isPrivate ? "border-2 border-yellow-400" : ""}`}
                          >
                            {message.userId !== currentUser.id && (
                              <p className="text-xs font-medium mb-1 opacity-70">{message.userName}</p>
                            )}
                            <p className="text-sm">{message.content}</p>
                            {message.isPrivate && (
                              <Badge variant="outline" className="mt-1 text-xs">
                                Private Message
                              </Badge>
                            )}
                            <p className="text-xs opacity-70 mt-1">
                              {new Date(message.timestamp).toLocaleTimeString()}
                            </p>

                            {/* Reaction Button */}
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 bg-white shadow-md hover:bg-gray-50"
                                >
                                  <Smile className="h-3 w-3 text-gray-600" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-2">
                                <div className="flex space-x-1">
                                  {EMOJI_LIST.map((emoji) => (
                                    <Button
                                      key={emoji}
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 hover:bg-gray-100"
                                      onClick={() => addReaction(message.id, emoji)}
                                    >
                                      {emoji}
                                    </Button>
                                  ))}
                                </div>
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>

                        {/* Reactions */}
                        {message.reactions && message.reactions.length > 0 && (
                          <div
                            className={`flex flex-wrap gap-1 ${message.userId === currentUser.id ? "justify-end" : "justify-start"}`}
                          >
                            {Object.entries(groupReactions(message.reactions)).map(([emoji, reactions]) => (
                              <Button
                                key={emoji}
                                variant="outline"
                                size="sm"
                                className="h-6 px-2 text-xs bg-white hover:bg-gray-50"
                                onClick={() => addReaction(message.id, emoji)}
                              >
                                {emoji} {reactions.length}
                              </Button>
                            ))}
                          </div>
                        )}

                        {/* Seen By */}
                        {message.seenBy && message.seenBy.length > 0 && message.userId === currentUser.id && (
                          <div className="flex justify-end">
                            <div className="flex items-center space-x-1 text-xs text-gray-500">
                              <Eye className="h-3 w-3" />
                              <span>
                                Seen by{" "}
                                {message.seenBy
                                  .filter((s) => s.userId !== currentUser.id)
                                  .map((s) => s.userName)
                                  .join(", ")}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                <form onSubmit={sendMessage} className="flex space-x-2 mt-4">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1"
                    disabled={loading}
                  />
                  <Button
                    type="submit"
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                    disabled={loading}
                  >
                    <Send className="h-4 w-4" />
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
