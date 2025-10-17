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
import { ChevronDown, ChevronUp, User, Bot } from 'lucide-react';

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

interface ChatMessageProps {
  message: Message;
  isStreaming?: boolean;
}

export default function ChatMessage({ message, isStreaming }: ChatMessageProps) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [displayedContent, setDisplayedContent] = useState('');
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

  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-4 duration-300`}>
      {!isUser && (
        <div className="flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
            <Bot className="w-6 h-6 text-white" />
          </div>
        </div>
      )}

      <div className={`flex-1 max-w-[85%] ${isUser ? 'flex flex-col items-end' : ''}`}>
        <Card className={`${
          isUser 
            ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-0 shadow-lg' 
            : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-md'
        } transition-all duration-200 hover:shadow-xl`}>
          <CardContent className="p-4">
            {isUser ? (
              <p className="text-sm leading-relaxed">{message.content}</p>
            ) : (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                {isStreaming ? (
                  <div className="whitespace-pre-wrap break-words">
                    {displayedContent}
                    <span className="inline-block w-2 h-4 ml-1 bg-indigo-500 animate-pulse" />
                  </div>
                ) : (
                  <Markdown className="text-sm">
                    {displayedContent}
                  </Markdown>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Metadata */}
        {message.metadata && (
          <div className="flex gap-2 mt-2 text-xs flex-wrap">
            <Badge variant="secondary" className="flex items-center gap-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300">
              ⏱️ Execution time: {message.metadata.execution_time?.toFixed(2)}s
            </Badge>
            <Badge variant="secondary" className="flex items-center gap-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300">
              🪙 Total tokens: {message.metadata.total_tokens}
            </Badge>
            <Badge variant="secondary" className="flex items-center gap-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
              📥 Output tokens: {message.metadata.input_tokens}
            </Badge>
            <Badge variant="secondary" className="flex items-center gap-1 bg-pink-100 dark:bg-pink-900 text-pink-700 dark:text-pink-300">
              📤 Input Tokens: {message.metadata.output_tokens}
            </Badge>
          </div>
        )}

        {/* Agent Execution Details - FULLY RESTORED */}
        {(message.scratchpad || message.tool_response) && (
          <Collapsible
            open={isDetailsOpen}
            onOpenChange={setIsDetailsOpen}
            className="mt-2 w-full"
          >
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between hover:bg-indigo-50 dark:hover:bg-indigo-950">
                <span className="text-xs">🔍 Agent Execution Details</span>
                {isDetailsOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <Card className="mt-2 border-indigo-200 dark:border-indigo-800">
                <CardContent className="p-4">
                  <Tabs defaultValue={message.scratchpad ? 'planning' : 'tools'}>
                    <TabsList className="grid w-full grid-cols-2">
                      {message.scratchpad && (
                        <TabsTrigger value="planning">🧠 Agent Planning</TabsTrigger>
                      )}
                      {message.tool_response && (
                        <TabsTrigger value="tools">🛠️ Tool Executions</TabsTrigger>
                      )}
                    </TabsList>

                    {message.scratchpad && (
                      <TabsContent value="planning" className="space-y-2">
                        <h4 className="font-semibold text-sm">Agent's Planning Variables:</h4>
                        {Object.entries(message.scratchpad).map(([key, value]) => (
                          <div key={key} className="space-y-1">
                            <p className="font-medium text-sm">{key}:</p>
                            <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                              {typeof value === 'object'
                                ? JSON.stringify(value, null, 2)
                                : String(value)}
                            </pre>
                          </div>
                        ))}
                      </TabsContent>
                    )}

                    {message.tool_response && (
                      <TabsContent value="tools" className="space-y-4">
                        {typeof message.tool_response === 'object' && (
                          <>
                            {/* Display summary metrics at the top */}
                            <div className="grid grid-cols-2 gap-2">
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

                            {/* Display individual tool executions */}
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
      </div>

      {isUser && (
        <div className="flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center shadow-lg">
            <User className="w-6 h-6 text-white" />
          </div>
        </div>
      )}
    </div>
  );
}

// Tool Execution Card Component
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
            <p className="text-xs text-muted-foreground">
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
          <div className="space-y-3 text-xs">
            {/* AI Message Content (reasoning before tool call) */}
            {execution.ai_content && (
              <div>
                <p className="font-medium mb-1">💭 AI Reasoning:</p>
                <p className="bg-muted p-2 rounded">{execution.ai_content}</p>
              </div>
            )}

            {/* Tool Arguments */}
            {toolCall.args && (
              <div>
                <p className="font-medium mb-1">🔹 Tool Arguments:</p>
                <pre className="bg-muted p-2 rounded overflow-auto max-h-40">
                  {JSON.stringify(toolCall.args, null, 2)}
                </pre>
              </div>
            )}

            {/* Response Metadata (Token Usage) */}
            {tokenUsage && Object.keys(tokenUsage).length > 0 && (
              <div>
                <p className="font-medium mb-2">📈 Token Usage & Performance:</p>
                
                {/* Token metrics */}
                <div className="grid grid-cols-4 gap-2 mb-2">
                  <Badge variant="outline">Prompt: {tokenUsage.prompt_tokens || 0}</Badge>
                  <Badge variant="outline">Completion: {tokenUsage.completion_tokens || 0}</Badge>
                  <Badge variant="outline">Total: {tokenUsage.total_tokens || 0}</Badge>
                  <Badge variant="outline">
                    Time: {tokenUsage.total_time ? `${tokenUsage.total_time.toFixed(3)}s` : 'N/A'}
                  </Badge>
                </div>
                
                {/* Timing breakdown */}
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

            {/* Model Information */}
            {(responseMetadata.model_name || responseMetadata.finish_reason) && (
              <div>
                <p className="font-medium mb-1">🤖 Model Details:</p>
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

            {/* Tool Result */}
            {toolResult && Object.keys(toolResult).length > 0 && (
              <div>
                {toolResult.status && (
                  <>
                    {(() => {
                      const status = toolResult.status;
                      const statusIcon = status === 'success' ? '✅' : status === 'error' ? '❌' : '⚠️';
                      return (
                        <>
                          <p className="font-medium mb-1">{statusIcon} Execution Result:</p>
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
                
                {/* Result Content */}
                {toolResult.content && (
                  <div>
                    <p className="font-medium mb-1">Output:</p>
                    {typeof toolResult.content === 'object' ? (
                      <pre className="bg-muted p-2 rounded overflow-auto max-h-60 text-[10px]">
                        {JSON.stringify(toolResult.content, null, 2)}
                      </pre>
                    ) : (
                      <div className="bg-muted p-2 rounded overflow-auto max-h-60">
                        {String(toolResult.content).length > 200 ? (
                          <pre className="text-[10px] whitespace-pre-wrap">{String(toolResult.content)}</pre>
                        ) : (
                          <p className="text-sm">{String(toolResult.content)}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Additional result metadata */}
                {(toolResult.name || toolResult.message_id) && (
                  <div className="mt-2">
                    <p className="font-medium mb-1">🔍 Result Metadata:</p>
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

            {/* Message metadata */}
            <div>
              <p className="font-medium mb-1">📋 Execution Metadata:</p>
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
