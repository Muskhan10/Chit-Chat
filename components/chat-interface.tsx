"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { MessageCircle, Send, LogOut, Settings, Smile, Eye, AlertCircle } from "lucide-react"
import { supabase } from "@/lib/supabase"
import type { User, Message, MessageReaction } from "@/app/page"

interface ChatInterfaceProps {
  currentUser: User
  onLogout: () => void
  onAdminPanel: () => void
  databaseReady: boolean
}

const EMOJI_LIST = ["👍", "❤️", "😂", "😮", "😢", "😡", "👏", "🔥"]

export function ChatInterface({ currentUser, onLogout, onAdminPanel, databaseReady }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadMessages()

    if (databaseReady) {
      // Subscribe to real-time changes only if database is ready
      const messagesSubscription = supabase
        .channel("messages")
        .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
          loadMessages()
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "message_reactions" }, () => {
          loadMessages()
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "message_seen" }, () => {
          loadMessages()
        })
        .subscribe()

      return () => {
        messagesSubscription.unsubscribe()
      }
    }
  }, [databaseReady])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    if (databaseReady) {
      markMessagesAsSeen()
    }
  }, [messages, databaseReady])

  const loadMessages = async () => {
    try {
      if (databaseReady) {
        // Try to load from database
        const { data: messagesData, error: messagesError } = await supabase
          .from("messages")
          .select("*")
          .order("created_at", { ascending: true })

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

  const markMessagesAsSeen = async () => {
    if (!databaseReady) return

    const visibleMessages = getVisibleMessages()

    for (const message of visibleMessages) {
      if (message.userId !== currentUser.id && !message.seenBy?.some((s) => s.userId === currentUser.id)) {
        try {
          await supabase.from("message_seen").insert({
            message_id: message.id,
            user_id: currentUser.id,
            user_name: currentUser.name,
          })
        } catch (error) {
          // Ignore errors for seen status
        }
      }
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

      if (databaseReady) {
        // Try to save to database
        const { error } = await supabase.from("messages").insert({
          user_id: currentUser.id,
          user_name: currentUser.name,
          content: newMessage,
          is_private: false,
        })

        if (error) throw error
      } else {
        // Save to localStorage
        const updatedMessages = [...messages, message]
        setMessages(updatedMessages)
        localStorage.setItem("messages", JSON.stringify(updatedMessages))
      }

      setNewMessage("")
    } catch (error) {
      console.error("Error sending message:", error)
      // Fallback to localStorage
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
    } finally {
      setLoading(false)
    }
  }

  const addReaction = async (messageId: string, emoji: string) => {
    if (!databaseReady) return

    try {
      // Check if user already reacted with this emoji
      const existingReaction = messages
        .find((m) => m.id === messageId)
        ?.reactions?.find((r) => r.userId === currentUser.id && r.emoji === emoji)

      if (existingReaction) {
        // Remove reaction
        await supabase.from("message_reactions").delete().eq("id", existingReaction.id)
      } else {
        // Add reaction
        await supabase.from("message_reactions").insert({
          message_id: messageId,
          user_id: currentUser.id,
          user_name: currentUser.name,
          emoji: emoji,
        })
      }
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

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {!databaseReady && (
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Running in offline mode. Messages are stored locally and reactions/seen status are disabled.
            </AlertDescription>
          </Alert>
        )}

        {/* Chat Area - Full Width */}
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
                        <p className="text-xs opacity-70 mt-1">{new Date(message.timestamp).toLocaleTimeString()}</p>

                        {/* Reaction Button - Only show if database is ready */}
                        {databaseReady && (
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
                        )}
                      </div>
                    </div>

                    {/* Reactions - Only show if database is ready */}
                    {databaseReady && message.reactions && message.reactions.length > 0 && (
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

                    {/* Seen By - Only show if database is ready */}
                    {databaseReady &&
                      message.seenBy &&
                      message.seenBy.length > 0 &&
                      message.userId === currentUser.id && (
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
  )
}
