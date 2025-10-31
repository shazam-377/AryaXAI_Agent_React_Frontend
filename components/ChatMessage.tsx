'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Markdown } from '@/components/ui/markdown';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, User, Bot, ThumbsUp, ThumbsDown } from 'lucide-react';

const API_HTTP_URL = process.env.NEXT_PUBLIC_API_HTTP_URL;

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sessionId?: string;
  metadata?: {
    execution_time?: number;
    total_tokens?: number;
    input_tokens?: number;
    output_tokens?: number;
  };
  scratchpad?: any;
  tool_response?: any;
}

interface ChatMessageProps {
  message: Message;
  isStreaming?: boolean;
  isLastMessage?: boolean;
  token: string;
}

export default function ChatMessage({ 
  message, 
  isStreaming, 
  isLastMessage,
  token 
}: ChatMessageProps) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [displayedContent, setDisplayedContent] = useState('');
  const [feedbackGiven, setFeedbackGiven] = useState(false);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const contentRef = useRef(message.content);

  const isUser = message.role === 'user';

  // Smooth streaming effect - reduced jitter
  useEffect(() => {
    if (isStreaming && message.content !== contentRef.current) {
      contentRef.current = message.content;
      setDisplayedContent(message.content);
    } else if (!isStreaming) {
      setDisplayedContent(message.content);
    }
  }, [message.content, isStreaming]);

  const handleFeedback = async (like: boolean) => {
    if (!message.sessionId || isSubmittingFeedback) return;

    setIsSubmittingFeedback(true);

    try {
      const response = await fetch(`${API_HTTP_URL}/update-like-agent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: message.sessionId,
          like: like,
        }),
      });

      if (response.ok) {
        setFeedbackGiven(true);
        setShowThankYou(true);
        
        setTimeout(() => {
          setShowThankYou(false);
        }, 3000);
      } else {
        console.error('Failed to submit feedback');
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  return (
    <div className="mb-8"> {/* Added spacing between conversation sets */}
      <div className={`flex gap-4 ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-4 duration-300`}>
        {!isUser && (
          <div className="flex-shrink-0 pt-1">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-md">
              <Bot className="w-5 h-5 text-white" />
            </div>
          </div>
        )}

        <div className={`flex-1 max-w-[85%] ${isUser ? 'flex flex-col items-end' : ''}`}>
          {isUser ? (
            // Enhanced user message box with border and shadow
            <div className="bg-slate-300 dark:bg-slate-600 border-2 border-slate-400 dark:border-slate-500 rounded-2xl px-5 py-4 max-w-fit shadow-md">
              <p className="text-sm leading-relaxed text-slate-900 dark:text-white font-medium">
                {message.content}
              </p>
            </div>
          ) : (
            <div className="space-y-4"> {/* Increased spacing between assistant components */}
              <div className="prose prose-sm dark:prose-invert max-w-none">
                {isStreaming ? (
                  <div className="whitespace-pre-wrap break-words">
                    {displayedContent}
                    <span className="inline-block w-2 h-4 ml-1 bg-indigo-500 animate-pulse" />
                  </div>
                ) : (
                  <Markdown className="text-sm leading-relaxed">
                    {displayedContent}
                  </Markdown>
                )}
              </div>

              {/* Metadata */}
              {message.metadata && (
                <div className="flex gap-2 text-xs flex-wrap pt-2">
                  <Badge variant="secondary" className="flex items-center gap-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300">
                    execution time: {message.metadata.execution_time?.toFixed(2)}s
                  </Badge>
                  <Badge variant="secondary" className="flex items-center gap-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300">
                    total tokens: {message.metadata.total_tokens}
                  </Badge>
                  <Badge variant="secondary" className="flex items-center gap-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                    input tokens: {message.metadata.input_tokens}
                  </Badge>
                  <Badge variant="secondary" className="flex items-center gap-1 bg-pink-100 dark:bg-pink-900 text-pink-700 dark:text-pink-300">
                    output tokens: {message.metadata.output_tokens}
                  </Badge>
                </div>
              )}

              {/* Agent Execution Details */}
              {(message.scratchpad || message.tool_response) && (
                <Collapsible
                  open={isDetailsOpen}
                  onOpenChange={setIsDetailsOpen}
                  className="w-full"
                >
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full justify-between hover:bg-indigo-50 dark:hover:bg-indigo-950">
                      <span className="text-xs">Agent Execution Details</span>
                      {isDetailsOpen ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <Card className="mt-3 border-indigo-200 dark:border-indigo-800">
                      <CardContent className="p-4">
                        <Tabs defaultValue={message.scratchpad ? 'planning' : 'tools'}>
                          <TabsList className="grid w-full grid-cols-2">
                            {message.scratchpad && (
                              <TabsTrigger value="planning">Agent Planning</TabsTrigger>
                            )}
                            {message.tool_response && (
                              <TabsTrigger value="tools">Tool Executions</TabsTrigger>
                            )}
                          </TabsList>

                          {message.scratchpad && (
                            <TabsContent value="planning" className="space-y-3 mt-4">
                              <h4 className="font-semibold text-sm">Agent's Planning Variables:</h4>
                              {Object.entries(message.scratchpad).map(([key, value]) => (
                                <div key={key} className="space-y-1">
                                  <p className="font-medium text-sm">{key}:</p>
                                  <pre className="text-xs bg-muted p-3 rounded overflow-auto">
                                    {typeof value === 'object'
                                      ? JSON.stringify(value, null, 2)
                                      : String(value)}
                                  </pre>
                                </div>
                              ))}
                            </TabsContent>
                          )}

                          {message.tool_response && (
                            <TabsContent value="tools" className="space-y-4 mt-4">
                              {typeof message.tool_response === 'object' && (
                                <>
                                  <div className="grid grid-cols-2 gap-3">
                                    <Card>
                                      <CardContent className="p-3">
                                        <p className="text-xs text-muted-foreground">Total Executions</p>
                                        <p className="text-2xl font-bold">
                                          {message.tool_response.total_executions || 0}
                                        </p>
                                      </CardContent>
                                    </Card>
                                    <Card>
                                      <CardContent className="p-3">
                                        <p className="text-xs text-muted-foreground">Messages</p>
                                        <p className="text-2xl font-bold">
                                          {message.tool_response.conversation_length || 0}
                                        </p>
                                      </CardContent>
                                    </Card>
                                  </div>

                                  {message.tool_response.tool_executions && message.tool_response.tool_executions.length > 0 ? (
                                    <div className="space-y-4">
                                      {message.tool_response.tool_executions
                                        .slice()
                                        .reverse()
                                        .map((execution: any, i: number) => (
                                          <ToolExecutionCard
                                            key={i}
                                            execution={execution}
                                            index={i + 1}
                                          />
                                        ))}
                                    </div>
                                  ) : (
                                    <p className="text-sm text-muted-foreground">No tool executions recorded</p>
                                  )}
                                </>
                              )}
                            </TabsContent>
                          )}
                        </Tabs>
                      </CardContent>
                    </Card>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Feedback buttons */}
              {!isUser && isLastMessage && !isStreaming && message.sessionId && (
                <div className="w-full pt-2">
                  {!feedbackGiven ? (
                    <div className="flex gap-2 items-center justify-center p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                      <span className="text-xs text-muted-foreground">Was this response helpful?</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleFeedback(true)}
                        disabled={isSubmittingFeedback}
                        className="hover:bg-green-100 dark:hover:bg-green-900 transition-colors"
                      >
                        <ThumbsUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleFeedback(false)}
                        disabled={isSubmittingFeedback}
                        className="hover:bg-red-100 dark:hover:bg-red-900 transition-colors"
                      >
                        <ThumbsDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                      </Button>
                    </div>
                  ) : showThankYou && (
                    <div className="flex items-center justify-center p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800 animate-in fade-in slide-in-from-bottom-2 duration-300 shadow-sm">
                      <p className="text-xs text-green-600 dark:text-green-400 font-medium">
                        ✓ Thank you for sharing your feedback!
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {isUser && (
          <div className="flex-shrink-0 pt-1">
            <div className="w-8 h-8 rounded-full bg-slate-400 dark:bg-slate-600 flex items-center justify-center shadow-md">
              <User className="w-5 h-5 text-white" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Tool Execution Card Component (unchanged structure, added spacing)
function ToolExecutionCard({ execution, index }: { execution: any; index: number }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const toolCall = execution.tool_call || {};
  const toolResult = execution.tool_result || {};
  const responseMetadata = execution.response_metadata || {};
  const tokenUsage = responseMetadata.token_usage || {};

  return (
    <Card className="border-l-4 border-l-indigo-500">
      <CardContent className="p-4 space-y-3">
        <div className="flex justify-between items-start">
          <div>
            <h4 className="font-semibold text-sm">🔧 Tool Execution #{index}</h4>
            <p className="text-xs text-muted-foreground mt-1">
              Tool: <code className="bg-muted px-1 rounded">{toolCall.name || 'N/A'}</code>
            </p>
            <p className="text-xs text-muted-foreground">
              Call ID: <code className="bg-muted px-1 rounded text-[10px]">{toolCall.id || 'N/A'}</code>
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>

        {isExpanded && (
          <div className="space-y-4 text-xs pt-2">
            {execution.ai_content && (
              <div>
                <p className="font-medium mb-2">💭 AI Reasoning:</p>
                <p className="bg-muted p-3 rounded">{execution.ai_content}</p>
              </div>
            )}

            {toolCall.args && (
              <div>
                <p className="font-medium mb-2">🔹 Tool Arguments:</p>
                <pre className="bg-muted p-3 rounded overflow-auto max-h-40">
                  {JSON.stringify(toolCall.args, null, 2)}
                </pre>
              </div>
            )}

            {tokenUsage && Object.keys(tokenUsage).length > 0 && (
              <div>
                <p className="font-medium mb-2">📈 Token Usage & Performance:</p>
                
                <div className="grid grid-cols-4 gap-2 mb-2">
                  <Badge variant="outline">Prompt: {tokenUsage.prompt_tokens || 0}</Badge>
                  <Badge variant="outline">Completion: {tokenUsage.completion_tokens || 0}</Badge>
                  <Badge variant="outline">Total: {tokenUsage.total_tokens || 0}</Badge>
                  <Badge variant="outline">
                    Time: {tokenUsage.total_time ? `${tokenUsage.total_time.toFixed(3)}s` : 'N/A'}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-3 gap-2 text-[10px]">
                  <span className="text-muted-foreground">
                    ⏱️ Prompt: {tokenUsage.prompt_time ? `${tokenUsage.prompt_time.toFixed(3)}s` : 'N/A'}
                  </span>
                  <span className="text-muted-foreground">
                    ⏱️ Completion: {tokenUsage.completion_time ? `${tokenUsage.completion_time.toFixed(3)}s` : 'N/A'}
                  </span>
                  <span className="text-muted-foreground">
                    ⏱️ Queue: {tokenUsage.queue_time ? `${tokenUsage.queue_time.toFixed(3)}s` : 'N/A'}
                  </span>
                </div>
              </div>
            )}

            {(responseMetadata.model_name || responseMetadata.finish_reason) && (
              <div>
                <p className="font-medium mb-2">🤖 Model Details:</p>
                <div className="space-y-1">
                  {responseMetadata.model_name && (
                    <p className="text-muted-foreground">Model: {responseMetadata.model_name}</p>
                  )}
                  {responseMetadata.finish_reason && (
                    <p className="text-muted-foreground">Finish Reason: {responseMetadata.finish_reason}</p>
                  )}
                </div>
              </div>
            )}

            {toolResult && Object.keys(toolResult).length > 0 && (
              <div>
                {toolResult.status && (
                  <>
                    {(() => {
                      const status = toolResult.status;
                      const statusIcon = status === 'success' ? '✅' : status === 'error' ? '❌' : '⚠️';
                      return (
                        <>
                          <p className="font-medium mb-2">{statusIcon} Execution Result:</p>
                          <p className="mb-2">
                            <Badge variant={status === 'success' ? 'default' : 'destructive'}>
                              {status.toUpperCase()}
                            </Badge>
                          </p>
                        </>
                      );
                    })()}
                  </>
                )}
                
                {toolResult.content && (
                  <div>
                    <p className="font-medium mb-2">Output:</p>
                    {typeof toolResult.content === 'object' ? (
                      <pre className="bg-muted p-3 rounded overflow-auto max-h-60 text-[10px]">
                        {JSON.stringify(toolResult.content, null, 2)}
                      </pre>
                    ) : (
                      <div className="bg-muted p-3 rounded overflow-auto max-h-60">
                        {String(toolResult.content).length > 200 ? (
                          <pre className="text-[10px] whitespace-pre-wrap">{String(toolResult.content)}</pre>
                        ) : (
                          <p className="text-sm">{String(toolResult.content)}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {(toolResult.name || toolResult.message_id) && (
                  <div className="mt-3">
                    <p className="font-medium mb-2">🔍 Result Metadata:</p>
                    <div className="space-y-1 text-[10px] text-muted-foreground">
                      {toolResult.name && <p>Tool Name: {toolResult.name}</p>}
                      {toolResult.message_id && <p>Message ID: {toolResult.message_id}</p>}
                      {toolResult.tool_call_id && <p>Tool Call ID: {toolResult.tool_call_id}</p>}
                      {toolResult.message_index !== undefined && <p>Message Index: {toolResult.message_index}</p>}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div>
              <p className="font-medium mb-2">📋 Execution Metadata:</p>
              <div className="space-y-1 text-[10px] text-muted-foreground">
                <p>Message Index: {execution.message_index || 'N/A'}</p>
                <p>Message Type: {execution.message_type || 'N/A'}</p>
                <p>Message ID: {execution.message_id || 'N/A'}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
