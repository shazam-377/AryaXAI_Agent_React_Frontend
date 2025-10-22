'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputSubmit,
} from '@/components/ui/prompt-input';
import ChatMessage from '@/components/ChatMessage';
import { Loader2 } from 'lucide-react';

const API_WS_URL = process.env.NEXT_PUBLIC_API_WS_URL;

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
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
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingMessage]);

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

    const ws = new WebSocket(API_WS_URL!);
    wsRef.current = ws;

    let fullResponse = '';
    let metadata: any = null;
    let scratchpad: any = null;
    let toolResponse: any = null;
    const assistantMessageId = `assistant-${Date.now()}`;

    ws.onopen = () => {
      const payload = {
        message: inputValue,
        details: {
          organization,
          workspace,
          project,
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
          metadata,
          scratchpad,
          tool_response: toolResponse,
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setStreamingMessage(null);
        setIsLoading(false);
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

      fullResponse += result;
      setStreamingMessage({
        id: assistantMessageId,
        role: 'assistant',
        content: fullResponse,
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
    };

    ws.onclose = () => {
      wsRef.current = null;
    };
  };

  return (
    <Card className="shadow-2xl border-2 border-indigo-100 dark:border-indigo-900 h-[calc(100vh-280px)] flex flex-col bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
          <div className="space-y-4 max-w-4xl mx-auto">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}

            {streamingMessage && (
              <ChatMessage
                message={streamingMessage}
                isStreaming
              />
            )}

            {isLoading && !streamingMessage && (
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

        <div className="border-t bg-gradient-to-r from-slate-50 to-indigo-50 dark:from-slate-900 dark:to-indigo-950 p-4">
          <div className="max-w-4xl mx-auto">
            <PromptInput
              value={inputValue}
              onValueChange={setInputValue}
              onSubmit={handleSubmit}
              isLoading={isLoading}
            >
              <PromptInputTextarea
                placeholder="Type your message here..."
                disabled={isLoading}
              />
              <PromptInputSubmit disabled={isLoading || !inputValue.trim()} />
            </PromptInput>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
