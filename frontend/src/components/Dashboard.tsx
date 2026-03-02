import { useState } from 'react';
import { useGetCallerUserProfile, useGetProjects, useGetTasks } from '../hooks/useQueries';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Zap, Star, Award, Shield, ClipboardList, Clock } from 'lucide-react';
import ProjectsTab from './ProjectsTab';
import CreateProjectDialog from './CreateProjectDialog';
import { ParticipationLevel, ProjectStatus, Project } from '../backend';
import { Badge } from '@/components/ui/badge';

const PARTICIPATION_LEVEL_LABELS: Record<ParticipationLevel, string> = {
  [ParticipationLevel.Apprentice]: 'Apprentice',
  [ParticipationLevel.Journeyman]: 'Journeyman',
  [ParticipationLevel.Master]: 'Master',
  [ParticipationLevel.GuestArtist]: 'Guest Artist',
};

const PARTICIPATION_LEVEL_COLORS: Record<ParticipationLevel, string> = {
  [ParticipationLevel.Apprentice]: 'text-blue-600 dark:text-blue-400',
  [ParticipationLevel.Journeyman]: 'text-green-600 dark:text-green-400',
  [ParticipationLevel.Master]: 'text-purple-600 dark:text-purple-400',
  [ParticipationLevel.GuestArtist]: 'text-amber-600 dark:text-amber-400',
};

interface DecisionEntry {
  id: string;
  timestamp: bigint;
  type: 'project_created' | 'project_active' | 'project_completed' | 'project_archived';
  title: string;
  description: string;
  projectTitle: string;
  statusColor: string;
}

function formatTimestamp(ts: bigint): string {
  const ms = Number(ts) / 1_000_000;
  const date = new Date(ms);
  if (isNaN(date.getTime())) return 'Unknown date';
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function buildDecisionLog(projects: Project[]): DecisionEntry[] {
  const entries: DecisionEntry[] = [];

  for (const project of projects) {
    // Project creation event (use id as proxy timestamp ordering)
    entries.push({
      id: `project-created-${project.id}`,
      timestamp: project.id,
      type: 'project_created',
      title: 'Project Created',
      description: `"${project.title}" was created with ${project.estimatedTotalHH} HH budget and ${project.finalMonetaryValue} € prize pool.`,
      projectTitle: project.title,
      statusColor: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    });

    if (project.status === ProjectStatus.active || project.status === ProjectStatus.completed || project.status === ProjectStatus.archived) {
      entries.push({
        id: `project-active-${project.id}`,
        timestamp: project.id,
        type: 'project_active',
        title: 'Project Activated',
        description: `"${project.title}" reached the 80% pledge threshold and moved to active status.`,
        projectTitle: project.title,
        statusColor: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      });
    }

    if (project.status === ProjectStatus.completed && project.completionTime != null) {
      entries.push({
        id: `project-completed-${project.id}`,
        timestamp: project.completionTime!,
        type: 'project_completed',
        title: 'Project Completed',
        description: `"${project.title}" was marked as completed. Peer rating window is now open for 7 days.`,
        projectTitle: project.title,
        statusColor: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      });
    }

    if (project.status === ProjectStatus.archived) {
      entries.push({
        id: `project-archived-${project.id}`,
        timestamp: project.id,
        type: 'project_archived',
        title: 'Project Archived',
        description: `"${project.title}" has been archived.`,
        projectTitle: project.title,
        statusColor: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
      });
    }
  }

  // Sort by timestamp descending (most recent first)
  entries.sort((a, b) => {
    if (a.timestamp > b.timestamp) return -1;
    if (a.timestamp < b.timestamp) return 1;
    return 0;
  });

  return entries;
}

function DecisionLogTab({ projects }: { projects: Project[] }) {
  const entries = buildDecisionLog(projects);

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
        <ClipboardList className="h-10 w-10 mb-3 opacity-30" />
        <p className="text-base font-medium">No decisions recorded yet.</p>
        <p className="text-sm mt-1">Project lifecycle events will appear here as they happen.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map((entry) => (
        <Card key={entry.id} className="border-l-4" style={{ borderLeftColor: 'var(--primary)' }}>
          <CardContent className="py-3 px-4">
            <div className="flex flex-col sm:flex-row sm:items-start gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${entry.statusColor}`}>
                    {entry.title}
                  </span>
                  <span className="text-xs font-medium text-muted-foreground truncate">
                    {entry.projectTitle}
                  </span>
                </div>
                <p className="text-sm text-foreground">{entry.description}</p>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0 mt-1 sm:mt-0">
                <Clock className="h-3 w-3" />
                <span>
                  {entry.type === 'project_completed' && entry.timestamp > 1000n
                    ? formatTimestamp(entry.timestamp)
                    : `Project #${entry.id.split('-').pop()}`}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { data: userProfile } = useGetCallerUserProfile();
  const { data: projects = [], isLoading: projectsLoading } = useGetProjects();
  const [activeTab, setActiveTab] = useState('all');

  const pledgingProjects = projects.filter((p) => p.status === 'pledging');
  const activeProjects = projects.filter((p) => p.status === 'active');
  const completedProjects = projects.filter((p) => p.status === 'completed');

  const participationLevelLabel = userProfile?.participationLevel
    ? PARTICIPATION_LEVEL_LABELS[userProfile.participationLevel] ?? String(userProfile.participationLevel)
    : null;

  const participationLevelColor = userProfile?.participationLevel
    ? PARTICIPATION_LEVEL_COLORS[userProfile.participationLevel] ?? 'text-foreground'
    : 'text-foreground';

  return (
    <div className="container py-8">
      {/* Four Scorecards */}
      <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Participation Level & Voting Power */}
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Participation Level</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${participationLevelColor}`}>
              {participationLevelLabel || '—'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Voting Power:{' '}
              <span className="font-semibold text-foreground">
                {userProfile?.votingPower.toFixed(1) ?? '0.0'}
              </span>
            </p>
          </CardContent>
        </Card>

        {/* Earned HH */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Earned HH</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userProfile?.totalEarnedHH.toFixed(1) || '0.0'}</div>
            <p className="text-xs text-muted-foreground">Economic Potential</p>
          </CardContent>
        </Card>

        {/* Reputation */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Reputation</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {userProfile?.overallReputationScore.toFixed(2) || '0.00'} ★
            </div>
            <p className="text-xs text-muted-foreground">Peer-weighted score</p>
          </CardContent>
        </Card>

        {/* Enabler Points */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Enabler Points</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {userProfile ? Number(userProfile.totalEnablerPoints) : 0}
            </div>
            <p className="text-xs text-muted-foreground">C-Score (Coming Soon)</p>
          </CardContent>
        </Card>
      </div>

      {/* Projects + Decision Log Section */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Projects</h2>
        <CreateProjectDialog />
      </div>

      {projectsLoading ? (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-full mt-2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-1/2 mb-2" />
                  <Skeleton className="h-2 w-full mb-4" />
                  <Skeleton className="h-8 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">All ({projects.length})</TabsTrigger>
            <TabsTrigger value="pledging">Pledging ({pledgingProjects.length})</TabsTrigger>
            <TabsTrigger value="active">Active ({activeProjects.length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({completedProjects.length})</TabsTrigger>
            <TabsTrigger value="decisions" className="flex items-center gap-1.5">
              <ClipboardList className="h-3.5 w-3.5" />
              Decision Log
              {projects.length > 0 && (
                <Badge variant="secondary" className="h-4 px-1 text-xs ml-0.5">
                  {buildDecisionLog(projects).length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            <ProjectsTab projects={projects} />
          </TabsContent>

          <TabsContent value="pledging" className="mt-6">
            <ProjectsTab projects={pledgingProjects} />
          </TabsContent>

          <TabsContent value="active" className="mt-6">
            <ProjectsTab projects={activeProjects} />
          </TabsContent>

          <TabsContent value="completed" className="mt-6">
            <ProjectsTab projects={completedProjects} />
          </TabsContent>

          <TabsContent value="decisions" className="mt-6">
            <DecisionLogTab projects={projects} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
