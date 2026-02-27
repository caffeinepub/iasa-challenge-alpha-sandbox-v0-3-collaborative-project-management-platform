import { useState } from 'react';
import { useGetCallerUserProfile, useGetProjects } from '../hooks/useQueries';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Zap, Star, Award, Shield } from 'lucide-react';
import ProjectsTab from './ProjectsTab';
import CreateProjectDialog from './CreateProjectDialog';
import { ParticipationLevel } from '../backend';

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

      {/* Projects Section */}
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
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">All ({projects.length})</TabsTrigger>
            <TabsTrigger value="pledging">Pledging ({pledgingProjects.length})</TabsTrigger>
            <TabsTrigger value="active">Active ({activeProjects.length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({completedProjects.length})</TabsTrigger>
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
        </Tabs>
      )}
    </div>
  );
}
