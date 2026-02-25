import { Project } from '../backend';
import { useCompleteProject } from '../hooks/useQueries';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface CompleteProjectButtonProps {
  project: Project;
}

export default function CompleteProjectButton({ project }: CompleteProjectButtonProps) {
  const completeProject = useCompleteProject();

  const handleComplete = async () => {
    try {
      await completeProject.mutateAsync(project.id);
      toast.success('Project marked as completed! Peer rating window is now open.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to complete project');
    }
  };

  return (
    <Button size="sm" variant="outline" onClick={handleComplete} disabled={completeProject.isPending}>
      <CheckCircle className="mr-2 h-4 w-4" />
      {completeProject.isPending ? 'Completing...' : 'Complete Project'}
    </Button>
  );
}
