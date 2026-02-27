import { useState } from 'react';
import { useCreateProject } from '../hooks/useQueries';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

export default function CreateProjectDialog() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [estimatedHH, setEstimatedHH] = useState('');
  const [monetaryValue, setMonetaryValue] = useState('');
  const [resourceLink, setResourceLink] = useState('');
  const [otherTasksPoolHH, setOtherTasksPoolHH] = useState('');

  const createProject = useCreateProject();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !description.trim() || !estimatedHH || !monetaryValue) {
      toast.error('Please fill in all required fields');
      return;
    }

    const hhValue = parseFloat(estimatedHH);
    const moneyValue = parseFloat(monetaryValue);
    const poolHH = otherTasksPoolHH ? parseFloat(otherTasksPoolHH) : 0;

    if (isNaN(hhValue) || hhValue <= 0) {
      toast.error('Estimated HH must be a positive number');
      return;
    }

    if (isNaN(moneyValue) || moneyValue < 0) {
      toast.error('Monetary value must be a non-negative number');
      return;
    }

    if (isNaN(poolHH) || poolHH < 0) {
      toast.error('Other Tasks pool HH must be a non-negative number');
      return;
    }

    if (poolHH > hhValue) {
      toast.error('Other Tasks pool HH cannot exceed total estimated HH');
      return;
    }

    try {
      await createProject.mutateAsync({
        title: title.trim(),
        description: description.trim(),
        estimatedTotalHH: hhValue,
        finalMonetaryValue: moneyValue,
        sharedResourceLink: resourceLink.trim() || null,
        otherTasksPoolHH: poolHH,
      });
      toast.success('Project created successfully!');
      setOpen(false);
      setTitle('');
      setDescription('');
      setEstimatedHH('');
      setMonetaryValue('');
      setResourceLink('');
      setOtherTasksPoolHH('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create project');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Project
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>
            Create a new project and start collecting pledges from collaborators.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Project Title *</Label>
            <Input
              id="title"
              placeholder="Enter project title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={createProject.isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              placeholder="Describe your project goals and requirements"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={createProject.isPending}
              rows={4}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="estimatedHH">Estimated Total HH *</Label>
              <Input
                id="estimatedHH"
                type="number"
                step="0.1"
                min="0"
                placeholder="100"
                value={estimatedHH}
                onChange={(e) => setEstimatedHH(e.target.value)}
                disabled={createProject.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="monetaryValue">Prize Money ($) *</Label>
              <Input
                id="monetaryValue"
                type="number"
                step="0.01"
                min="0"
                placeholder="5000"
                value={monetaryValue}
                onChange={(e) => setMonetaryValue(e.target.value)}
                disabled={createProject.isPending}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="otherTasksPoolHH">Other Tasks Pool HH</Label>
            <Input
              id="otherTasksPoolHH"
              type="number"
              step="0.1"
              min="0"
              placeholder="10 (default: 0)"
              value={otherTasksPoolHH}
              onChange={(e) => setOtherTasksPoolHH(e.target.value)}
              disabled={createProject.isPending}
            />
            <p className="text-xs text-muted-foreground">
              HH reserved for the "Other Tasks" pool. The PM can reassign these hours to specific tasks later.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="resourceLink">Shared Resource Link (optional)</Label>
            <Input
              id="resourceLink"
              type="url"
              placeholder="https://example.com/resources"
              value={resourceLink}
              onChange={(e) => setResourceLink(e.target.value)}
              disabled={createProject.isPending}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={createProject.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={createProject.isPending}>
              {createProject.isPending ? 'Creating...' : 'Create Project'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
