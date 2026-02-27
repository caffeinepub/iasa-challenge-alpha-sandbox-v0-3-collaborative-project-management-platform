import React, { useState } from "react";
import { Project, Task, Pledge, PledgeStatus } from "../backend";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useCreateTask } from "../hooks/useQueries";
import { toast } from "sonner";
import { Plus, Loader2, Info } from "lucide-react";
import { getConfirmedPledgedHH } from "../hooks/useQueries";

interface CreateTaskDialogProps {
  project: Project;
  tasks: Task[];
  pledges: Pledge[];
}

export default function CreateTaskDialog({
  project,
  tasks,
  pledges,
}: CreateTaskDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [hhBudget, setHhBudget] = useState("");
  const createTask = useCreateTask();

  const otherTask = tasks.find((t) => t.title === "Other Tasks");
  const otherTasksPoolHH = otherTask?.hhBudget ?? 0;
  const regularTasks = tasks.filter((t) => t.title !== "Other Tasks");
  const allocatedToTasks = regularTasks.reduce((sum, t) => sum + t.hhBudget, 0);

  // Available budget = total - other tasks pool - already allocated to tasks
  const availableBudget =
    project.estimatedTotalHH - otherTasksPoolHH - allocatedToTasks;

  // Note: confirmed pledges are informational here; task budget is structural
  const confirmedHH = getConfirmedPledgedHH(pledges);
  const pendingHH = pledges
    .filter((p) => p.status === PledgeStatus.pending)
    .reduce((sum, p) => sum + p.amount, 0);

  const requestedBudget = parseFloat(hhBudget) || 0;
  const wouldExceed = requestedBudget > availableBudget;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const budget = parseFloat(hhBudget);
    if (!title.trim()) {
      toast.error("Task title is required");
      return;
    }
    if (isNaN(budget) || budget <= 0) {
      toast.error("HH budget must be a positive number");
      return;
    }
    if (budget > availableBudget) {
      toast.error(
        `Budget exceeds available HH. Available: ${availableBudget.toFixed(1)} HH`
      );
      return;
    }
    try {
      await createTask.mutateAsync({
        projectId: project.id,
        title: title.trim(),
        description: description.trim(),
        hhBudget: budget,
        dependencies: [],
      });
      toast.success("Task created successfully");
      setOpen(false);
      setTitle("");
      setDescription("");
      setHhBudget("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create task");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1">
          <Plus className="h-4 w-4" />
          Create Task
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Budget info */}
          <Alert className="border-primary/30 bg-primary/5">
            <Info className="h-4 w-4 text-primary" />
            <AlertDescription className="text-xs text-muted-foreground space-y-1">
              <div>
                <strong className="text-foreground">Available task budget:</strong>{" "}
                <span className="font-medium text-foreground">
                  {availableBudget.toFixed(1)} HH
                </span>
                {" "}(of {project.estimatedTotalHH} HH total, minus {otherTasksPoolHH} HH Other Tasks pool)
              </div>
              <div className="text-emerald-600 dark:text-emerald-400">
                Confirmed pledges: {confirmedHH.toFixed(1)} HH
              </div>
              {pendingHH > 0 && (
                <div className="text-amber-500">
                  Pending pledges: {pendingHH.toFixed(1)} HH (not confirmed — do not count toward budget)
                </div>
              )}
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="task-title">Task Title</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter task title"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-description">Description</Label>
            <Textarea
              id="task-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the task..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="hh-budget">HH Budget</Label>
            <Input
              id="hh-budget"
              type="number"
              min="0.1"
              step="0.1"
              max={availableBudget}
              value={hhBudget}
              onChange={(e) => setHhBudget(e.target.value)}
              placeholder={`Max ${availableBudget.toFixed(1)} HH`}
            />
            {wouldExceed && (
              <p className="text-xs text-destructive">
                Exceeds available budget of {availableBudget.toFixed(1)} HH
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createTask.isPending || wouldExceed || !title.trim() || !hhBudget}
            >
              {createTask.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Create Task
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
