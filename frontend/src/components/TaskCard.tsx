import { useState } from 'react';
import { Task, Project, Pledge } from '../backend';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useAcceptTask, useCompleteTask, useApproveTask, useChallengeTask, usePledgeToTask } from '../hooks/useQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Clock, AlertCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface TaskCardProps {
  task: Task;
  project: Project;
  pledges?: Pledge[];
  remainingBudget?: number;
}

export default function TaskCard({ task, project, pledges = [], remainingBudget }: TaskCardProps) {
  const { identity } = useInternetIdentity();
  const [pledgeAmount, setPledgeAmount] = useState('');
  const [pledgeError, setPledgeError] = useState('');
  const acceptTask = useAcceptTask();
  const completeTask = useCompleteTask();
  const approveTask = useApproveTask();
  const challengeTask = useChallengeTask();
  const pledgeToTask = usePledgeToTask();

  const isCreator = identity?.getPrincipal().toString() === project.creator.toString();
  const isAssignee = task.assignee?.toString() === identity?.getPrincipal().toString();
  const isParticipant =
    isCreator ||
    project.participants.some((p) => p.toString() === identity?.getPrincipal().toString());

  // Pledges for this specific task
  const taskPledges = pledges.filter(
    (p) => p.target.__kind__ === 'task' && (p.target as any).task?.toString() === task.id.toString()
  );
  const approvedPledgedHH = taskPledges
    .filter((p) => p.status === 'approved')
    .reduce((sum, p) => sum + p.amount, 0);
  const pendingPledgedHH = taskPledges
    .filter((p) => p.status === 'pending')
    .reduce((sum, p) => sum + p.amount, 0);

  // Determine effective max for this pledge input
  const effectiveMax = remainingBudget !== undefined ? remainingBudget : Infinity;
  const isBudgetFull = remainingBudget !== undefined && remainingBudget <= 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'proposed':
        return 'bg-yellow-500/10 text-yellow-500';
      case 'active':
        return 'bg-blue-500/10 text-blue-500';
      case 'inProgress':
        return 'bg-cyan-500/10 text-cyan-500';
      case 'inAudit':
        return 'bg-orange-500/10 text-orange-500';
      case 'completed':
        return 'bg-green-500/10 text-green-500';
      case 'rejected':
        return 'bg-red-500/10 text-red-500';
      default:
        return 'bg-gray-500/10 text-gray-500';
    }
  };

  const handleAccept = async () => {
    try {
      await acceptTask.mutateAsync(task.id);
      toast.success('Task accepted!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to accept task');
    }
  };

  const handleComplete = async () => {
    try {
      await completeTask.mutateAsync(task.id);
      toast.success('Task marked as complete and sent to audit!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to complete task');
    }
  };

  const handleApprove = async () => {
    try {
      await approveTask.mutateAsync(task.id);
      toast.success('Task approved!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve task');
    }
  };

  const handleChallenge = async () => {
    try {
      await challengeTask.mutateAsync({ taskId: task.id, stakeHH: 1.0 });
      toast.success('Challenge submitted!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to challenge task');
    }
  };

  const handlePledgeAmountChange = (value: string) => {
    setPledgeAmount(value);
    const amount = parseFloat(value);
    if (!isNaN(amount) && remainingBudget !== undefined && amount > remainingBudget) {
      setPledgeError(`Exceeds remaining budget. Max: ${remainingBudget.toFixed(1)} HH`);
    } else {
      setPledgeError('');
    }
  };

  const handlePledge = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(pledgeAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid pledge amount');
      return;
    }
    if (remainingBudget !== undefined && amount > remainingBudget) {
      toast.error(`Pledge exceeds remaining budget. Max allowed: ${remainingBudget.toFixed(1)} HH`);
      return;
    }
    try {
      await pledgeToTask.mutateAsync({
        projectId: project.id,
        target: { __kind__: 'task', task: task.id },
        amount,
      });
      toast.success(`Pledged ${amount} HH to task!`);
      setPledgeAmount('');
      setPledgeError('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to pledge');
    }
  };

  const canAccept = isParticipant && (task.status === 'proposed' || task.status === 'active') && !task.assignee;
  const canComplete = isAssignee && task.status === 'inProgress';
  const canApprove = isCreator && task.status === 'inAudit';
  const canChallenge = isParticipant && !isAssignee && task.status === 'inAudit';
  const canPledge = isParticipant && (project.status === 'pledging' || project.status === 'active');

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <CardTitle className="text-base">{task.title}</CardTitle>
            <CardDescription className="mt-1">{task.description}</CardDescription>
          </div>
          <Badge className={getStatusColor(task.status)}>
            #{task.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{task.hhBudget.toFixed(1)} HH budget</span>
            </div>
            {taskPledges.length > 0 && (
              <div className="flex items-center gap-2 text-xs">
                {approvedPledgedHH > 0 && (
                  <span className="text-green-600 dark:text-green-400">
                    ✓ {approvedPledgedHH.toFixed(1)} HH approved
                  </span>
                )}
                {pendingPledgedHH > 0 && (
                  <span className="text-yellow-600 dark:text-yellow-400">
                    ⏳ {pendingPledgedHH.toFixed(1)} HH pending
                  </span>
                )}
              </div>
            )}
            {task.dependencies.length > 0 && (
              <div className="flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                <span>{task.dependencies.length} dependencies</span>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            {canAccept && (
              <Button size="sm" onClick={handleAccept} disabled={acceptTask.isPending}>
                {acceptTask.isPending ? 'Accepting...' : 'Accept'}
              </Button>
            )}
            {canComplete && (
              <Button size="sm" onClick={handleComplete} disabled={completeTask.isPending}>
                {completeTask.isPending ? 'Completing...' : 'Complete'}
              </Button>
            )}
            {canApprove && (
              <Button size="sm" onClick={handleApprove} disabled={approveTask.isPending}>
                {approveTask.isPending ? 'Approving...' : 'Approve'}
              </Button>
            )}
            {canChallenge && (
              <Button
                size="sm"
                variant="destructive"
                onClick={handleChallenge}
                disabled={challengeTask.isPending}
              >
                {challengeTask.isPending ? 'Challenging...' : 'Challenge'}
              </Button>
            )}
          </div>
        </div>

        {/* Pledge to this task */}
        {canPledge && (
          <div className="space-y-1 pt-1 border-t">
            {isBudgetFull ? (
              <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-xs text-red-700 dark:text-red-400">
                <AlertTriangle className="h-3 w-3 shrink-0" />
                <span>Budget fully pledged — no more pledges can be made</span>
              </div>
            ) : (
              <>
                <form onSubmit={handlePledge} className="flex gap-2">
                  <div className="flex-1">
                    <Label htmlFor={`pledge-task-${task.id}`} className="sr-only">Pledge HH</Label>
                    <Input
                      id={`pledge-task-${task.id}`}
                      type="number"
                      step="0.1"
                      min="0.1"
                      max={effectiveMax !== Infinity ? effectiveMax : undefined}
                      placeholder={
                        remainingBudget !== undefined
                          ? `Pledge HH (max ${remainingBudget.toFixed(1)} HH)`
                          : 'Pledge HH to this task'
                      }
                      value={pledgeAmount}
                      onChange={(e) => handlePledgeAmountChange(e.target.value)}
                      disabled={pledgeToTask.isPending}
                      className={`h-8 text-sm ${pledgeError ? 'border-destructive' : ''}`}
                    />
                  </div>
                  <Button
                    type="submit"
                    size="sm"
                    variant="outline"
                    disabled={pledgeToTask.isPending || !!pledgeError || !pledgeAmount}
                    className="h-8"
                  >
                    {pledgeToTask.isPending ? '...' : 'Pledge'}
                  </Button>
                </form>
                {pledgeError && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {pledgeError}
                  </p>
                )}
                {remainingBudget !== undefined && !pledgeError && (
                  <p className="text-xs text-muted-foreground">
                    Max: <strong>{remainingBudget.toFixed(1)} HH</strong> remaining in project budget
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {/* Pledges list for this task */}
        {taskPledges.length > 0 && (
          <div className="space-y-1 pt-1">
            <p className="text-xs font-medium text-muted-foreground">Pledges:</p>
            {taskPledges.map((pledge, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs rounded px-2 py-1 bg-muted/50">
                <span className="text-muted-foreground">{pledge.user.toString().slice(0, 12)}...</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{pledge.amount.toFixed(1)} HH</span>
                  <Badge
                    variant="outline"
                    className={
                      pledge.status === 'approved'
                        ? 'text-green-600 border-green-500/30 text-xs py-0'
                        : pledge.status === 'reassigned'
                        ? 'text-gray-500 border-gray-400/30 text-xs py-0'
                        : 'text-yellow-600 border-yellow-500/30 text-xs py-0'
                    }
                  >
                    {pledge.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
