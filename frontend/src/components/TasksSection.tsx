import { Project } from '../backend';
import { useGetTasks } from '../hooks/useQueries';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { Button } from '@/components/ui/button';
import TaskCard from './TaskCard';
import CreateTaskDialog from './CreateTaskDialog';
import CompleteProjectButton from './CompleteProjectButton';

interface TasksSectionProps {
  project: Project;
}

export default function TasksSection({ project }: TasksSectionProps) {
  const { data: tasks = [] } = useGetTasks(project.id);
  const { identity } = useInternetIdentity();

  const isCreator = identity?.getPrincipal().toString() === project.creator.toString();
  const isParticipant =
    isCreator ||
    project.participants.some((p) => p.toString() === identity?.getPrincipal().toString());

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Tasks</h3>
        <div className="flex gap-2">
          {isCreator && project.status === 'active' && <CompleteProjectButton project={project} />}
          {isParticipant && project.status === 'active' && <CreateTaskDialog project={project} />}
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">No tasks yet</p>
          {isParticipant && project.status === 'active' && (
            <p className="mt-2 text-sm text-muted-foreground">Create the first task to get started</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <TaskCard key={task.id.toString()} task={task} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
