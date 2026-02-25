import { Task, Project } from '../backend';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useAcceptTask, useCompleteTask, useApproveTask, useChallengeTask } from '../hooks/useQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface TaskCardProps {
  task: Task;
  project: Project;
}

export default function TaskCard({ task, project }: TaskCardProps) {
  const { identity } = useInternetIdentity();
  const acceptTask = useAcceptTask();
  const completeTask = useCompleteTask();
  const approveTask = useApproveTask();
  const challengeTask = useChallengeTask();

  const isCreator = identity?.getPrincipal().toString() === project.creator.toString();
  const isAssignee = task.assignee?.toString() === identity?.getPrincipal().toString();
  const isParticipant =
    isCreator ||
    project.participants.some((p) => p.toString() === identity?.getPrincipal().toString());

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

  const canAccept = isParticipant && (task.status === 'proposed' || task.status === 'active') && !task.assignee;
  const canComplete = isAssignee && task.status === 'inProgress';
  const canApprove = isCreator && task.status === 'inAudit';
  const canChallenge = isParticipant && !isAssignee && task.status === 'inAudit';

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
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{task.hhBudget.toFixed(1)} HH</span>
            </div>
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
      </CardContent>
    </Card>
  );
}
