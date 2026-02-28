import { useState } from 'react';
import {
  useIsCallerAdmin,
  useUpdateParticipationLevel,
  useGetUserProfile,
  useListApprovals,
  useSetApproval,
} from '../hooks/useQueries';
import { useGetProjects } from '../hooks/useQueries';
import { ParticipationLevel, ApprovalStatus } from '../backend';
import type { Principal } from '@icp-sdk/core/principal';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Shield, ChevronDown, Save, Users, UserCheck, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const PARTICIPATION_LEVEL_OPTIONS = [
  { value: ParticipationLevel.Apprentice, label: 'Apprentice', subtitle: 'Student / young professional', votingPower: 0 },
  { value: ParticipationLevel.Journeyman, label: 'Journeyman', subtitle: 'Project leader', votingPower: 1 },
  { value: ParticipationLevel.Master, label: 'Master', subtitle: 'Senior professional', votingPower: 3 },
  { value: ParticipationLevel.GuestArtist, label: 'Guest Artist', subtitle: 'External professional / Mentor', votingPower: 4 },
];

const LEVEL_BADGE_COLORS: Record<ParticipationLevel, string> = {
  [ParticipationLevel.Apprentice]: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  [ParticipationLevel.Journeyman]: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  [ParticipationLevel.Master]: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  [ParticipationLevel.GuestArtist]: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
};

interface UserRowProps {
  principal: Principal;
  onLevelChange: (user: Principal, level: ParticipationLevel) => Promise<void>;
  isUpdating: boolean;
}

function UserRow({ principal, onLevelChange, isUpdating }: UserRowProps) {
  const { data: profile, isLoading } = useGetUserProfile(principal);
  const [selectedLevel, setSelectedLevel] = useState<ParticipationLevel | null>(null);

  const currentLevel = profile?.participationLevel ?? null;
  const effectiveLevel = selectedLevel ?? currentLevel;

  const handleSave = async () => {
    if (!selectedLevel || selectedLevel === currentLevel) return;
    await onLevelChange(principal, selectedLevel);
    setSelectedLevel(null);
  };

  const isDirty = selectedLevel !== null && selectedLevel !== currentLevel;

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 py-3 border-b last:border-0">
        <Skeleton className="h-8 w-8 rounded-full" />
        <div className="flex-1 space-y-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
        <Skeleton className="h-8 w-32" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center gap-3 py-3 border-b last:border-0 text-sm text-muted-foreground">
        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-mono">?</div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-mono truncate text-muted-foreground">{principal.toString().slice(0, 20)}…</p>
          <p className="text-xs text-muted-foreground">Profile not found</p>
        </div>
      </div>
    );
  }

  const levelOption = PARTICIPATION_LEVEL_OPTIONS.find((o) => o.value === effectiveLevel);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 py-3 border-b last:border-0">
      {/* User info */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="h-9 w-9 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
          {profile.friendlyUsername.slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">{profile.friendlyUsername}</p>
          <p className="text-xs text-muted-foreground truncate">{principal.toString().slice(0, 24)}…</p>
        </div>
      </div>

      {/* Current level badge */}
      {currentLevel && (
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold shrink-0 ${
            LEVEL_BADGE_COLORS[currentLevel] ?? ''
          }`}
        >
          {PARTICIPATION_LEVEL_OPTIONS.find((o) => o.value === currentLevel)?.label ?? currentLevel}
        </span>
      )}

      {/* Level selector */}
      <div className="flex items-center gap-2 shrink-0">
        <Select
          value={effectiveLevel ?? ''}
          onValueChange={(v) => setSelectedLevel(v as ParticipationLevel)}
          disabled={isUpdating}
        >
          <SelectTrigger className="w-36 h-8 text-xs">
            <SelectValue placeholder="Select level" />
          </SelectTrigger>
          <SelectContent>
            {PARTICIPATION_LEVEL_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                <span className="font-medium">{opt.label}</span>
                <span className="ml-1 text-muted-foreground">(VP: {opt.votingPower})</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          size="sm"
          variant={isDirty ? 'default' : 'outline'}
          className="h-8 px-2"
          onClick={handleSave}
          disabled={!isDirty || isUpdating}
        >
          <Save className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

interface PendingMemberRowProps {
  principal: Principal;
  onApprove: (user: Principal) => Promise<void>;
  onReject: (user: Principal) => Promise<void>;
  isProcessing: boolean;
}

function PendingMemberRow({ principal, onApprove, onReject, isProcessing }: PendingMemberRowProps) {
  const principalStr = principal.toString();

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 py-3 border-b last:border-0">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="h-9 w-9 shrink-0 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
          <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-mono truncate text-foreground">{principalStr.slice(0, 32)}…</p>
          <p className="text-xs text-muted-foreground">Awaiting approval</p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button
          size="sm"
          variant="default"
          className="h-8 gap-1.5 bg-green-600 hover:bg-green-700 text-white"
          onClick={() => onApprove(principal)}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <CheckCircle2 className="h-3.5 w-3.5" />
          )}
          Accept
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-8 gap-1.5 text-destructive border-destructive/40 hover:bg-destructive/10"
          onClick={() => onReject(principal)}
          disabled={isProcessing}
        >
          <XCircle className="h-3.5 w-3.5" />
          Reject
        </Button>
      </div>
    </div>
  );
}

export default function AdminPanel() {
  const { data: isAdmin, isLoading: adminLoading } = useIsCallerAdmin();
  const { data: projects = [] } = useGetProjects();
  const { data: approvals = [], isLoading: approvalsLoading, refetch: refetchApprovals } = useListApprovals();
  const updateLevel = useUpdateParticipationLevel();
  const setApproval = useSetApproval();
  const [isOpen, setIsOpen] = useState(false);
  const [processingPrincipal, setProcessingPrincipal] = useState<string | null>(null);

  // Collect all unique participants across all projects (including creators)
  const allPrincipals = Array.from(
    new Map(
      [
        ...projects.map((p) => p.creator),
        ...projects.flatMap((p) => p.participants),
      ].map((p) => [p.toString(), p])
    ).values()
  );

  // Filter pending approvals
  const pendingApprovals = approvals.filter((a) => a.status === ApprovalStatus.pending);

  const handleLevelChange = async (user: Principal, level: ParticipationLevel) => {
    try {
      await updateLevel.mutateAsync({ user, level });
      toast.success('Participation level updated successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update participation level');
    }
  };

  const handleApprove = async (user: Principal) => {
    setProcessingPrincipal(user.toString());
    try {
      await setApproval.mutateAsync({ user, status: ApprovalStatus.approved });
      toast.success('User approved successfully. They can now access the application.');
      refetchApprovals();
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve user');
    } finally {
      setProcessingPrincipal(null);
    }
  };

  const handleReject = async (user: Principal) => {
    setProcessingPrincipal(user.toString());
    try {
      await setApproval.mutateAsync({ user, status: ApprovalStatus.rejected });
      toast.success('User rejected.');
      refetchApprovals();
    } catch (error: any) {
      toast.error(error.message || 'Failed to reject user');
    } finally {
      setProcessingPrincipal(null);
    }
  };

  // Don't render anything while checking admin status
  if (adminLoading) return null;

  // Only render for admins
  if (!isAdmin) return null;

  return (
    <div className="container pb-8">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card className="border-amber-200 dark:border-amber-800/50">
          <CardHeader className="pb-3">
            <CollapsibleTrigger asChild>
              <button className="flex w-full items-center justify-between text-left focus:outline-none">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  <div>
                    <CardTitle className="text-base text-amber-700 dark:text-amber-300">
                      Administrator Panel
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Manage members &amp; participation levels
                      {pendingApprovals.length > 0 && (
                        <span className="ml-2 inline-flex items-center rounded-full bg-red-100 dark:bg-red-900/30 px-2 py-0.5 text-xs font-semibold text-red-700 dark:text-red-300">
                          {pendingApprovals.length} pending
                        </span>
                      )}
                    </CardDescription>
                  </div>
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-amber-600 dark:text-amber-400 transition-transform duration-200 ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
            </CollapsibleTrigger>
          </CardHeader>

          <CollapsibleContent>
            <CardContent className="pt-0 space-y-6">

              {/* ── Pending Members Section ── */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <UserCheck className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <h3 className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                    Pending Members
                  </h3>
                  {pendingApprovals.length > 0 && (
                    <Badge variant="destructive" className="text-xs h-5 px-1.5">
                      {pendingApprovals.length}
                    </Badge>
                  )}
                </div>

                {approvalsLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : pendingApprovals.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground rounded-md bg-muted/30 border border-dashed">
                    <CheckCircle2 className="h-6 w-6 mb-2 opacity-40" />
                    <p className="text-sm">No pending approval requests.</p>
                  </div>
                ) : (
                  <div className="rounded-md border bg-card">
                    {pendingApprovals.map((approval) => (
                      <PendingMemberRow
                        key={approval.principal.toString()}
                        principal={approval.principal}
                        onApprove={handleApprove}
                        onReject={handleReject}
                        isProcessing={processingPrincipal === approval.principal.toString()}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* ── Participation Level Management Section ── */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Users className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <h3 className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                    Participation Levels
                  </h3>
                  <span className="text-xs text-muted-foreground">({allPrincipals.length} participant(s))</span>
                </div>

                {/* Legend */}
                <div className="mb-4 rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 p-3">
                  <p className="text-xs font-medium text-amber-800 dark:text-amber-300 mb-2">
                    Voting Power by Level:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {PARTICIPATION_LEVEL_OPTIONS.map((opt) => (
                      <span
                        key={opt.value}
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          LEVEL_BADGE_COLORS[opt.value]
                        }`}
                      >
                        {opt.label}: VP {opt.votingPower}
                      </span>
                    ))}
                  </div>
                </div>

                {allPrincipals.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                    <Users className="h-8 w-8 mb-2 opacity-40" />
                    <p className="text-sm">No participants found yet.</p>
                    <p className="text-xs mt-1">Participants will appear here once they join a project.</p>
                  </div>
                ) : (
                  <div>
                    {allPrincipals.map((principal) => (
                      <UserRow
                        key={principal.toString()}
                        principal={principal}
                        onLevelChange={handleLevelChange}
                        isUpdating={updateLevel.isPending}
                      />
                    ))}
                  </div>
                )}
              </div>

            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}
