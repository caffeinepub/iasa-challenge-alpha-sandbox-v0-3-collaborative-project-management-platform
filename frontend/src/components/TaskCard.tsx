import React, { useState } from 'react';
import { Task, TaskStatus, Project, Pledge, PledgeStatus } from '../backend';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import {
  useAcceptTask,
  useCompleteTask,
  useApproveTask,
  usePledgeToTask,
  useConfirmTask,
  useGetCallerUserProfile,
} from '../hooks/useQueries';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CheckCircle, Clock, Play, Info, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface TaskCardProps {
  task: Task;
  project: Project;
  pledges: Pledge[];
  allTasks: Task[];
}

// ── Status helpers ──────────────────────────────────────────────────────────

function getTaskStatusLabel(status: TaskStatus): string {
  switch (status) {
    case TaskStatus.proposed: return 'Proposed';
    case TaskStatus.taskConfirmed: return 'Task Confirmed';
    case TaskStatus.active: return 'Active';
    case TaskStatus.inProgress: return 'In Progress';
    case TaskStatus.inAudit: return 'In Audit';
    case TaskStatus.completed: return 'Completed';
    case TaskStatus.rejected: return 'Rejected';
    case TaskStatus.pendingConfirmation: return 'Pending Confirmation';
    default: return String(status);
  }
}

function getTaskStatusColor(status: TaskStatus): string {
  switch (status) {
    case TaskStatus.proposed:
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800';
    case TaskStatus.taskConfirmed:
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800';
    case TaskStatus.active:
      return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800';
    case TaskStatus.inProgress:
      return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800';
    case TaskStatus.inAudit:
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-800';
    case TaskStatus.completed:
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800';
    case TaskStatus.rejected:
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800';
    default:
      return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700';
  }
}

function getNextStepLabel(
  status: TaskStatus,
  isAssignee: boolean,
  isPM: boolean,
  isMentor: boolean,
): string {
  switch (status) {
    case TaskStatus.proposed:
      return isPM
        ? '→ PM: Confirm this task (Step 1) to allow pledge confirmation'
        : '→ Awaiting PM to confirm task before pledges can be confirmed';
    case TaskStatus.taskConfirmed:
      return '→ Awaiting a participant to accept and start the task';
    case TaskStatus.active:
      return '→ Awaiting a participant to accept and start the task';
    case TaskStatus.inProgress:
      return isAssignee
        ? '→ You are working on this — mark complete when done'
        : '→ Assignee is working on this task';
    case TaskStatus.inAudit:
      return isMentor
        ? '→ Mentor: Review and approve this task (24h audit window)'
        : '→ In 24h audit window — a pledged Mentor will approve';
    case TaskStatus.completed:
      return '✓ Task completed and approved';
    case TaskStatus.rejected:
      return '✗ Task was rejected';
    default:
      return '';
  }
}

// ── Main component ──────────────────────────────────────────────────────────

export default function TaskCard({ task, project, pledges, allTasks }: TaskCardProps) {
  const { identity } = useInternetIdentity();
  const { data: userProfile } = useGetCallerUserProfile();

  const [pledgeAmount, setPledgeAmount] = useState('');
  const [showPledgeForm, setShowPledgeForm] = useState(false);

  const acceptTask = useAcceptTask();
  const completeTask = useCompleteTask();
  const approveTask = useApproveTask();
  const pledgeToTask = usePledgeToTask();
  const confirmTask = useConfirmTask();

  const callerPrincipal = identity?.getPrincipal().toString();
  const isPM = project.creator.toString() === callerPrincipal;
  const isAssignee = task.assignee?.toString() === callerPrincipal;
  const isMentor = userProfile?.squadRole === 'Mentor';

  const isOtherTasksCard = task.title === 'Other Tasks';

  // Pledge budget info — filter per-task using correct __kind__ discriminant
  const taskPledges = pledges.filter(p => {
    if (p.target.__kind__ === 'task') {
      return p.target.task === task.id;
    }
    return false;
  });

  const confirmedHH = taskPledges
    .filter(p => p.status === PledgeStatus.confirmed || p.status === PledgeStatus.approved)
    .reduce((sum, p) => sum + p.amount, 0);

  const pendingHH = taskPledges
    .filter(p => p.status === PledgeStatus.pending)
    .reduce((sum, p) => sum + p.amount, 0);

  const budgetUsedPct = task.hhBudget > 0 ? Math.min(100, (confirmedHH / task.hhBudget) * 100) : 0;

  // Dependency check
  const depsCompleted = task.dependencies.every(depId => {
    const dep = allTasks.find(t => t.id === depId);
    return dep?.status === TaskStatus.completed;
  });

  const nextStep = getNextStepLabel(task.status, isAssignee, isPM, isMentor);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleAccept = async () => {
    try {
      await acceptTask.mutateAsync({ taskId: task.id, projectId: project.id });
      toast.success('Task accepted — you are now the assignee');
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to accept task');
    }
  };

  const handleComplete = async () => {
    try {
      await completeTask.mutateAsync({ taskId: task.id, projectId: project.id });
      toast.success('Task submitted for audit');
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to complete task');
    }
  };

  const handleApprove = async () => {
    try {
      await approveTask.mutateAsync({ taskId: task.id, projectId: project.id });
      toast.success('Task approved');
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to approve task');
    }
  };

  const handleConfirmTask = async () => {
    try {
      await confirmTask.mutateAsync({ taskId: task.id, projectId: project.id });
      toast.success('Task confirmed — pledges for this task can now be confirmed');
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to confirm task');
    }
  };

  const handlePledge = async () => {
    const amount = parseFloat(pledgeAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Enter a valid pledge amount');
      return;
    }
    try {
      // Use correct __kind__ discriminant as required by PledgeTarget type
      const target: import('../backend').PledgeTarget =
        { __kind__: 'task', task: task.id };
      await pledgeToTask.mutateAsync({ projectId: project.id, target, amount });
      toast.success('Pledge submitted — awaiting PM confirmation');
      setPledgeAmount('');
      setShowPledgeForm(false);
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to submit pledge');
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <TooltipProvider>
      <div className={`rounded-lg border p-4 space-y-3 transition-colors ${
        task.status === TaskStatus.completed
          ? 'bg-green-50/50 dark:bg-green-950/10 border-green-200 dark:border-green-900'
          : task.status === TaskStatus.rejected
          ? 'bg-red-50/50 dark:bg-red-950/10 border-red-200 dark:border-red-900 opacity-60'
          : 'bg-card border-border'
      }`}>

        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-semibold text-sm">{task.title}</h4>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${getTaskStatusColor(task.status)}`}>
                {getTaskStatusLabel(task.status)}
              </span>
              {isOtherTasksCard && (
                <Badge variant="outline" className="text-xs">General Pool</Badge>
              )}
            </div>
            {task.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
            )}
          </div>
          <div className="text-right shrink-0">
            <div className="text-sm font-bold text-primary">{task.hhBudget} HH</div>
            <div className="text-xs text-muted-foreground">budget</div>
          </div>
        </div>

        {/* Next-step indicator */}
        {nextStep && task.status !== TaskStatus.rejected && (
          <div className={`text-xs px-3 py-1.5 rounded-md flex items-center gap-1.5 ${
            task.status === TaskStatus.completed
              ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
              : 'bg-muted text-muted-foreground'
          }`}>
            <Info className="h-3 w-3 shrink-0" />
            <span>{nextStep}</span>
          </div>
        )}

        {/* Assignee */}
        {task.assignee && (
          <div className="text-xs text-muted-foreground">
            Assignee: <span className="font-mono text-foreground">{task.assignee.toString().slice(0, 12)}…</span>
            {isAssignee && <span className="ml-1 text-primary font-medium">(you)</span>}
          </div>
        )}

        {/* Dependencies */}
        {task.dependencies.length > 0 && (
          <div className="text-xs text-muted-foreground">
            Depends on task IDs: {task.dependencies.map(d => String(d)).join(', ')}
            {!depsCompleted && (
              <span className="ml-1 text-orange-600 dark:text-orange-400 font-medium">— not yet completed</span>
            )}
          </div>
        )}

        {/* Budget bar */}
        {!isOtherTasksCard && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                Confirmed: <span className="font-medium text-green-600 dark:text-green-400">{confirmedHH.toFixed(1)} HH</span>
                {pendingHH > 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="ml-2 text-yellow-600 dark:text-yellow-400 cursor-help">
                        + {pendingHH.toFixed(1)} HH pending
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs max-w-xs">Pending pledges are not yet counted in the budget — PM must confirm them first.</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </span>
              <span>Budget: {task.hhBudget} HH</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${budgetUsedPct}%` }}
              />
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2 pt-1">

          {/* PM: Confirm Task (Step 1) — only when proposed */}
          {isPM && task.status === TaskStatus.proposed && !isOtherTasksCard && (
            <Button
              size="sm"
              variant="default"
              onClick={handleConfirmTask}
              disabled={confirmTask.isPending}
              className="gap-1.5 text-xs"
            >
              {confirmTask.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
              Confirm Task (Step 1)
            </Button>
          )}

          {/* Accept task — when taskConfirmed or active, not already assigned */}
          {(task.status === TaskStatus.taskConfirmed || task.status === TaskStatus.active) &&
            !task.assignee && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleAccept}
              disabled={acceptTask.isPending || !depsCompleted}
              className="gap-1.5 text-xs"
            >
              {acceptTask.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
              Accept Task
            </Button>
          )}

          {/* Complete task — only assignee, only inProgress */}
          {isAssignee && task.status === TaskStatus.inProgress && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleComplete}
              disabled={completeTask.isPending}
              className="gap-1.5 text-xs"
            >
              {completeTask.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Clock className="h-3 w-3" />}
              Mark Complete
            </Button>
          )}

          {/* Approve task — Mentor, only inAudit */}
          {isMentor && task.status === TaskStatus.inAudit && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleApprove}
              disabled={approveTask.isPending}
              className="gap-1.5 text-xs"
            >
              {approveTask.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
              Approve Task
            </Button>
          )}

          {/* Pledge — available when proposed or taskConfirmed */}
          {(task.status === TaskStatus.proposed || task.status === TaskStatus.taskConfirmed) && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowPledgeForm(v => !v)}
              className="gap-1.5 text-xs"
            >
              {showPledgeForm ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              Pledge HH
            </Button>
          )}
        </div>

        {/* Pledge form */}
        {showPledgeForm && (
          <div className="border border-dashed border-border rounded-md p-3 space-y-2 bg-muted/30">
            <p className="text-xs text-muted-foreground font-medium">
              Pledge HH to this task — your pledge will be{' '}
              <span className="text-yellow-600 dark:text-yellow-400">pending</span> until the PM confirms it.
            </p>
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Label className="text-xs mb-1 block">Amount (HH)</Label>
                <Input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={pledgeAmount}
                  onChange={e => setPledgeAmount(e.target.value)}
                  placeholder="e.g. 2.5"
                  className="h-8 text-sm"
                />
              </div>
              <Button
                size="sm"
                onClick={handlePledge}
                disabled={pledgeToTask.isPending}
                className="h-8 text-xs"
              >
                {pledgeToTask.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Submit Pledge'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
