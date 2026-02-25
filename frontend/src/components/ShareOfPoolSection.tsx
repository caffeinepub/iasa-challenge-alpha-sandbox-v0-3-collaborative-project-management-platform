import { Project } from '../backend';
import { useGetTasks, useGetUserProfile } from '../hooks/useQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { DollarSign } from 'lucide-react';

interface ShareOfPoolSectionProps {
  project: Project;
}

export default function ShareOfPoolSection({ project }: ShareOfPoolSectionProps) {
  const { data: tasks = [] } = useGetTasks(project.id);

  // Calculate total earned HH and individual shares
  const completedTasks = tasks.filter((task) => task.status === 'completed');
  
  // Group tasks by assignee and calculate earned HH
  const participantEarnings = new Map<string, number>();
  
  completedTasks.forEach((task) => {
    if (task.assignee) {
      const assigneeStr = task.assignee.toString();
      const currentEarnings = participantEarnings.get(assigneeStr) || 0;
      participantEarnings.set(assigneeStr, currentEarnings + task.hhBudget);
    }
  });

  const totalEarnedHH = Array.from(participantEarnings.values()).reduce((sum, hh) => sum + hh, 0);

  // Calculate share of pool for each participant
  const participantShares = Array.from(participantEarnings.entries()).map(([principal, earnedHH]) => {
    const sharePercentage = totalEarnedHH > 0 ? (earnedHH / totalEarnedHH) * 100 : 0;
    const payoutCLP = totalEarnedHH > 0 ? (earnedHH / totalEarnedHH) * project.finalMonetaryValue : 0;
    
    return {
      principal,
      earnedHH,
      sharePercentage,
      payoutCLP,
    };
  });

  // Sort by earned HH descending
  participantShares.sort((a, b) => b.earnedHH - a.earnedHH);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Share of Pool Distribution</CardTitle>
          <CardDescription>
            Projected payouts based on earned Human Hours. Total pool: ${project.finalMonetaryValue.toFixed(2)} CLP
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm font-medium text-muted-foreground pb-2 border-b">
              <span>Participant</span>
              <div className="flex gap-8">
                <span>Earned HH</span>
                <span>Share</span>
                <span className="w-24 text-right">Payout (CLP)</span>
              </div>
            </div>
            
            {participantShares.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <p className="text-muted-foreground">No completed tasks yet</p>
              </div>
            ) : (
              participantShares.map((share) => (
                <ParticipantShareRow key={share.principal} share={share} />
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pool Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Earned HH</span>
              <span className="font-semibold">{totalEarnedHH.toFixed(1)} HH</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Pool Value</span>
              <span className="font-semibold">${project.finalMonetaryValue.toFixed(2)} CLP</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Active Participants</span>
              <span className="font-semibold">{participantShares.length}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ParticipantShareRow({ share }: { share: any }) {
  const { data: userProfile } = useGetUserProfile(share.principal);

  const getSquadRoleLabel = (role: string) => {
    return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
  };

  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <div className="flex items-center gap-3">
        <Avatar className="h-8 w-8">
          <AvatarFallback>
            {share.principal.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <div className="text-sm font-medium">
            {share.principal.slice(0, 8)}...
          </div>
          {userProfile && (
            <Badge variant="secondary" className="text-xs mt-1">
              {getSquadRoleLabel(userProfile.squadRole)}
            </Badge>
          )}
        </div>
      </div>
      <div className="flex items-center gap-8 text-sm">
        <span className="font-medium">{share.earnedHH.toFixed(1)} HH</span>
        <span className="text-muted-foreground">{share.sharePercentage.toFixed(1)}%</span>
        <div className="flex items-center gap-1 w-24 justify-end">
          <DollarSign className="h-3 w-3" />
          <span className="font-semibold">{share.payoutCLP.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
