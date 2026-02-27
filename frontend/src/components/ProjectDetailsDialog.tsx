import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Eye } from 'lucide-react';
import { Project, ProjectStatus } from '../backend';
import { useGetTasks, useGetPledges } from '../hooks/useQueries';
import TasksSection from './TasksSection';
import PledgeSection from './PledgeSection';
import ShareOfPoolSection from './ShareOfPoolSection';
import PeerRatingSection from './PeerRatingSection';
import CompleteProjectButton from './CompleteProjectButton';

interface ProjectDetailsDialogProps {
  project: Project;
}

function getProjectStatusLabel(status: ProjectStatus): string {
  switch (status) {
    case ProjectStatus.pledging: return 'Pledging';
    case ProjectStatus.active: return 'Active';
    case ProjectStatus.completed: return 'Completed';
    case ProjectStatus.archived: return 'Archived';
    default: return String(status);
  }
}

function getProjectStatusColor(status: ProjectStatus): string {
  switch (status) {
    case ProjectStatus.pledging: return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
    case ProjectStatus.active: return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
    case ProjectStatus.completed: return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
    case ProjectStatus.archived: return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
    default: return 'bg-gray-100 text-gray-600';
  }
}

export default function ProjectDetailsDialog({ project }: ProjectDetailsDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Eye className="h-3.5 w-3.5" />
          Open
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3 pr-6">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl font-bold leading-tight">{project.title}</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{project.description}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${getProjectStatusColor(project.status)}`}>
                {getProjectStatusLabel(project.status)}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
            <span>
              <span className="font-medium text-foreground">{project.estimatedTotalHH} HH</span> estimated
            </span>
            <span>
              <span className="font-medium text-foreground">{project.finalMonetaryValue} €</span> prize pool
            </span>
            {project.sharedResourceLink && (
              <a
                href={project.sharedResourceLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-primary hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Resources
              </a>
            )}
          </div>
          {project.status === ProjectStatus.active && (
            <div className="mt-2">
              <CompleteProjectButton project={project} />
            </div>
          )}
        </DialogHeader>

        {open && (
          <ProjectDetailsTabs project={project} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ProjectDetailsTabs({ project }: { project: Project }) {
  const { data: tasks = [] } = useGetTasks(project.id);
  const { data: pledges = [] } = useGetPledges(project.id);

  return (
    <Tabs defaultValue="tasks" className="mt-4">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="tasks">Tasks</TabsTrigger>
        <TabsTrigger value="pledges">Pledges</TabsTrigger>
        <TabsTrigger value="pool">Share of Pool</TabsTrigger>
        <TabsTrigger value="ratings">Peer Ratings</TabsTrigger>
      </TabsList>

      <TabsContent value="tasks" className="mt-4">
        <TasksSection project={project} tasks={tasks} pledges={pledges} />
      </TabsContent>

      <TabsContent value="pledges" className="mt-4">
        <PledgeSection project={project} pledges={pledges} />
      </TabsContent>

      <TabsContent value="pool" className="mt-4">
        <ShareOfPoolSection project={project} pledges={pledges} />
      </TabsContent>

      <TabsContent value="ratings" className="mt-4">
        <PeerRatingSection project={project} />
      </TabsContent>
    </Tabs>
  );
}
