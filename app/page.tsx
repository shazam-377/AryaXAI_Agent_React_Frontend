'use client';

import { useState, useEffect } from 'react';
import ChatInterface from '@/components/ChatInterface';
import AuthPanel from '@/components/AuthPanel';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { Sparkles, ChevronUp, ChevronDown } from 'lucide-react';

export default function Home() {
  const [token, setToken] = useState('');
  const [verified, setVerified] = useState(false);
  const [organization, setOrganization] = useState('');
  const [workspace, setWorkspace] = useState('');
  const [project, setProject] = useState('');
  const [detailsCollapsed, setDetailsCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [setupOpen, setSetupOpen] = useState(true);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const allDetailsFilled =
    token &&
    verified &&
    organization &&
    organization !== '--Select--' &&
    workspace &&
    workspace !== '--Select--' &&
    project &&
    project !== '--Select--';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <Card className="mb-6 shadow-xl border-0 overflow-hidden">
          <CardHeader className="relative bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white py-6">
            <div className="absolute top-4 right-4 z-10">
              <ThemeToggle />
            </div>
            <div className="flex items-center justify-center gap-3">
              <CardTitle className="text-3xl md:text-4xl font-bold text-center">
                AryaXAI Agent
              </CardTitle>
            </div>
          </CardHeader>
        </Card>

        {/* Collapsible section */}
        <Collapsible open={setupOpen} onOpenChange={setSetupOpen}>
          <div className="flex items-center justify-between">
            <p className="text-lg font-semibold text-slate-700 dark:text-slate-300">
              Project Setup
            </p>
            {allDetailsFilled && (
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="flex items-center gap-1">
                  {setupOpen ? (
                    <>
                      <ChevronUp className="h-4 w-4" />
                      <span>Hide Setup</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4" />
                      <span>Show Setup</span>
                    </>
                  )}
                </Button>
              </CollapsibleTrigger>
            )}
          </div>

          {/* The key part */}
          <div
            className={`transition-all overflow-hidden duration-300 ${
              setupOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0 pointer-events-none'
            }`}
          >
            <AuthPanel
              token={token}
              setToken={setToken}
              verified={verified}
              setVerified={setVerified}
              organization={organization}
              setOrganization={setOrganization}
              workspace={workspace}
              setWorkspace={setWorkspace}
              project={project}
              setProject={setProject}
            />
          </div>
        </Collapsible>


        {/* Show chat interface below */}
        {allDetailsFilled && (
          <div className="mt-6">
            <ChatInterface
              token={token}
              organization={organization}
              workspace={workspace}
              project={project}
            />
          </div>
        )}
      </div>
    </div>
  );
}
