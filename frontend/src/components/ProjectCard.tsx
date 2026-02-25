import { useState } from 'react';
import { Project } from '../backend';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { DollarSign, Clock, Users } from 'lucide-react';
import ProjectDetailsDialog from './ProjectDetailsDialog';

interface ProjectCardProps {
  project: Project;
}

export default function ProjectCard({ project }: ProjectCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  const pledgeProgress = (project.totalPledgedHH / project.estimatedTotalHH) * 100;
  const payoutPerHH = project.estimatedTotalHH > 0 ? project.finalMonetaryValue / project.estimatedTotalHH : 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pledging':
        return 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20';
      case 'active':
        return 'bg-green-500/10 text-green-500 hover:bg-green-500/20';
      case 'completed':
        return 'bg-purple-500/10 text-purple-500 hover:bg-purple-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 hover:bg-gray-500/20';
    }
  };

  return (
    <>
      <Card className="flex flex-col transition-shadow hover:shadow-md">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="line-clamp-2">{project.title}</CardTitle>
            <Badge className={getStatusColor(project.status)}>
              #{project.status}
            </Badge>
          </div>
          <CardDescription className="line-clamp-2">{project.description}</CardDescription>
        </CardHeader>

        <CardContent className="flex-1 space-y-4">
          {project.status === 'pledging' && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Pledge Progress</span>
                <span className="font-medium">
                  {project.totalPledgedHH.toFixed(1)} / {project.estimatedTotalHH.toFixed(1)} HH
                </span>
              </div>
              <Progress value={Math.min(pledgeProgress, 100)} />
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1 text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                Prize Money
              </span>
              <span className="font-semibold">${project.finalMonetaryValue.toFixed(2)}</span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-4 w-4" />
                Payout per HH
              </span>
              <span className="font-semibold">${payoutPerHH.toFixed(2)}</span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1 text-muted-foreground">
                <Users className="h-4 w-4" />
                Participants
              </span>
              <span className="font-semibold">{project.participants.length + 1}</span>
            </div>
          </div>
        </CardContent>

        <CardFooter>
          <Button onClick={() => setShowDetails(true)} className="w-full">
            View Details
          </Button>
        </CardFooter>
      </Card>

      {showDetails && (
        <ProjectDetailsDialog project={project} open={showDetails} onOpenChange={setShowDetails} />
      )}
    </>
  );
}
