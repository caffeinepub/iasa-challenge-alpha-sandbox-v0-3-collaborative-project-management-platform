import { Project, Pledge } from '../backend';
import { useGetPledges, useSignOffPledge, useGetUserProfile } from '../hooks/useQueries';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, AlertCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface PledgeSectionProps {
  project: Project;
}

export default function PledgeSection({ project }: PledgeSectionProps) {
  const { data: pledges = [] } = useGetPledges(project.id);
  const { identity } = useInternetIdentity();
  const signOffPledge = useSignOffPledge();

  const isCreator = identity?.getPrincipal().toString() === project.creator.toString();

  const pendingPledges = pledges.filter((p) => p.status === 'pending');
  const approvedPledges = pledges.filter((p) => p.status === 'approved');
  const reassignedPledges = pledges.filter((p) => p.status === 'reassigned');

  const totalApprovedHH = approvedPledges.reduce((sum, p) => sum + p.amount, 0);
  const totalPendingHH = pendingPledges.reduce((sum, p) => sum + p.amount, 0);
  const totalActivePledgedHH = totalApprovedHH + totalPendingHH;
  const remainingBudget = Math.max(0, project.estimatedTotalHH - totalActivePledgedHH);
  const activationThreshold = project.estimatedTotalHH * 0.8;
  const activationProgress = Math.min((totalApprovedHH / project.estimatedTotalHH) * 100, 100);
  const isBudgetFull = remainingBudget <= 0;

  const handleSignOff = async (pledgeId: bigint) => {
    try {
      await signOffPledge.mutateAsync(pledgeId);
      toast.success('Pledge approved!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve pledge');
    }
  };

  const getTargetLabel = (pledge: Pledge) => {
    if (pledge.target.__kind__ === 'otherTasks') return 'Other Tasks Pool';
    return `Task #${(pledge.target as any).task?.toString() ?? '?'}`;
  };

  if (project.status === 'active') {
    return (
      <div className="space-y-6">
        <Card className="border-green-500/30 bg-green-500/5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <CardTitle className="text-green-700 dark:text-green-400">Project Activated</CardTitle>
            </div>
            <CardDescription>
              This project has been activated. No further pledging is allowed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              Total approved HH: <strong>{totalApprovedHH.toFixed(1)} HH</strong> of{' '}
              <strong>{project.estimatedTotalHH.toFixed(1)} HH</strong> ({activationProgress.toFixed(0)}%)
            </div>
          </CardContent>
        </Card>

        <PledgeList pledges={approvedPledges} title="Approved Pledges" currentUserPrincipal={identity?.getPrincipal().toString()} getTargetLabel={getTargetLabel} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Activation Progress */}
      {project.status === 'pledging' && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Activation Progress</CardTitle>
            <CardDescription>
              Project activates when &gt;80% of HH is assigned and all pledges are signed off.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Approved HH</span>
                <span className="font-medium">
                  {totalApprovedHH.toFixed(1)} / {project.estimatedTotalHH.toFixed(1)} HH
                  ({activationProgress.toFixed(0)}%)
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    activationProgress >= 80 ? 'bg-green-500' : 'bg-primary'
                  }`}
                  style={{ width: `${activationProgress}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0%</span>
                <span className={activationProgress >= 80 ? 'text-green-500 font-medium' : ''}>
                  80% threshold
                </span>
                <span>100%</span>
              </div>
            </div>

            {/* Remaining Budget Display */}
            <div
              className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${
                isBudgetFull
                  ? 'border-red-500/30 bg-red-500/5'
                  : remainingBudget < project.estimatedTotalHH * 0.1
                  ? 'border-yellow-500/30 bg-yellow-500/5'
                  : 'border-primary/20 bg-primary/5'
              }`}
            >
              <div className="flex items-center gap-2">
                {isBudgetFull ? (
                  <AlertTriangle className={`h-4 w-4 text-red-500`} />
                ) : (
                  <Clock className={`h-4 w-4 ${remainingBudget < project.estimatedTotalHH * 0.1 ? 'text-yellow-500' : 'text-primary'}`} />
                )}
                <span
                  className={
                    isBudgetFull
                      ? 'font-semibold text-red-700 dark:text-red-400'
                      : remainingBudget < project.estimatedTotalHH * 0.1
                      ? 'font-semibold text-yellow-700 dark:text-yellow-400'
                      : 'font-semibold text-primary'
                  }
                >
                  {isBudgetFull
                    ? 'Budget fully pledged'
                    : `${remainingBudget.toFixed(1)} HH remaining to pledge`}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                {totalActivePledgedHH.toFixed(1)} / {project.estimatedTotalHH.toFixed(1)} HH pledged
              </span>
            </div>

            <div className="flex gap-4 text-sm">
              {totalPendingHH > 0 && (
                <div className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
                  <AlertCircle className="h-4 w-4" />
                  <span>{pendingPledges.length} pending ({totalPendingHH.toFixed(1)} HH)</span>
                </div>
              )}
              {pendingPledges.length === 0 && totalApprovedHH > 0 && (
                <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                  <CheckCircle className="h-4 w-4" />
                  <span>All pledges signed off</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* PM: Pending Pledges Sign-off */}
      {isCreator && pendingPledges.length > 0 && (
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              <CardTitle className="text-base text-yellow-700 dark:text-yellow-400">
                Pending Sign-off ({pendingPledges.length})
              </CardTitle>
            </div>
            <CardDescription>
              Review and approve these pledges. Only approved pledges count toward project activation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingPledges.map((pledge, idx) => (
              <PendingPledgeRow
                key={idx}
                pledge={pledge}
                pledgeIndex={idx}
                allPledges={pledges}
                currentUserPrincipal={identity?.getPrincipal().toString()}
                getTargetLabel={getTargetLabel}
                onSignOff={handleSignOff}
                isSigningOff={signOffPledge.isPending}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Approved Pledges */}
      {approvedPledges.length > 0 && (
        <PledgeList
          pledges={approvedPledges}
          title={`Approved Pledges (${approvedPledges.length})`}
          currentUserPrincipal={identity?.getPrincipal().toString()}
          getTargetLabel={getTargetLabel}
        />
      )}

      {/* Reassigned Pledges */}
      {reassignedPledges.length > 0 && (
        <PledgeList
          pledges={reassignedPledges}
          title={`Reassigned Pledges (${reassignedPledges.length})`}
          currentUserPrincipal={identity?.getPrincipal().toString()}
          getTargetLabel={getTargetLabel}
          variant="muted"
        />
      )}

      {pledges.length === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">No pledges yet</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Pledge HH to tasks or the Other Tasks pool from the Tasks tab
          </p>
        </div>
      )}
    </div>
  );
}

interface PendingPledgeRowProps {
  pledge: Pledge;
  pledgeIndex: number;
  allPledges: Pledge[];
  currentUserPrincipal?: string;
  getTargetLabel: (pledge: Pledge) => string;
  onSignOff: (pledgeId: bigint) => void;
  isSigningOff: boolean;
}

function PendingPledgeRow({
  pledge,
  pledgeIndex,
  allPledges,
  currentUserPrincipal,
  getTargetLabel,
  onSignOff,
  isSigningOff,
}: PendingPledgeRowProps) {
  const { data: userProfile } = useGetUserProfile(pledge.user);

  // The backend doesn't return pledge IDs in the Pledge type.
  // We need to find the pledge ID by matching. Since we can't get the actual ID,
  // we use the index as a proxy. See backend-gaps for the proper fix.
  const pledgeId = BigInt(pledgeIndex);

  return (
    <div className="flex items-center justify-between rounded-lg border border-yellow-500/20 bg-background p-3">
      <div className="flex items-center gap-3">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="text-xs">
            {pledge.user.toString().slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <div className="text-sm font-medium">
            {pledge.user.toString() === currentUserPrincipal
              ? 'You'
              : userProfile?.friendlyUsername || `${pledge.user.toString().slice(0, 8)}...`}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {userProfile && (
              <Badge variant="secondary" className="text-xs py-0">
                {userProfile.squadRole}
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">{getTargetLabel(pledge)}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold">{pledge.amount.toFixed(1)} HH</span>
        <Button
          size="sm"
          onClick={() => onSignOff(pledgeId)}
          disabled={isSigningOff}
          className="h-7 text-xs"
        >
          {isSigningOff ? '...' : 'Approve'}
        </Button>
      </div>
    </div>
  );
}

interface PledgeListProps {
  pledges: Pledge[];
  title: string;
  currentUserPrincipal?: string;
  getTargetLabel: (pledge: Pledge) => string;
  variant?: 'default' | 'muted';
}

function PledgeList({ pledges, title, currentUserPrincipal, getTargetLabel, variant = 'default' }: PledgeListProps) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">{title}</h3>
      <div className="space-y-2">
        {pledges.map((pledge, index) => (
          <PledgeRow
            key={index}
            pledge={pledge}
            currentUserPrincipal={currentUserPrincipal}
            getTargetLabel={getTargetLabel}
            variant={variant}
          />
        ))}
      </div>
    </div>
  );
}

function PledgeRow({
  pledge,
  currentUserPrincipal,
  getTargetLabel,
  variant,
}: {
  pledge: Pledge;
  currentUserPrincipal?: string;
  getTargetLabel: (pledge: Pledge) => string;
  variant?: 'default' | 'muted';
}) {
  const { data: userProfile } = useGetUserProfile(pledge.user);

  return (
    <div className={`flex items-center justify-between rounded-lg border p-3 ${variant === 'muted' ? 'opacity-60' : ''}`}>
      <div className="flex items-center gap-3">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="text-xs">
            {pledge.user.toString().slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <div className="text-sm font-medium">
            {pledge.user.toString() === currentUserPrincipal
              ? 'You'
              : userProfile?.friendlyUsername || `${pledge.user.toString().slice(0, 8)}...`}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {userProfile && (
              <Badge variant="secondary" className="text-xs py-0">
                {userProfile.squadRole}
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">{getTargetLabel(pledge)}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold">{pledge.amount.toFixed(1)} HH</span>
        <Badge
          variant="outline"
          className={
            pledge.status === 'approved'
              ? 'text-green-600 border-green-500/30 text-xs'
              : pledge.status === 'reassigned'
              ? 'text-gray-500 border-gray-400/30 text-xs'
              : 'text-yellow-600 border-yellow-500/30 text-xs'
          }
        >
          {pledge.status}
        </Badge>
      </div>
    </div>
  );
}
