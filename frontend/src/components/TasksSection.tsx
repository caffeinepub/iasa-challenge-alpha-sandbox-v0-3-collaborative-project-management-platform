import React from 'react';
import { Project, Task, Pledge, ProjectStatus } from '../backend';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import TaskCard from './TaskCard';
import CreateTaskDialog from './CreateTaskDialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info, AlertCircle } from 'lucide-react';

interface TasksSectionProps {
  project: Project;
  tasks: Task[];
  pledges: Pledge[];
}

export default function TasksSection({ project, tasks, pledges }: TasksSectionProps) {
  const { identity } = useInternetIdentity();
  const callerPrincipal = identity?.getPrincipal().toString();
  const isPM = project.creator.toString() === callerPrincipal;

  const confirmedHH = pledges
    .filter(p => p.status === 'confirmed' || p.status === 'approved')
    .reduce((sum, p) => sum + p.amount, 0);

  const pendingHH = pledges
    .filter(p => p.status === 'pending')
    .reduce((sum, p) => sum + p.amount, 0);

  const regularTasks = tasks.filter(t => t.title !== 'Other Tasks');
  const otherTask = tasks.find(t => t.title === 'Other Tasks');

  const canCreateTask =
    project.status === ProjectStatus.pledging || project.status === ProjectStatus.active;

  return (
    <TooltipProvider>
      <div className="space-y-4">

        {/* Budget banner */}
        <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-sm font-semibold">Project HH Budget</span>
            <div className="flex items-center gap-3 text-sm flex-wrap">
              <span>
                Estimated: <span className="font-bold">{project.estimatedTotalHH} HH</span>
              </span>
              <span className="text-green-600 dark:text-green-400">
                Confirmed: <span className="font-bold">{confirmedHH.toFixed(1)} HH</span>
              </span>
              {pendingHH > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-yellow-600 dark:text-yellow-400 cursor-help flex items-center gap-1">
                      Pending: <span className="font-bold">{pendingHH.toFixed(1)} HH</span>
                      <Info className="h-3.5 w-3.5" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs max-w-xs">
                      Pending pledges are <strong>not yet counted</strong> in the confirmed budget.
                      The PM must confirm each pledge after confirming the task.
                    </p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>

          {/* Lifecycle legend */}
          <div className="border-t border-border pt-2 mt-1">
            <p className="text-xs text-muted-foreground font-medium mb-1.5 flex items-center gap-1">
              <Info className="h-3 w-3" /> Task lifecycle sequence:
            </p>
            <div className="flex flex-wrap gap-2 text-xs">
              {[
                { label: '1. Proposed', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' },
                { label: '2. Task Confirmed (PM)', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
                { label: '3. In Progress (Assignee)', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300' },
                { label: '4. In Audit (24h)', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' },
                { label: '5. Completed (Mentor)', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
              ].map(step => (
                <span key={step.label} className={`px-2 py-0.5 rounded-full font-medium ${step.color}`}>
                  {step.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* PM note */}
        {isPM && (
          <div className="flex items-start gap-2 text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-md p-2.5">
            <AlertCircle className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" />
            <span>
              <strong>PM actions:</strong> Confirm tasks (Step 1) to unlock pledge confirmation. Then confirm individual pledges (Step 2) in the Pledges tab.
            </span>
          </div>
        )}

        {/* Task list */}
        {regularTasks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No tasks yet. {canCreateTask && 'Create the first task below.'}
          </div>
        ) : (
          <div className="space-y-3">
            {regularTasks.map(task => (
              <TaskCard
                key={String(task.id)}
                task={task}
                project={project}
                pledges={pledges}
                allTasks={tasks}
              />
            ))}
          </div>
        )}

        {/* Other Tasks pool */}
        {otherTask && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">General Pool</h4>
            <TaskCard
              key={String(otherTask.id)}
              task={otherTask}
              project={project}
              pledges={pledges}
              allTasks={tasks}
            />
          </div>
        )}

        {/* Create task */}
        {canCreateTask && (
          <div className="pt-2">
            <CreateTaskDialog project={project} tasks={tasks} pledges={pledges} />
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
