'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  Send,
  Plus,
  MessageSquare,
  Sparkles,
  Loader2,
  Trash2,
  Utensils,
  Dumbbell,
  Calculator,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useAuthStore } from '@/lib/auth-store';

interface Conversation {
  id: string;
  title?: string;
  updatedAt: string;
  _count?: { messages: number };
  messages?: { role: string; content: string; createdAt: string; providerUsed?: string }[];
}

const suggestionChips = [
  { label: 'أنشئ خطة تغذية', icon: Utensils, prompt: 'أنشئ خطة تغذية أسبوعية متكاملة' },
  { label: 'أنشئ خطة تمارين', icon: Dumbbell, prompt: 'أنشئ خطة تمارين رياضية أسبوعية' },
  { label: 'احسب الماكروز', icon: Calculator, prompt: 'ساعدني في حساب الماكروز المناسبة لمريض' },
];

export default function AiAssistantPage() {
  const { token } = useAuthStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<{ role: string; content: string; providerUsed?: string; modelUsed?: string }[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [newConvDialogOpen, setNewConvDialogOpen] = useState(false);
  const [newConvTitle, setNewConvTitle] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch conversations
  useEffect(() => {
    async function fetchConversations() {
      if (!token) return;
      try {
        const res = await fetch('/api/ai/conversations', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setConversations(data.conversations || []);
        }
      } catch (error) {
        console.error('Error fetching conversations:', error);
      } finally {
        setLoadingConvs(false);
      }
    }
    fetchConversations();
  }, [token]);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSelectConversation = async (conv: Conversation) => {
    setActiveConversation(conv);
    // Fetch messages for this conversation
    if (token && conv.id) {
      try {
        const res = await fetch(`/api/ai/conversations`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          const found = (data.conversations || []).find((c: Conversation) => c.id === conv.id);
          if (found?.messages && found.messages.length > 0) {
            setMessages(found.messages.map((m) => ({ role: m.role, content: m.content, providerUsed: (m as { providerUsed?: string }).providerUsed })));
          } else {
            setMessages([]);
          }
        }
      } catch {
        setMessages([]);
      }
    }
  };

  const handleCreateConversation = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/ai/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: newConvTitle || 'محادثة جديدة' }),
      });
      if (res.ok) {
        const data = await res.json();
        setConversations((prev) => [data.conversation, ...prev]);
        setActiveConversation(data.conversation);
        setMessages([]);
        setNewConvDialogOpen(false);
        setNewConvTitle('');
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  };

  const handleSendMessage = async (messageText?: string) => {
    const text = messageText || inputMessage.trim();
    if (!text || isSending) return;

    if (!activeConversation) {
      // Auto-create conversation
      try {
        const res = await fetch('/api/ai/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ title: text.substring(0, 60) }),
        });
        if (res.ok) {
          const data = await res.json();
          setConversations((prev) => [data.conversation, ...prev]);
          setActiveConversation(data.conversation);
        }
      } catch {
        return;
      }
    }

    const userMessage = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setIsSending(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({ role: m.role, content: m.content })),
          conversationId: activeConversation?.id,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        // Streaming-like effect
        const fullContent = data.response;
        const aiMessage = {
          role: 'assistant',
          content: '',
          providerUsed: data.providerUsed,
          modelUsed: data.modelUsed,
        };
        setMessages((prev) => [...prev, aiMessage]);

        // Simulate streaming by gradually adding characters
        let idx = 0;
        const streamingInterval = setInterval(() => {
          idx += 3; // add 3 chars at a time
          if (idx >= fullContent.length) {
            clearInterval(streamingInterval);
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = {
                ...updated[updated.length - 1],
                content: fullContent,
              };
              return updated;
            });
          } else {
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = {
                ...updated[updated.length - 1],
                content: fullContent.substring(0, idx),
              };
              return updated;
            });
          }
        }, 15);

        // Update conversation in list
        if (activeConversation) {
          setConversations((prev) =>
            prev.map((c) =>
              c.id === activeConversation.id
                ? { ...c, updatedAt: new Date().toISOString() }
                : c
            )
          );
        }
      } else {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: `خطأ: ${data.error || 'فشل الحصول على رد من المساعد'}` },
        ]);
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'تعذر الاتصال بالخادم. يرجى المحاولة مرة أخرى.' },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex h-[calc(100vh-7rem)] gap-4">
      {/* Conversations Sidebar */}
      <div className="hidden md:flex w-72 flex-col border rounded-xl bg-card overflow-hidden shrink-0">
        <div className="p-3 border-b flex items-center justify-between">
          <h2 className="text-sm font-semibold">المحادثات</h2>
          <Dialog open={newConvDialogOpen} onOpenChange={setNewConvDialogOpen}>
            <DialogTrigger asChild>
              <Button size="icon" variant="ghost" className="size-7">
                <Plus className="size-4" />
              </Button>
            </DialogTrigger>
            <DialogContent dir="rtl">
              <DialogHeader>
                <DialogTitle>محادثة جديدة</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <Input
                  placeholder="عنوان المحادثة (اختياري)"
                  value={newConvTitle}
                  onChange={(e) => setNewConvTitle(e.target.value)}
                />
                <Button onClick={handleCreateConversation} className="w-full bg-primary hover:bg-primary/90">
                  إنشاء
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <ScrollArea className="flex-1">
          {loadingConvs ? (
            <div className="p-4 space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 rounded-lg bg-muted/50 animate-pulse" />
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted-foreground">
              لا توجد محادثات بعد
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => handleSelectConversation(conv)}
                  className={`w-full text-right p-2.5 rounded-lg text-sm transition-colors ${
                    activeConversation?.id === conv.id
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'hover:bg-muted/50 text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <MessageSquare className="size-3.5 shrink-0" />
                    <span className="truncate text-xs">{conv.title || 'محادثة جديدة'}</span>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[10px] text-muted-foreground">
                      {conv._count?.messages || 0} رسالة
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      · {new Date(conv.updatedAt).toLocaleDateString('ar-EG')}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col border rounded-xl bg-card overflow-hidden">
        {/* Chat Header */}
        <div className="p-3 border-b flex items-center gap-3">
          <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="size-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">المساعد الذكي</h3>
            <p className="text-[10px] text-muted-foreground">مدعوم بالذكاء الاصطناعي لمساعدتك في التغذية والتمارين</p>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-4 py-8">
              <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Bot className="size-8 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">مرحباً بك في المساعد الذكي!</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-md">
                  يمكنني مساعدتك في إنشاء خطط التغذية والتمارين، حساب الماكروز، والإجابة على أسئلتك الغذائية
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center mt-2">
                {suggestionChips.map((chip) => (
                  <Button
                    key={chip.label}
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={() => handleSendMessage(chip.prompt)}
                  >
                    <chip.icon className="size-3" />
                    {chip.label}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4 max-w-3xl mx-auto">
              <AnimatePresence>
                {messages.map((msg, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                  >
                    <Avatar className="size-7 shrink-0 border">
                      <AvatarFallback className={`text-[10px] font-bold ${
                        msg.role === 'user'
                          ? 'bg-primary/10 text-primary'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {msg.role === 'user' ? 'أ' : 'ذ'}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`max-w-[80%] ${msg.role === 'user' ? 'text-left' : ''}`}>
                      <div
                        className={`inline-block rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-primary text-primary-foreground rounded-br-sm'
                            : 'bg-muted rounded-bl-sm'
                        }`}
                      >
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                      </div>
                      {msg.role === 'assistant' && msg.providerUsed && (
                        <p className="text-[9px] text-muted-foreground mt-1 px-1">
                          {msg.providerUsed} {msg.modelUsed && `· ${msg.modelUsed}`}
                        </p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {isSending && messages[messages.length - 1]?.role === 'user' && (
                <div className="flex gap-2.5">
                  <Avatar className="size-7 shrink-0 border">
                    <AvatarFallback className="text-[10px] font-bold bg-emerald-100 text-emerald-700">ذ</AvatarFallback>
                  </Avatar>
                  <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3">
                    <div className="flex gap-1">
                      <span className="size-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:0ms]" />
                      <span className="size-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:150ms]" />
                      <span className="size-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:300ms]" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Input Area */}
        <div className="p-3 border-t">
          <div className="flex gap-2 max-w-3xl mx-auto">
            <Input
              ref={inputRef}
              placeholder="اكتب رسالتك..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isSending}
              className="flex-1 h-10 text-sm"
            />
            <Button
              onClick={() => handleSendMessage()}
              disabled={isSending || !inputMessage.trim()}
              size="icon"
              className="size-10 bg-primary hover:bg-primary/90 shrink-0"
            >
              {isSending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
            </Button>
          </div>
          {/* Suggestion chips at bottom */}
          {messages.length === 0 && (
            <div className="flex flex-wrap gap-1.5 justify-center mt-2 md:hidden">
              {suggestionChips.map((chip) => (
                <Button
                  key={chip.label}
                  variant="outline"
                  size="sm"
                  className="gap-1 text-[10px] h-7"
                  onClick={() => handleSendMessage(chip.prompt)}
                >
                  <chip.icon className="size-2.5" />
                  {chip.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
