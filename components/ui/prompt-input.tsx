'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface PromptInputContextValue {
  value: string;
  onValueChange: (value: string) => void;
  isLoading: boolean;
  onSubmit: () => void;
}

const PromptInputContext = React.createContext<PromptInputContextValue | null>(
  null
);

function usePromptInput() {
  const context = React.useContext(PromptInputContext);
  if (!context) {
    throw new Error('usePromptInput must be used within a PromptInput');
  }
  return context;
}

interface PromptInputProps {
  value: string;
  onValueChange: (value: string) => void;
  onSubmit: () => void;
  isLoading?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function PromptInput({
  value,
  onValueChange,
  onSubmit,
  isLoading = false,
  children,
  className,
}: PromptInputProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoading && value.trim()) {
      onSubmit();
    }
  };

  return (
    <PromptInputContext.Provider
      value={{ value, onValueChange, isLoading, onSubmit }}
    >
      <form
        onSubmit={handleSubmit}
        className={cn(
          'relative flex flex-col rounded-2xl border bg-background p-3 shadow-sm',
          className
        )}
      >
        {children}
      </form>
    </PromptInputContext.Provider>
  );
}

interface PromptInputTextareaProps
  extends Omit<React.ComponentProps<'textarea'>, 'value' | 'onChange'> {
  disableAutosize?: boolean;
}

export function PromptInputTextarea({
  className,
  disableAutosize = false,
  onKeyDown,
  disabled,
  ...props
}: PromptInputTextareaProps) {
  const { value, onValueChange, isLoading, onSubmit } = usePromptInput();
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  React.useEffect(() => {
    if (!disableAutosize && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value, disableAutosize]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && value.trim()) {
        onSubmit();
      }
    }
    onKeyDown?.(e);
  };

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      onKeyDown={handleKeyDown}
      disabled={disabled || isLoading}
      className={cn(
        'flex-1 resize-none bg-transparent text-sm placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
        'min-h-[52px] max-h-[200px] leading-relaxed',
        className
      )}
      rows={1}
      {...props}
    />
  );
}

interface PromptInputActionsProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function PromptInputActions({
  children,
  className,
  ...props
}: PromptInputActionsProps) {
  return (
    <div
      className={cn('flex items-center gap-2', className)}
      {...props}
    >
      {children}
    </div>
  );
}

// Legacy component for compatibility
export function PromptInputSubmit() {
  return null;
}
