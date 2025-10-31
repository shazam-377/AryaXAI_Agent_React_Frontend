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
import { CheckCircle2, XCircle, Loader2, Info } from 'lucide-react';

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
  const [showOrgWarning, setShowOrgWarning] = useState(false);
  const [showWorkspaceWarning, setShowWorkspaceWarning] = useState(false);
  const [showProjectWarning, setShowProjectWarning] = useState(false);
  const [orgsFetched, setOrgsFetched] = useState(false);
  const [workspacesFetched, setWorkspacesFetched] = useState(false);
  const [projectsFetched, setProjectsFetched] = useState(false);
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

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    setIsVerifying(true);
    setVerificationMsg('');

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
    }, 800);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [token, mounted, setVerified]);

  // Fetch organizations
  useEffect(() => {
    if (!verified || !mounted) {
      setOrgsFetched(false);
      return;
    }

    const fetchOrganizations = async () => {
      try {
        console.log('Fetching organizations for token:', token);
        const response = await fetch(
          `${API_HTTP_URL}/organizations?token=${token}`
        );
        console.log('Response status:', response.status);
        const data = await response.json();
        console.log('Organizations received:', data.organizations);
        
        const orgList = data.organizations || [];
        setOrganizations(orgList);
        setOrgsFetched(true);
        
        if (orgList.length === 0) {
          // No organizations - set empty and mark as complete
          setOrganization('');
          setWorkspace('');
          setProject('');
          setShowOrgWarning(true);
          setWorkspacesFetched(true);
          setProjectsFetched(true);
        } else {
          setShowOrgWarning(false);
        }
      } catch (error) {
        console.error('Error fetching organizations:', error);
        setOrganizations([]);
        setOrganization('');
        setWorkspace('');
        setProject('');
        setShowOrgWarning(true);
        setOrgsFetched(true);
        setWorkspacesFetched(true);
        setProjectsFetched(true);
      }
    };

    fetchOrganizations();
  }, [verified, token, mounted, setOrganization, setWorkspace, setProject]);

  // Fetch workspaces
  useEffect(() => {
    if (!orgsFetched || !mounted) return;
    if (!organization || organization === '--Select--') {
      setWorkspacesFetched(false);
      setWorkspaces([]);
      setShowWorkspaceWarning(false);
      return;
    }

    const fetchWorkspaces = async () => {
      try {
        const response = await fetch(
          `${API_HTTP_URL}/workspaces?token=${token}&organization=${organization}`
        );
        const data = await response.json();
        const workspaceList = data.workspaces || [];
        setWorkspaces(workspaceList);
        setWorkspacesFetched(true);
        
        if (workspaceList.length === 0) {
          setWorkspace('');
          setProject('');
          setShowWorkspaceWarning(true);
          setProjectsFetched(true);
        } else {
          setShowWorkspaceWarning(false);
        }
      } catch (error) {
        console.error('Error fetching workspaces:', error);
        setWorkspaces([]);
        setWorkspace('');
        setProject('');
        setShowWorkspaceWarning(true);
        setWorkspacesFetched(true);
        setProjectsFetched(true);
      }
    };

    fetchWorkspaces();
  }, [organization, token, mounted, orgsFetched, setWorkspace, setProject]);

  // Fetch projects
  useEffect(() => {
    if (!workspacesFetched || !mounted) return;
    if (!workspace || workspace === '--Select--') {
      setProjectsFetched(false);
      setProjects([]);
      setShowProjectWarning(false);
      return;
    }

    const fetchProjects = async () => {
      try {
        const response = await fetch(
          `${API_HTTP_URL}/projects?token=${token}&organization=${organization}&workspace=${workspace}`
        );
        const data = await response.json();
        const projectList = data.projects || [];
        setProjects(projectList);
        setProjectsFetched(true);
        
        if (projectList.length === 0) {
          setProject('');
          setShowProjectWarning(true);
        } else {
          setShowProjectWarning(false);
        }
      } catch (error) {
        console.error('Error fetching projects:', error);
        setProjects([]);
        setProject('');
        setShowProjectWarning(true);
        setProjectsFetched(true);
      }
    };

    fetchProjects();
  }, [workspace, organization, token, mounted, workspacesFetched, setProject]);

  if (!mounted) {
    return null;
  }

  // Determine if setup is complete
  const setupComplete = verified && (
    (orgsFetched && organizations.length === 0) ||
    (workspacesFetched && workspaces.length === 0) ||
    (projectsFetched && projects.length === 0) ||
    (organization && organization !== '--Select--' && 
     workspace && workspace !== '--Select--' && 
     project && project !== '--Select--')
  );

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
              {organizations.length > 0 ? (
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
              ) : orgsFetched ? (
                <Input
                  value="No organizations available"
                  disabled
                  className="bg-slate-100 dark:bg-slate-800"
                />
              ) : (
                <Input
                  value="Loading..."
                  disabled
                  className="bg-slate-100 dark:bg-slate-800"
                />
              )}
            </div>

            {showOrgWarning && (
              <Alert className="border-amber-300 bg-amber-50 dark:bg-amber-900/20">
                <Info className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800 dark:text-amber-300">
                  No organizations found. You can proceed to chat with empty organization.
                </AlertDescription>
              </Alert>
            )}

            {orgsFetched && !showOrgWarning && organization && organization !== '--Select--' && (
              <div className="space-y-2">
                <Label htmlFor="workspace">Workspace</Label>
                {workspaces.length > 0 ? (
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
                ) : workspacesFetched ? (
                  <Input
                    value="No workspaces available"
                    disabled
                    className="bg-slate-100 dark:bg-slate-800"
                  />
                ) : (
                  <Input
                    value="Loading..."
                    disabled
                    className="bg-slate-100 dark:bg-slate-800"
                  />
                )}
              </div>
            )}

            {showWorkspaceWarning && (
              <Alert className="border-amber-300 bg-amber-50 dark:bg-amber-900/20">
                <Info className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800 dark:text-amber-300">
                  No workspaces found in this organization. You can proceed to chat with empty workspace.
                </AlertDescription>
              </Alert>
            )}

            {workspacesFetched && !showWorkspaceWarning && workspace && workspace !== '--Select--' && (
              <div className="space-y-2">
                <Label htmlFor="project">Project</Label>
                {projects.length > 0 ? (
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
                ) : projectsFetched ? (
                  <Input
                    value="No projects available"
                    disabled
                    className="bg-slate-100 dark:bg-slate-800"
                  />
                ) : (
                  <Input
                    value="Loading..."
                    disabled
                    className="bg-slate-100 dark:bg-slate-800"
                  />
                )}
              </div>
            )}

            {showProjectWarning && (
              <Alert className="border-amber-300 bg-amber-50 dark:bg-amber-900/20">
                <Info className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800 dark:text-amber-300">
                  No projects found in this workspace. You can proceed to chat with empty project.
                </AlertDescription>
              </Alert>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
