import { useState } from 'react';
import { Project, Task, SquadRole } from '../backend';
import { useGetTasks, useGetPledges, usePledgeToTask, useReassignFromOtherTasks } from '../hooks/useQueries';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, Layers, ArrowRight, AlertTriangle } from 'lucide-react';
import TaskCard from './TaskCard';
import CreateTaskDialog from './CreateTaskDialog';
import CompleteProjectButton from './CompleteProjectButton';
import { toast } from 'sonner';

interface TasksSectionProps {
  project: Project;
  userProfile?: { squadRole: SquadRole; friendlyUsername: string } | null;
}

export default function TasksSection({ project, userProfile = null }: TasksSectionProps) {
  const { data: tasks = [] } = useGetTasks(project.id);
  const { data: pledges = [] } = useGetPledges(project.id);
  const { identity } = useInternetIdentity();

  const currentUserPrincipal = identity?.getPrincipal().toString();
  const isCreator = currentUserPrincipal === project.creator.toString();
  const isParticipant =
    isCreator ||
    project.participants.some((p) => p.toString() === currentUserPrincipal);

  // Any authenticated user can create tasks (not just creator)
  const canCreateTask =
    !!currentUserPrincipal &&
    (project.status === 'pledging' || project.status === 'active');

  // Separate "Other Tasks" pool from regular tasks
  const otherTasksEntry = tasks.find((t) => t.title === 'Other Tasks');
  const regularTasks = tasks.filter((t) => t.title !== 'Other Tasks');

  // Calculate total active pledges (pending + approved) across the whole project
  const totalActivePledgedHH = pledges
    .filter((p) => p.status === 'pending' || p.status === 'approved')
    .reduce((sum, p) => sum + p.amount, 0);

  // Remaining budget available for new pledges
  const remainingBudget = Math.max(0, project.estimatedTotalHH - totalActivePledgedHH);

  // Calculate pledged HH for Other Tasks pool
  const otherTasksPledges = pledges.filter((p) => p.target.__kind__ === 'otherTasks');
  const otherTasksApprovedHH = otherTasksPledges
    .filter((p) => p.status === 'approved')
    .reduce((sum, p) => sum + p.amount, 0);
  const otherTasksPendingHH = otherTasksPledges
    .filter((p) => p.status === 'pending')
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Tasks</h3>
        <div className="flex gap-2">
          {isCreator && project.status === 'active' && <CompleteProjectButton project={project} />}
          {/* Create Task visible to all authenticated users */}
          {canCreateTask && (
            <CreateTaskDialog project={project} />
          )}
        </div>
      </div>

      {/* Remaining Budget Banner */}
      {(project.status === 'pledging' || project.status === 'active') && (
        <div
          className={`flex items-center justify-between rounded-lg border px-4 py-2 text-sm ${
            remainingBudget <= 0
              ? 'border-red-500/30 bg-red-500/5 text-red-700 dark:text-red-400'
              : remainingBudget < project.estimatedTotalHH * 0.1
              ? 'border-yellow-500/30 bg-yellow-500/5 text-yellow-700 dark:text-yellow-400'
              : 'border-primary/20 bg-primary/5 text-primary'
          }`}
        >
          <div className="flex items-center gap-2">
            {remainingBudget <= 0 ? (
              <AlertTriangle className="h-4 w-4" />
            ) : (
              <Clock className="h-4 w-4" />
            )}
            <span className="font-medium">
              {remainingBudget <= 0
                ? 'Budget fully pledged — no more pledges can be made'
                : `Remaining budget: ${remainingBudget.toFixed(1)} HH available to pledge`}
            </span>
          </div>
          <span className="text-xs opacity-70">
            {totalActivePledgedHH.toFixed(1)} / {project.estimatedTotalHH.toFixed(1)} HH pledged
          </span>
        </div>
      )}

      {/* Other Tasks Pool Card */}
      {otherTasksEntry && (
        <OtherTasksPoolCard
          project={project}
          otherTasksEntry={otherTasksEntry}
          regularTasks={regularTasks}
          otherTasksPledges={otherTasksPledges}
          otherTasksApprovedHH={otherTasksApprovedHH}
          otherTasksPendingHH={otherTasksPendingHH}
          isCreator={isCreator}
          isParticipant={!!currentUserPrincipal}
          remainingBudget={remainingBudget}
        />
      )}

      {/* Regular Tasks */}
      {regularTasks.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">No specific tasks yet</p>
          {canCreateTask && (
            <p className="mt-2 text-sm text-muted-foreground">Create tasks to allocate project work</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {regularTasks.map((task) => (
            <TaskCard
              key={task.id.toString()}
              task={task}
              project={project}
              pledges={pledges}
              isCreator={isCreator}
              remainingBudget={remainingBudget}
              userProfile={userProfile}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface OtherTasksPoolCardProps {
  project: Project;
  otherTasksEntry: Task;
  regularTasks: Task[];
  otherTasksPledges: any[];
  otherTasksApprovedHH: number;
  otherTasksPendingHH: number;
  isCreator: boolean;
  isParticipant: boolean;
  remainingBudget: number;
}

function OtherTasksPoolCard({
  project,
  otherTasksEntry,
  regularTasks,
  otherTasksPledges,
  otherTasksApprovedHH,
  otherTasksPendingHH,
  isCreator,
  isParticipant,
  remainingBudget,
}: OtherTasksPoolCardProps) {
  const [pledgeAmount, setPledgeAmount] = useState('');
  const [pledgeError, setPledgeError] = useState('');
  const [reassignTaskId, setReassignTaskId] = useState('');
  const [reassignPledgeId, setReassignPledgeId] = useState('');
  const pledgeToTask = usePledgeToTask();
  const reassignFromOtherTasks = useReassignFromOtherTasks();

  const canPledge = project.status === 'pledging' || project.status === 'active';
  const isBudgetFull = remainingBudget <= 0;

  // Only approved otherTasks pledges that haven't been reassigned can be reassigned
  const reassignablePledges = otherTasksPledges.filter((p) => p.status === 'approved');

  const handlePledgeAmountChange = (value: string) => {
    setPledgeAmount(value);
    const amount = parseFloat(value);
    if (!isNaN(amount) && amount > remainingBudget) {
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
    if (amount > remainingBudget) {
      toast.error(`Pledge exceeds remaining budget. Max allowed: ${remainingBudget.toFixed(1)} HH`);
      return;
    }
    try {
      await pledgeToTask.mutateAsync({
        projectId: project.id,
        target: { __kind__: 'otherTasks', otherTasks: null },
        amount,
      });
      toast.success(`Pledged ${amount} HH to Other Tasks pool!`);
      setPledgeAmount('');
      setPledgeError('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to pledge');
    }
  };

  const handleReassign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reassignPledgeId || !reassignTaskId) {
      toast.error('Please select a pledge and a target task');
      return;
    }
    try {
      await reassignFromOtherTasks.mutateAsync({
        pledgeId: BigInt(reassignPledgeId),
        newTaskId: BigInt(reassignTaskId),
      });
      toast.success('HH reassigned successfully!');
      setReassignPledgeId('');
      setReassignTaskId('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to reassign');
    }
  };

  return (
    <Card className="border-2 border-amber-500/30 bg-amber-500/5">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-amber-500" />
            <CardTitle className="text-base text-amber-700 dark:text-amber-400">
              Other Tasks Pool
            </CardTitle>
          </div>
          <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30">
            Pool
          </Badge>
        </div>
        <CardDescription>
          General HH pool for unallocated work. PM can reassign approved pledges to specific tasks.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Pool Stats */}
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Budget: <strong>{otherTasksEntry.hhBudget.toFixed(1)} HH</strong></span>
          </div>
          <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
            <span>Approved: <strong>{otherTasksApprovedHH.toFixed(1)} HH</strong></span>
          </div>
          {otherTasksPendingHH > 0 && (
            <div className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
              <span>Pending: <strong>{otherTasksPendingHH.toFixed(1)} HH</strong></span>
            </div>
          )}
        </div>

        {/* Pledge to Other Tasks — visible to all authenticated users */}
        {isParticipant && canPledge && (
          <div className="space-y-1">
            {isBudgetFull ? (
              <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-sm text-red-700 dark:text-red-400">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>Budget fully pledged — no more pledges can be made</span>
              </div>
            ) : (
              <form onSubmit={handlePledge} className="space-y-1">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label htmlFor="otherTasksPledge" className="sr-only">Pledge to Other Tasks</Label>
                    <Input
                      id="otherTasksPledge"
                      type="number"
                      step="0.1"
                      min="0.1"
                      max={remainingBudget}
                      placeholder={`Pledge HH (max ${remainingBudget.toFixed(1)} HH)`}
                      value={pledgeAmount}
                      onChange={(e) => handlePledgeAmountChange(e.target.value)}
                      disabled={pledgeToTask.isPending}
                      className={pledgeError ? 'border-destructive' : ''}
                    />
                  </div>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={pledgeToTask.isPending || !!pledgeError || !pledgeAmount}
                    variant="outline"
                  >
                    {pledgeToTask.isPending ? 'Pledging...' : 'Pledge'}
                  </Button>
                </div>
                {pledgeError && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {pledgeError}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Max pledge: <strong>{remainingBudget.toFixed(1)} HH</strong> remaining in project budget
                </p>
              </form>
            )}
          </div>
        )}

        {/* PM Reassignment */}
        {isCreator && reassignablePledges.length > 0 && regularTasks.length > 0 && (
          <div className="rounded-lg border border-amber-500/20 bg-background p-3 space-y-3">
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">
              PM: Reassign to Specific Task
            </p>
            <form onSubmit={handleReassign} className="space-y-2">
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs">Select Pledge</Label>
                  <Select value={reassignPledgeId} onValueChange={setReassignPledgeId}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Choose pledge..." />
                    </SelectTrigger>
                    <SelectContent>
                      {reassignablePledges.map((pledge, idx) => (
                        <SelectItem key={idx} value={idx.toString()}>
                          {pledge.amount.toFixed(1)} HH — {pledge.user.toString().slice(0, 8)}...
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Target Task</Label>
                  <Select value={reassignTaskId} onValueChange={setReassignTaskId}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Choose task..." />
                    </SelectTrigger>
                    <SelectContent>
                      {regularTasks.map((task) => (
                        <SelectItem key={task.id.toString()} value={task.id.toString()}>
                          {task.title} ({task.hhBudget.toFixed(1)} HH)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                type="submit"
                size="sm"
                className="w-full"
                disabled={reassignFromOtherTasks.isPending || !reassignPledgeId || !reassignTaskId}
              >
                <ArrowRight className="mr-1 h-3 w-3" />
                {reassignFromOtherTasks.isPending ? 'Reassigning...' : 'Reassign HH'}
              </Button>
            </form>
          </div>
        )}

        {/* Pledges list */}
        {otherTasksPledges.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Pledges to this pool:</p>
            {otherTasksPledges.map((pledge, idx) => (
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
