'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

const API_HTTP_URL = process.env.NEXT_PUBLIC_API_HTTP_URL;

interface AuthPanelProps {
  token: string;
  setToken: (token: string) => void;
  verified: boolean;
  setVerified: (verified: boolean) => void;
  organization: string;
  setOrganization: (org: string) => void;
  workspace: string;
  setWorkspace: (ws: string) => void;
  project: string;
  setProject: (proj: string) => void;
}

export default function AuthPanel({
  token,
  setToken,
  verified,
  setVerified,
  organization,
  setOrganization,
  workspace,
  setWorkspace,
  project,
  setProject,
}: AuthPanelProps) {
  const [verificationMsg, setVerificationMsg] = useState('');
  const [organizations, setOrganizations] = useState<string[]>([]);
  const [workspaces, setWorkspaces] = useState<string[]>([]);
  const [projects, setProjects] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Debounced token verification
  useEffect(() => {
    if (!token || !mounted) {
      setVerified(false);
      setVerificationMsg('');
      return;
    }

    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Don't show verifying state immediately
    setIsVerifying(true);
    setVerificationMsg('');

    // Set new timer - wait 800ms after user stops typing
    debounceTimerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`${API_HTTP_URL}/verify-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        if (response.ok) {
          const data = await response.json();
          setVerified(true);
          setVerificationMsg(data.message || 'Token verified successfully');
        } else {
          const errorData = await response.json().catch(() => ({}));
          setVerified(false);
          setVerificationMsg(`Token verification failed: ${errorData.detail || response.statusText}`);
        }
      } catch (error) {
        setVerified(false);
        const errorMsg = error instanceof Error ? error.message : String(error);
        setVerificationMsg(`Connection error: ${errorMsg}. Make sure backend is running.`);
        console.error('Fetch error:', error);
      } finally {
        setLoading(false);
        setIsVerifying(false);
      }
    }, 800); // Wait 800ms after user stops typing

    // Cleanup function
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [token, mounted, setVerified]);

  // Fetch organizations
  useEffect(() => {
    if (!verified || !mounted) return;

    const fetchOrganizations = async () => {
      try {
        console.log('Fetching organizations for token:', token);
        const response = await fetch(
          `${API_HTTP_URL}/organizations?token=${token}`
        );
        console.log('Response status:', response.status);
        const data = await response.json();
        console.log('Organizations received:', data.organizations);
        setOrganizations(data.organizations || []);
      } catch (error) {
        console.error('Error fetching organizations:', error);
      }
    };

    fetchOrganizations();
  }, [verified, token, mounted]);

  // Fetch workspaces
  useEffect(() => {
    if (!organization || organization === '--Select--' || !mounted) {
      setWorkspaces([]);
      return;
    }

    const fetchWorkspaces = async () => {
      try {
        const response = await fetch(
          `${API_HTTP_URL}/workspaces?token=${token}&organization=${organization}`
        );
        const data = await response.json();
        setWorkspaces(data.workspaces || []);
      } catch (error) {
        console.error('Error fetching workspaces:', error);
      }
    };

    fetchWorkspaces();
  }, [organization, token, mounted]);

  // Fetch projects
  useEffect(() => {
    if (!workspace || workspace === '--Select--' || !mounted) {
      setProjects([]);
      return;
    }

    const fetchProjects = async () => {
      try {
        const response = await fetch(
          `${API_HTTP_URL}/projects?token=${token}&organization=${organization}&workspace=${workspace}`
        );
        const data = await response.json();
        setProjects(data.projects || []);
      } catch (error) {
        console.error('Error fetching projects:', error);
      }
    };

    fetchProjects();
  }, [workspace, organization, token, mounted]);

  if (!mounted) {
    return null;
  }

  return (
    <Card className="mb-6 shadow-lg border-2 border-slate-200 dark:border-slate-700">
      <CardContent className="pt-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="token">API Token</Label>
          <Input
            id="token"
            type="password"
            placeholder="Enter your API token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="transition-all"
          />
        </div>

        {/* Show verification status only after debounce */}
        {token && !isVerifying && verificationMsg && (
          <Alert 
            variant={verified ? 'default' : 'destructive'}
            className="transition-all animate-in fade-in slide-in-from-top-2 duration-300"
          >
            {verified ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            <AlertDescription>{verificationMsg}</AlertDescription>
          </Alert>
        )}

        {/* Show loading state while verifying */}
        {token && isVerifying && (
          <Alert className="border-slate-300 dark:border-slate-600">
            <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
            <AlertDescription className="text-slate-600 dark:text-slate-400">
              Verifying token...
            </AlertDescription>
          </Alert>
        )}

        {verified && (
          <>
            <div className="space-y-2">
              <Label htmlFor="organization">Organization</Label>
              <Select value={organization} onValueChange={setOrganization}>
                <SelectTrigger>
                  <SelectValue placeholder="--Select--" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="--Select--">--Select--</SelectItem>
                  {organizations.map((org) => (
                    <SelectItem key={org} value={org}>
                      {org}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {organization && organization !== '--Select--' && (
              <div className="space-y-2">
                <Label htmlFor="workspace">Workspace</Label>
                <Select value={workspace} onValueChange={setWorkspace}>
                  <SelectTrigger>
                    <SelectValue placeholder="--Select--" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="--Select--">--Select--</SelectItem>
                    {workspaces.map((ws) => (
                      <SelectItem key={ws} value={ws}>
                        {ws}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {workspace && workspace !== '--Select--' && (
              <div className="space-y-2">
                <Label htmlFor="project">Project</Label>
                <Select value={project} onValueChange={setProject}>
                  <SelectTrigger>
                    <SelectValue placeholder="--Select--" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="--Select--">--Select--</SelectItem>
                    {projects.map((proj) => (
                      <SelectItem key={proj} value={proj}>
                        {proj}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
