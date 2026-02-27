import React, { useState } from 'react';
import { Project, Pledge, PledgeStatus } from '../backend';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useConfirmPledge, useReassignFromOtherTasks, useGetTasks } from '../hooks/useQueries';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, Clock, Info, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Task } from '../backend';

interface PledgeSectionProps {
  project: Project;
  pledges: Pledge[];
}

// ── Status helpers ──────────────────────────────────────────────────────────

function getPledgeStatusLabel(status: PledgeStatus): string {
  switch (status) {
    case PledgeStatus.pending: return 'Pending';
    case PledgeStatus.confirmed: return 'Confirmed';
    case PledgeStatus.approved: return 'Approved';
    case PledgeStatus.expired: return 'Expired';
    case PledgeStatus.reassigned: return 'Reassigned';
    default: return String(status);
  }
}

function getPledgeStatusColor(status: PledgeStatus): string {
  switch (status) {
    case PledgeStatus.pending:
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800';
    case PledgeStatus.confirmed:
    case PledgeStatus.approved:
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800';
    case PledgeStatus.expired:
      return 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500 border-gray-200 dark:border-gray-700';
    case PledgeStatus.reassigned:
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800';
    default:
      return 'bg-gray-100 text-gray-600 border-gray-200';
  }
}

function getPledgeStatusNote(status: PledgeStatus): string {
  switch (status) {
    case PledgeStatus.pending:
      return 'Awaiting PM confirmation — not yet counted in budget';
    case PledgeStatus.confirmed:
    case PledgeStatus.approved:
      return 'Confirmed — included in HH budget and payout calculation';
    case PledgeStatus.expired:
      return 'Expired — not counted in budget';
    case PledgeStatus.reassigned:
      return 'Reassigned to a specific task';
    default:
      return '';
  }
}

function getTargetLabel(pledge: Pledge, tasks: Task[]): string {
  if (pledge.target.__kind__ === 'otherTasks') return 'General Pool';
  // target.__kind__ === 'task'
  const taskId = (pledge.target as { __kind__: 'task'; task: bigint }).task;
  const task = tasks.find(t => t.id === taskId);
  return task ? task.title : `Task #${String(taskId)}`;
}

// ── Main component ──────────────────────────────────────────────────────────

export default function PledgeSection({ project, pledges }: PledgeSectionProps) {
  const { identity } = useInternetIdentity();
  const callerPrincipal = identity?.getPrincipal().toString();
  const isPM = project.creator.toString() === callerPrincipal;

  const { data: tasks = [] } = useGetTasks(project.id);
  const confirmPledge = useConfirmPledge();
  const reassignFromOtherTasks = useReassignFromOtherTasks();

  const [reassignTargets, setReassignTargets] = useState<Record<number, string>>({});

  const activePledges = pledges.filter(
    p =>
      p.status === PledgeStatus.pending ||
      p.status === PledgeStatus.confirmed ||
      p.status === PledgeStatus.approved
  );
  const expiredPledges = pledges.filter(p => p.status === PledgeStatus.expired);
  const reassignedPledges = pledges.filter(p => p.status === PledgeStatus.reassigned);

  const confirmedTotal = pledges
    .filter(p => p.status === PledgeStatus.confirmed || p.status === PledgeStatus.approved)
    .reduce((sum, p) => sum + p.amount, 0);
  const pendingTotal = pledges
    .filter(p => p.status === PledgeStatus.pending)
    .reduce((sum, p) => sum + p.amount, 0);

  const handleConfirmPledge = async (pledgeIdx: number) => {
    try {
      await confirmPledge.mutateAsync({ pledgeId: BigInt(pledgeIdx), projectId: project.id });
      toast.success('Pledge confirmed — now counted in budget');
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to confirm pledge');
    }
  };

  const handleReassign = async (pledgeIdx: number) => {
    const taskIdStr = reassignTargets[pledgeIdx];
    if (!taskIdStr) {
      toast.error('Select a target task first');
      return;
    }
    try {
      await reassignFromOtherTasks.mutateAsync({
        pledgeId: BigInt(pledgeIdx),
        newTaskId: BigInt(taskIdStr),
        projectId: project.id,
      });
      toast.success('Pledge reassigned to task');
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to reassign pledge');
    }
  };

  const regularTasks = tasks.filter(t => t.title !== 'Other Tasks');

  return (
    <TooltipProvider>
      <div className="space-y-4">

        {/* Lifecycle explanation */}
        <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-2">
          <p className="text-sm font-semibold flex items-center gap-1.5">
            <Info className="h-4 w-4 text-primary" />
            Pledge Lifecycle
          </p>
          <ol className="text-xs text-muted-foreground space-y-1 list-none">
            <li className="flex items-start gap-2">
              <span className="px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 font-semibold shrink-0">1</span>
              <span><strong>Participant submits pledge</strong> → status: <em>Pending</em> — not yet counted in budget</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 font-semibold shrink-0">2</span>
              <span><strong>PM confirms the task</strong> (Tasks tab, Step 1) — required before pledges can be confirmed</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="px-1.5 py-0.5 rounded bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 font-semibold shrink-0">3</span>
              <span><strong>PM confirms the pledge</strong> (Step 2) → status: <em>Confirmed</em> — counted in budget &amp; payout</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 font-semibold shrink-0">!</span>
              <span>Pledges not confirmed within <strong>14 days</strong> expire automatically</span>
            </li>
          </ol>
        </div>

        {/* Summary row */}
        <div className="flex flex-wrap gap-4 text-sm">
          <span>
            Confirmed: <span className="font-bold text-green-600 dark:text-green-400">{confirmedTotal.toFixed(1)} HH</span>
          </span>
          {pendingTotal > 0 && (
            <span>
              Pending: <span className="font-bold text-yellow-600 dark:text-yellow-400">{pendingTotal.toFixed(1)} HH</span>
              <span className="text-muted-foreground ml-1">(not yet in budget)</span>
            </span>
          )}
          <span className="text-muted-foreground">
            Estimated total: {project.estimatedTotalHH} HH
          </span>
        </div>

        {/* Active pledges */}
        {activePledges.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm">
            No pledges yet for this project.
          </div>
        ) : (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Active Pledges</h4>
            {activePledges.map(pledge => {
              const globalIdx = pledges.indexOf(pledge);
              const isPending = pledge.status === PledgeStatus.pending;
              const isOtherTasksPledge = pledge.target.__kind__ === 'otherTasks';

              return (
                <div
                  key={globalIdx}
                  className={`rounded-lg border p-3 space-y-2 transition-colors ${
                    isPending
                      ? 'border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-950/10'
                      : 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/10'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold">{pledge.amount.toFixed(1)} HH</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${getPledgeStatusColor(pledge.status)}`}>
                          {getPledgeStatusLabel(pledge.status)}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Target: <span className="font-medium text-foreground">{getTargetLabel(pledge, tasks)}</span>
                        {' · '}
                        By: <span className="font-mono">{pledge.user.toString().slice(0, 10)}…</span>
                      </div>
                    </div>
                  </div>

                  {/* Status note */}
                  <div className={`text-xs px-2.5 py-1.5 rounded flex items-center gap-1.5 ${
                    isPending
                      ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'
                      : 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                  }`}>
                    {isPending
                      ? <Clock className="h-3 w-3 shrink-0" />
                      : <CheckCircle className="h-3 w-3 shrink-0" />
                    }
                    {getPledgeStatusNote(pledge.status)}
                  </div>

                  {/* PM actions for pending pledges */}
                  {isPM && isPending && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleConfirmPledge(globalIdx)}
                        disabled={confirmPledge.isPending}
                        className="gap-1.5 text-xs h-7"
                      >
                        {confirmPledge.isPending
                          ? <Loader2 className="h-3 w-3 animate-spin" />
                          : <CheckCircle className="h-3 w-3" />
                        }
                        Confirm Pledge (Step 2)
                      </Button>

                      {isOtherTasksPledge && regularTasks.length > 0 && (
                        <div className="flex gap-1.5 items-center">
                          <Select
                            value={reassignTargets[globalIdx] ?? ''}
                            onValueChange={val =>
                              setReassignTargets(prev => ({ ...prev, [globalIdx]: val }))
                            }
                          >
                            <SelectTrigger className="h-7 text-xs w-36">
                              <SelectValue placeholder="Reassign to…" />
                            </SelectTrigger>
                            <SelectContent>
                              {regularTasks.map(t => (
                                <SelectItem key={String(t.id)} value={String(t.id)}>
                                  {t.title}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReassign(globalIdx)}
                            disabled={reassignFromOtherTasks.isPending || !reassignTargets[globalIdx]}
                            className="h-7 text-xs"
                          >
                            {reassignFromOtherTasks.isPending
                              ? <Loader2 className="h-3 w-3 animate-spin" />
                              : 'Reassign'
                            }
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Expired pledges */}
        {expiredPledges.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Expired Pledges</h4>
            {expiredPledges.map(pledge => {
              const globalIdx = pledges.indexOf(pledge);
              return (
                <div key={globalIdx} className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 opacity-50 bg-gray-50 dark:bg-gray-900/20">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm text-muted-foreground">
                      {pledge.amount.toFixed(1)} HH — {getTargetLabel(pledge, tasks)}
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${getPledgeStatusColor(pledge.status)}`}>
                      Expired
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Not counted in budget or payout</p>
                </div>
              );
            })}
          </div>
        )}

        {/* Reassigned pledges */}
        {reassignedPledges.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Reassigned Pledges</h4>
            {reassignedPledges.map(pledge => {
              const globalIdx = pledges.indexOf(pledge);
              return (
                <div key={globalIdx} className="rounded-lg border border-purple-200 dark:border-purple-800 p-3 opacity-70 bg-purple-50/30 dark:bg-purple-950/10">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm text-muted-foreground">
                      {pledge.amount.toFixed(1)} HH — originally {getTargetLabel(pledge, tasks)}
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${getPledgeStatusColor(pledge.status)}`}>
                      Reassigned
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
