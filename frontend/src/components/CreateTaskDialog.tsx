import { useState } from 'react';
import { Project } from '../backend';
import { useCreateTask, useGetTasks } from '../hooks/useQueries';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

interface CreateTaskDialogProps {
  project: Project;
}

export default function CreateTaskDialog({ project }: CreateTaskDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [hhBudget, setHhBudget] = useState('');

  const createTask = useCreateTask();
  const { data: tasks = [] } = useGetTasks(project.id);

  const totalBudgetUsed = tasks.reduce((sum, task) => sum + task.hhBudget, 0);
  const remainingBudget = project.totalPledgedHH - totalBudgetUsed;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !description.trim() || !hhBudget) {
      toast.error('Please fill in all required fields');
      return;
    }

    const budgetValue = parseFloat(hhBudget);

    if (isNaN(budgetValue) || budgetValue <= 0) {
      toast.error('HH Budget must be a positive number');
      return;
    }

    if (budgetValue > remainingBudget) {
      toast.error(`Budget exceeds remaining project HH (${remainingBudget.toFixed(1)} HH available)`);
      return;
    }

    try {
      await createTask.mutateAsync({
        projectId: project.id,
        title: title.trim(),
        description: description.trim(),
        hhBudget: budgetValue,
        dependencies: [],
      });
      toast.success('Task created successfully!');
      setOpen(false);
      setTitle('');
      setDescription('');
      setHhBudget('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create task');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Create Task
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
          <DialogDescription>
            Create a task for this project. Available budget: {remainingBudget.toFixed(1)} HH
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="taskTitle">Task Title *</Label>
            <Input
              id="taskTitle"
              placeholder="Enter task title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={createTask.isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="taskDescription">Description *</Label>
            <Textarea
              id="taskDescription"
              placeholder="Describe the task requirements"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={createTask.isPending}
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="hhBudget">HH Budget *</Label>
            <Input
              id="hhBudget"
              type="number"
              step="0.1"
              min="0.1"
              max={remainingBudget}
              placeholder="10"
              value={hhBudget}
              onChange={(e) => setHhBudget(e.target.value)}
              disabled={createTask.isPending}
            />
            <p className="text-xs text-muted-foreground">
              Maximum: {remainingBudget.toFixed(1)} HH
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={createTask.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={createTask.isPending}>
              {createTask.isPending ? 'Creating...' : 'Create Task'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
