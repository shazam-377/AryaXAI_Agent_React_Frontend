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
import { Loader2, ArrowUp, Square, Brain, ChevronDown, ChevronUp, Mic, MicOff, AlertCircle, LogOut, RotateCcw, Copy, Volume2, VolumeX, Check } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Alert, AlertDescription } from '@/components/ui/alert';
import SessionReviewModal from '@/components/SessionReviewModal';

const API_WS_URL = process.env.NEXT_PUBLIC_API_WS_URL;
const API_HTTP_URL = process.env.NEXT_PUBLIC_API_HTTP_URL;

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sessionId?: string;
  reasoning?: string;
  userQuery?: string;
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
  const [showReasoningBox, setShowReasoningBox] = useState(false);
  const [isReasoningOpen, setIsReasoningOpen] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState('');
  const [speechSupported, setSpeechSupported] = useState(true);
  const [voiceInputAvailable, setVoiceInputAvailable] = useState(true);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [isReasoningSpeaking, setIsReasoningSpeaking] = useState(false);
  const [reasoningCopied, setReasoningCopied] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const recognitionRef = useRef<any>(null);
  const reasoningSpeakingRef = useRef<SpeechSynthesisUtterance | null>(null);

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

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      setSpeechSupported(!!SpeechRecognition);
    }
  }, []);

  // Initialize WebSocket connection once
  useEffect(() => {
    const initializeWebSocket = () => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        console.log('WebSocket already connected');
        return;
      }

      if (!API_WS_URL) {
        console.error('WebSocket URL is not defined in environment variables');
        setSpeechError('WebSocket URL not configured');
        return;
      }

      try {
        console.log('Initializing WebSocket:', API_WS_URL);
        const ws = new WebSocket(API_WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('WebSocket connected successfully');
          setWsConnected(true);
          setSpeechError('');
        };

        ws.onerror = (event) => {
          console.error('WebSocket error:', event);
          setWsConnected(false);
          setSpeechError('WebSocket connection error. Please refresh.');
          setTimeout(() => setSpeechError(''), 5000);
        };

        ws.onclose = (event) => {
          console.log('WebSocket closed:', event.code, event.reason);
          setWsConnected(false);
          wsRef.current = null;
        };
      } catch (error) {
        console.error('Error creating WebSocket:', error);
        setWsConnected(false);
      }
    };

    initializeWebSocket();

    // Cleanup on unmount
    return () => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        console.log('Closing WebSocket on unmount');
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  const initializeSpeechRecognition = () => {
    if (typeof window === 'undefined') return false;
    
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return false;
    }

    if (recognitionRef.current) {
      return true;
    }

    try {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onstart = () => {
        setSpeechError('');
        setIsListening(true);
      };

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputValue(prev => (prev ? prev + ' ' + transcript : transcript));
        setIsListening(false);
        setSpeechError('');
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        
        let errorMessage = '';
        switch (event.error) {
          case 'network':
            errorMessage = 'Network error. Speech recognition requires an active internet connection.';
            break;
          case 'not-allowed':
          case 'permission-denied':
            errorMessage = 'Microphone access denied. Please allow microphone permissions in your browser.';
            break;
          case 'no-speech':
            errorMessage = 'No speech detected. Please try speaking again.';
            break;
          case 'aborted':
            return;
          case 'audio-capture':
            errorMessage = 'No microphone detected. Please connect a microphone.';
            break;
          case 'service-not-allowed':
            errorMessage = 'Speech service unavailable. Please check your internet connection.';
            break;
          default:
            errorMessage = `Unable to use voice input: ${event.error}`;
        }
        
        setSpeechError(errorMessage);
        setTimeout(() => setSpeechError(''), 5000);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };

      return true;
    } catch (error) {
      console.error('Error initializing speech recognition:', error);
      setSpeechSupported(false);
      return false;
    }
  };

  const toggleListening = async () => {
    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch (error) {
        console.error('Error stopping recognition:', error);
      }
      setIsListening(false);
      return;
    }

    if (!recognitionRef.current) {
      const initialized = initializeSpeechRecognition();
      if (!initialized) {
        setVoiceInputAvailable(false);
        setSpeechError('Speech recognition is not available in your browser.');
        setTimeout(() => setSpeechError(''), 3000);
        return;
      }
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      try {
        recognitionRef.current.start();
        setSpeechError('');
      } catch (startError: any) {
        console.error('Error starting speech recognition:', startError);
        setSpeechError('Unable to start voice input. Please try again.');
        setTimeout(() => setSpeechError(''), 3000);
      }
    } catch (error: any) {
      console.error('Error requesting microphone permission:', error);
      
      if (error.name === 'NotAllowedError') {
        setSpeechError('Microphone permission denied. Please allow access in your browser settings.');
      } else if (error.name === 'NotFoundError') {
        setSpeechError('No microphone found. Please connect a microphone and try again.');
      } else {
        setSpeechError('Unable to access microphone. Please check your browser settings.');
      }
      
      setTimeout(() => setSpeechError(''), 5000);
    }
  };

  const handleRetry = (query: string) => {
    setMessages(prev => prev.slice(0, -1));
    setInputValue(query);
    setStreamingMessage(null);
    
    setTimeout(() => {
      handleSubmit(query);
    }, 100);
  };

  const handleResetSession = () => {
    // Close websocket if open
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.close();
    }
    wsRef.current = null;
    
    // Reset all state
    setMessages([]);
    setInputValue('');
    setIsLoading(false);
    setStreamingMessage(null);
    setStreamingReasoning('');
    setIsReasoningActive(false);
    setShowReasoningBox(false);
    setIsReasoningOpen(true);
    setCurrentSessionId(null);
    setSpeechError('');
    setWsConnected(false);
    setIsReasoningSpeaking(false);
    setReasoningCopied(false);

    // Reconnect WebSocket
    setTimeout(() => {
      if (!API_WS_URL) {
        console.error('WebSocket URL is not defined');
        return;
      }

      try {
        const ws = new WebSocket(API_WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('WebSocket reconnected');
          setWsConnected(true);
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          setWsConnected(false);
        };

        ws.onclose = () => {
          console.log('WebSocket closed');
          setWsConnected(false);
          wsRef.current = null;
        };
      } catch (error) {
        console.error('Error creating WebSocket:', error);
        setWsConnected(false);
      }
    }, 100);
  };

  const handleExitSession = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.close();
    }
    setShowReviewModal(true);
  };

  const copyReasoningToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(streamingReasoning);
      setReasoningCopied(true);
      setTimeout(() => setReasoningCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy reasoning:', err);
    }
  };

  const toggleReasoningSpeech = () => {
    if (isReasoningSpeaking) {
      window.speechSynthesis.cancel();
      setIsReasoningSpeaking(false);
    } else {
      const utterance = new SpeechSynthesisUtterance(streamingReasoning);
      reasoningSpeakingRef.current = utterance;
      
      utterance.onend = () => {
        setIsReasoningSpeaking(false);
      };
      
      utterance.onerror = () => {
        setIsReasoningSpeaking(false);
      };

      window.speechSynthesis.speak(utterance);
      setIsReasoningSpeaking(true);
    }
  };

  const handleSubmit = async (queryOverride?: string) => {
    const userQuery = queryOverride || inputValue;
    
    if (!userQuery.trim() || isLoading) return;

    // Check if WebSocket is connected
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setSpeechError('WebSocket not connected. Please wait...');
      setTimeout(() => setSpeechError(''), 3000);
      return;
    }

    sendMessageToWebSocket(userQuery);
  };

  const sendMessageToWebSocket = (userQuery: string) => {
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userQuery,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setStreamingReasoning('');
    setIsReasoningActive(false);
    setShowReasoningBox(false);
    setIsReasoningOpen(true);
    setReasoningCopied(false);
    setIsReasoningSpeaking(false);

    let fullResponse = '';
    let fullReasoning = '';
    let metadata: any = null;
    let scratchpad: any = null;
    let toolResponse: any = null;
    let sessionId: string = '';
    const assistantMessageId = `assistant-${Date.now()}`;

    const payload = {
      message: userQuery,
      details: {
        organization,
        workspace,
        project,
        token,
      },
    };

    try {
      console.log('Sending message through existing WebSocket:', userQuery);
      if (wsRef.current) {
        wsRef.current.send(JSON.stringify(payload));
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setSpeechError('Failed to send message');
      setIsLoading(false);
      setTimeout(() => setSpeechError(''), 3000);
      return;
    }

    // Handle incoming messages
    const handleMessage = (event: MessageEvent) => {
      const result = event.data;
      console.log('Received:', result.substring(0, 100));

      if (result === '[DONE]') {
        const assistantMessage: Message = {
          id: assistantMessageId,
          role: 'assistant',
          content: fullResponse,
          reasoning: fullReasoning,
          userQuery: userQuery,
          sessionId: sessionId,
          metadata,
          scratchpad,
          tool_response: toolResponse,
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setStreamingMessage(null);
        setIsLoading(false);
        setIsReasoningActive(false);
        setShowReasoningBox(false);
        setStreamingReasoning('');
        
        console.log('Message completed, ready for next query');
        return;
      }

      if (result.startsWith('[ERROR]')) {
        fullResponse = `Error: ${result.substring(7)}`;
        setStreamingMessage({
          id: assistantMessageId,
          role: 'assistant',
          content: fullResponse,
          userQuery: userQuery,
        });
        setIsLoading(false);
        setIsReasoningActive(false);
        setShowReasoningBox(false);
        
        console.log('Error received');
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
        setCurrentSessionId(sessionId);
        return;
      }

      if (result.startsWith('[REASONING]')) {
        const reasoningChunk = result.substring(11);
        fullReasoning += reasoningChunk;
        setStreamingReasoning(fullReasoning);
        setIsReasoningActive(true);
        setShowReasoningBox(true);
        return;
      }

      if (result === '[REASONING_DONE]') {
        setIsReasoningActive(false);
        return;
      }

      fullResponse += result;
      setStreamingMessage({
        id: assistantMessageId,
        role: 'assistant',
        content: fullResponse,
        reasoning: fullReasoning,
        userQuery: userQuery,
      });
    };

    // Set message handler
    if (wsRef.current) {
      wsRef.current.onmessage = handleMessage;
    }
  };

  return (
    <>
      <Card className="shadow-2xl border-2 border-indigo-100 dark:border-indigo-900 h-[calc(100vh-180px)] flex flex-col bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
        <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
          {/* Header with exit and reset buttons */}
          <div className="border-b bg-white dark:bg-slate-900 px-4 py-3 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-300">AryaXAI Chat</h2>
              <div 
                className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`} 
                title={wsConnected ? 'Connected' : 'Disconnected'} 
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900"
                onClick={handleResetSession}
                title="Start a new session"
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                <span className="text-xs">Reset Session</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-lg hover:bg-red-100 dark:hover:bg-red-900 text-red-600 dark:text-red-400"
                onClick={handleExitSession}
                title="Exit and review session"
              >
                <LogOut className="h-4 w-4 mr-1" />
                <span className="text-xs">Exit Session</span>
              </Button>
            </div>
          </div>

          <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
            <div className="space-y-4 max-w-4xl mx-auto">
              {messages.map((message, index) => (
                <div key={message.id}>
                  {message.reasoning && (
                    <div className="flex gap-3 justify-start mb-2 group">
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
                              
                              {/* Copy and TTS buttons for reasoning - visible on hover */}
                              <div className="flex gap-2 items-center mt-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900"
                                  onClick={copyReasoningToClipboard}
                                  title="Copy reasoning"
                                >
                                  {reasoningCopied ? (
                                    <>
                                      <Check className="h-3 w-3 text-green-600 mr-1" />
                                      <span className="text-xs text-green-600">Copied</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="h-3 w-3 text-purple-600 dark:text-purple-400 mr-1" />
                                      <span className="text-xs text-purple-600 dark:text-purple-400">Copy</span>
                                    </>
                                  )}
                                </Button>
                                
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900"
                                  onClick={toggleReasoningSpeech}
                                  title={isReasoningSpeaking ? "Stop speaking" : "Read reasoning aloud"}
                                >
                                  {isReasoningSpeaking ? (
                                    <>
                                      <VolumeX className="h-3 w-3 text-red-600 dark:text-red-400 mr-1" />
                                      <span className="text-xs text-red-600 dark:text-red-400">Stop</span>
                                    </>
                                  ) : (
                                    <>
                                      <Volume2 className="h-3 w-3 text-purple-600 dark:text-purple-400 mr-1" />
                                      <span className="text-xs text-purple-600 dark:text-purple-400">Read aloud</span>
                                    </>
                                  )}
                                </Button>
                              </div>
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
                    onRetry={handleRetry}
                  />
                </div>
              ))}

              {showReasoningBox && (
                <div className="flex gap-3 justify-start animate-in fade-in slide-in-from-bottom-4 duration-300 group">
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
                          
                          {/* Copy and TTS buttons for live reasoning - visible on hover */}
                          {!isReasoningActive && streamingReasoning && (
                            <div className="flex gap-2 items-center mt-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900"
                                onClick={copyReasoningToClipboard}
                                title="Copy reasoning"
                              >
                                {reasoningCopied ? (
                                  <>
                                    <Check className="h-3 w-3 text-green-600 mr-1" />
                                    <span className="text-xs text-green-600">Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-3 w-3 text-purple-600 dark:text-purple-400 mr-1" />
                                    <span className="text-xs text-purple-600 dark:text-purple-400">Copy</span>
                                  </>
                                )}
                              </Button>
                              
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900"
                                onClick={toggleReasoningSpeech}
                                title={isReasoningSpeaking ? "Stop speaking" : "Read reasoning aloud"}
                              >
                                {isReasoningSpeaking ? (
                                  <>
                                    <VolumeX className="h-3 w-3 text-red-600 dark:text-red-400 mr-1" />
                                    <span className="text-xs text-red-600 dark:text-red-400">Stop</span>
                                  </>
                                ) : (
                                  <>
                                    <Volume2 className="h-3 w-3 text-purple-600 dark:text-purple-400 mr-1" />
                                    <span className="text-xs text-purple-600 dark:text-purple-400">Read aloud</span>
                                  </>
                                )}
                              </Button>
                            </div>
                          )}
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
                  onRetry={handleRetry}
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
            <div className="max-w-4xl mx-auto space-y-2 group">
              {speechError && (
                <Alert variant="destructive" className="animate-in fade-in slide-in-from-bottom-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">{speechError}</AlertDescription>
                </Alert>
              )}

              <PromptInput
                value={inputValue}
                onValueChange={setInputValue}
                onSubmit={() => handleSubmit()}
                isLoading={isLoading}
                className="rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              >
                <PromptInputTextarea
                  placeholder="Ask me anything about the AryaXAI platform..."
                  disabled={isLoading}
                />
                <div className="flex justify-between items-center px-3 pb-2">
                  {speechSupported && voiceInputAvailable && (
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
                        disabled={isLoading}
                        onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                          e.preventDefault();
                          toggleListening();
                        }}
                        title={isListening ? "Stop listening" : "Start voice input"}
                      >
                        {isListening ? (
                          <>
                            <MicOff className="h-4 w-4 text-red-600 dark:text-red-400" />
                            <span className="text-xs text-red-600 dark:text-red-400 animate-pulse">Listening...</span>
                          </>
                        ) : (
                          <Mic className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                        )}
                      </Button>
                    </div>
                  )}

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

      {/* Review Modal */}
      <SessionReviewModal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        sessionId={currentSessionId}
        onSessionReset={handleResetSession}
      />
    </>
  );
}
