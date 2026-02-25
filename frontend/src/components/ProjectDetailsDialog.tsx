import { Project } from '../backend';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { DollarSign, Clock, Users, ExternalLink, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import PledgeSection from './PledgeSection';
import TasksSection from './TasksSection';
import PeerRatingSection from './PeerRatingSection';
import ShareOfPoolSection from './ShareOfPoolSection';

interface ProjectDetailsDialogProps {
  project: Project;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ProjectDetailsDialog({ project, open, onOpenChange }: ProjectDetailsDialogProps) {
  const pledgeProgress = (project.totalPledgedHH / project.estimatedTotalHH) * 100;
  const payoutPerHH = project.estimatedTotalHH > 0 ? project.finalMonetaryValue / project.estimatedTotalHH : 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pledging':
        return 'bg-blue-500/10 text-blue-500';
      case 'active':
        return 'bg-green-500/10 text-green-500';
      case 'completed':
        return 'bg-purple-500/10 text-purple-500';
      default:
        return 'bg-gray-500/10 text-gray-500';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <DialogTitle className="text-2xl">{project.title}</DialogTitle>
            <Badge className={getStatusColor(project.status)}>
              #{project.status}
            </Badge>
          </div>
          <p className="text-muted-foreground">{project.description}</p>
        </DialogHeader>

        {/* Governance Note */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Governance via the Shadow Board is managed manually by the admin.
          </AlertDescription>
        </Alert>

        {/* Project Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" />
              Prize Money
            </div>
            <div className="text-2xl font-bold">${project.finalMonetaryValue.toFixed(2)}</div>
          </div>

          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Clock className="h-4 w-4" />
              Payout per HH
            </div>
            <div className="text-2xl font-bold">${payoutPerHH.toFixed(2)}</div>
          </div>

          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Users className="h-4 w-4" />
              Participants
            </div>
            <div className="text-2xl font-bold">{project.participants.length + 1}</div>
          </div>
        </div>

        {/* Pledge Progress */}
        {project.status === 'pledging' && (
          <div className="space-y-2 rounded-lg border p-4">
            <div className="flex justify-between text-sm">
              <span className="font-medium">Pledge Progress</span>
              <span className="text-muted-foreground">
                {project.totalPledgedHH.toFixed(1)} / {project.estimatedTotalHH.toFixed(1)} HH
              </span>
            </div>
            <Progress value={Math.min(pledgeProgress, 100)} className="h-2" />
          </div>
        )}

        {/* Resource Link */}
        {project.sharedResourceLink && (
          <div className="rounded-lg border p-4">
            <div className="text-sm font-medium mb-2">Shared Resources</div>
            <Button variant="outline" size="sm" asChild>
              <a href={project.sharedResourceLink} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                Open Resource Link
              </a>
            </Button>
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="tasks" className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="pledges">Pledges</TabsTrigger>
            <TabsTrigger value="payouts" disabled={project.status !== 'completed'}>
              Share of Pool
            </TabsTrigger>
            <TabsTrigger value="ratings" disabled={project.status !== 'completed'}>
              Peer Ratings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tasks" className="mt-4">
            <TasksSection project={project} />
          </TabsContent>

          <TabsContent value="pledges" className="mt-4">
            <PledgeSection project={project} />
          </TabsContent>

          <TabsContent value="payouts" className="mt-4">
            <ShareOfPoolSection project={project} />
          </TabsContent>

          <TabsContent value="ratings" className="mt-4">
            <PeerRatingSection project={project} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
