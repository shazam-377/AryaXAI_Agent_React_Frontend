'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  PromptInput,
  PromptInputTextarea,
} from '@/components/ui/prompt-input';
import ChatMessage from '@/components/ChatMessage';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowUp, Square, Brain, ChevronDown, ChevronUp } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

const API_WS_URL = process.env.NEXT_PUBLIC_API_WS_URL;

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sessionId?: string;
  reasoning?: string;
  metadata?: {
    execution_time?: number;
    total_tokens?: number;
    input_tokens?: number;
    output_tokens?: number;
  };
  scratchpad?: any;
  tool_response?: any;
}

interface ChatInterfaceProps {
  token: string;
  organization: string;
  workspace: string;
  project: string;
}

export default function ChatInterface({
  token,
  organization,
  workspace,
  project,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState<Message | null>(null);
  const [streamingReasoning, setStreamingReasoning] = useState('');
  const [isReasoningActive, setIsReasoningActive] = useState(false);
  const [showReasoningBox, setShowReasoningBox] = useState(false); // Show reasoning box
  const [isReasoningOpen, setIsReasoningOpen] = useState(true);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector(
        '[data-radix-scroll-area-viewport]'
      );
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingMessage, streamingReasoning]);

  const handleSubmit = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: inputValue,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setStreamingReasoning('');
    setIsReasoningActive(false);
    setShowReasoningBox(false);
    setIsReasoningOpen(true);

    const ws = new WebSocket(API_WS_URL!);
    wsRef.current = ws;

    let fullResponse = '';
    let fullReasoning = '';
    let metadata: any = null;
    let scratchpad: any = null;
    let toolResponse: any = null;
    let sessionId: string | undefined;
    const assistantMessageId = `assistant-${Date.now()}`;

    ws.onopen = () => {
      const payload = {
        message: inputValue,
        details: {
          organization: organization || '',
          workspace: workspace || '',
          project: project || '',
          token,
        },
      };
      ws.send(JSON.stringify(payload));
    };

    ws.onmessage = (event) => {
      const result = event.data;

      if (result === '[DONE]') {
        const assistantMessage: Message = {
          id: assistantMessageId,
          role: 'assistant',
          content: fullResponse,
          reasoning: fullReasoning,
          sessionId: sessionId,
          metadata,
          scratchpad,
          tool_response: toolResponse,
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setStreamingMessage(null);
        setIsLoading(false);
        setIsReasoningActive(false);
        setShowReasoningBox(false); // Hide after completion
        setStreamingReasoning('');
        ws.close();
        return;
      }

      if (result.startsWith('[ERROR]')) {
        fullResponse = `Error: ${result.substring(7)}`;
        setStreamingMessage({
          id: assistantMessageId,
          role: 'assistant',
          content: fullResponse,
        });
        setIsLoading(false);
        setIsReasoningActive(false);
        setShowReasoningBox(false);
        return;
      }

      if (result.startsWith('[METADATA]')) {
        metadata = JSON.parse(result.substring(10));
        return;
      }

      if (result.startsWith('[SCRATCHPAD]')) {
        scratchpad = JSON.parse(result.substring(12));
        return;
      }

      if (result.startsWith('[TOOLRESPONSE]')) {
        toolResponse = JSON.parse(result.substring(14));
        return;
      }

      if (result.startsWith('[SESSION_ID]')) {
        sessionId = result.substring(12);
        return;
      }

      if (result.startsWith('[REASONING]')) {
        const reasoningChunk = result.substring(11);
        fullReasoning += reasoningChunk;
        setStreamingReasoning(fullReasoning);
        setIsReasoningActive(true);
        setShowReasoningBox(true); // Show reasoning box
        return;
      }

      if (result === '[REASONING_DONE]') {
        // Reasoning complete, but keep box visible
        setIsReasoningActive(false);
        // Don't hide the box - it stays during response streaming
        return;
      }

      // Stream assistant message content
      fullResponse += result;
      setStreamingMessage({
        id: assistantMessageId,
        role: 'assistant',
        content: fullResponse,
        reasoning: fullReasoning,
      });
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsLoading(false);
      setStreamingMessage({
        id: assistantMessageId,
        role: 'assistant',
        content: 'Connection error occurred',
      });
      setIsReasoningActive(false);
      setShowReasoningBox(false);
    };

    ws.onclose = () => {
      wsRef.current = null;
    };
  };

  return (
    <Card className="shadow-2xl border-2 border-indigo-100 dark:border-indigo-900 h-[calc(100vh-180px)] flex flex-col bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
          <div className="space-y-4 max-w-4xl mx-auto">
            {messages.map((message, index) => (
              <div key={message.id}>
                {/* Show reasoning dropdown for completed messages */}
                {message.reasoning && (
                  <div className="flex gap-3 justify-start mb-2">
                    <div className="flex-shrink-0 pt-1">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-md">
                        <Brain className="w-5 h-5 text-white" />
                      </div>
                    </div>
                    <div className="flex-1 max-w-[85%]">
                      <Collapsible defaultOpen={false}>
                        <CollapsibleTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-between hover:bg-purple-50 dark:hover:bg-purple-950 p-3 rounded-xl border border-purple-200 dark:border-purple-800"
                          >
                            <span className="text-xs font-semibold text-purple-700 dark:text-purple-300 flex items-center gap-2">
                              <Brain className="w-4 h-4" />
                              View Agent Reasoning
                            </span>
                            <ChevronDown className="h-4 w-4 text-purple-700 dark:text-purple-300" />
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="mt-2 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-2xl px-4 py-3 border border-purple-200 dark:border-purple-800">
                            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                              {message.reasoning}
                            </p>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </div>
                  </div>
                )}
                <ChatMessage
                  message={message}
                  isLastMessage={
                    index === messages.length - 1 && message.role === 'assistant'
                  }
                  token={token}
                />
              </div>
            ))}

            {/* Active Streaming Reasoning - Persists during response streaming */}
            {showReasoningBox && (
              <div className="flex gap-3 justify-start animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="flex-shrink-0 pt-1">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-md">
                    <Brain className={`w-5 h-5 text-white ${isReasoningActive ? 'animate-pulse' : ''}`} />
                  </div>
                </div>
                <div className="flex-1 max-w-[85%]">
                  <Collapsible open={isReasoningOpen} onOpenChange={setIsReasoningOpen}>
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-between hover:bg-purple-50 dark:hover:bg-purple-950 p-3 rounded-xl border border-purple-200 dark:border-purple-800"
                      >
                        <span className="text-xs font-semibold text-purple-700 dark:text-purple-300 flex items-center gap-2">
                          {isReasoningActive && (
                            <div className="flex gap-1">
                              <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                              <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                              <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                            </div>
                          )}
                          {isReasoningActive ? 'Thinking...' : 'Agent Reasoning'}
                        </span>
                        {isReasoningOpen ? (
                          <ChevronUp className="h-4 w-4 text-purple-700 dark:text-purple-300" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-purple-700 dark:text-purple-300" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="mt-2 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-2xl px-4 py-3 border border-purple-200 dark:border-purple-800">
                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                          {streamingReasoning}
                          {isReasoningActive && (
                            <span className="inline-block w-2 h-4 ml-1 bg-purple-500 animate-pulse" />
                          )}
                        </p>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              </div>
            )}

            {streamingMessage && (
              <ChatMessage
                message={streamingMessage}
                isStreaming
                isLastMessage={false}
                token={token}
              />
            )}

            {isLoading && !streamingMessage && !showReasoningBox && (
              <div className="flex items-center justify-center py-8">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                  <span className="text-sm text-muted-foreground animate-pulse">
                    Processing your request...
                  </span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="border-t bg-white dark:bg-slate-900 p-4">
          <div className="max-w-4xl mx-auto">
            <PromptInput
              value={inputValue}
              onValueChange={setInputValue}
              onSubmit={handleSubmit}
              isLoading={isLoading}
              className="rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
            >
              <PromptInputTextarea
                placeholder="Ask me anything about the AryaXAI platform..."
                disabled={isLoading}
              />
              <div className="flex justify-end pt-2 pr-2 pb-2">
                <Button
                  variant="default"
                  size="icon"
                  className="h-8 w-8 rounded-full bg-indigo-600 hover:bg-indigo-700"
                  disabled={isLoading || !inputValue.trim()}
                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                    e.preventDefault();
                    handleSubmit();
                  }}
                >
                  {isLoading ? (
                    <Square className="h-4 w-4 fill-current" />
                  ) : (
                    <ArrowUp className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </PromptInput>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
