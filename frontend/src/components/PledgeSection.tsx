import { useState } from 'react';
import { Project } from '../backend';
import { useGetPledges, usePledgeHH, useGetUserProfile } from '../hooks/useQueries';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface PledgeSectionProps {
  project: Project;
}

export default function PledgeSection({ project }: PledgeSectionProps) {
  const [pledgeAmount, setPledgeAmount] = useState('');
  const { data: pledges = [] } = useGetPledges(project.id);
  const pledgeHH = usePledgeHH();
  const { identity } = useInternetIdentity();

  const handlePledge = async (e: React.FormEvent) => {
    e.preventDefault();

    const amount = parseFloat(pledgeAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid pledge amount');
      return;
    }

    try {
      await pledgeHH.mutateAsync({
        projectId: project.id,
        pledgedHH: amount,
      });
      toast.success(`Successfully pledged ${amount} HH!`);
      setPledgeAmount('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to pledge HH');
    }
  };

  const canPledge = project.status === 'pledging';

  return (
    <div className="space-y-6">
      {canPledge && (
        <Card>
          <CardHeader>
            <CardTitle>Pledge Human Hours</CardTitle>
            <CardDescription>
              Commit your time to this project. Once the target is reached, the project becomes active.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePledge} className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="pledgeAmount" className="sr-only">
                  Pledge Amount
                </Label>
                <Input
                  id="pledgeAmount"
                  type="number"
                  step="0.1"
                  min="0.1"
                  placeholder="Enter HH to pledge"
                  value={pledgeAmount}
                  onChange={(e) => setPledgeAmount(e.target.value)}
                  disabled={pledgeHH.isPending}
                />
              </div>
              <Button type="submit" disabled={pledgeHH.isPending}>
                {pledgeHH.isPending ? 'Pledging...' : 'Pledge'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div>
        <h3 className="mb-4 text-lg font-semibold">Participants</h3>
        {pledges.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="text-muted-foreground">No pledges yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {pledges.map((pledge, index) => (
              <ParticipantRow key={index} pledge={pledge} currentUserPrincipal={identity?.getPrincipal().toString()} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ParticipantRow({ pledge, currentUserPrincipal }: { pledge: any; currentUserPrincipal?: string }) {
  const { data: userProfile } = useGetUserProfile(pledge.user);

  const getSquadRoleLabel = (role: string) => {
    return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
  };

  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <div className="flex items-center gap-3">
        <Avatar className="h-8 w-8">
          <AvatarFallback>
            {pledge.user.toString().slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <div className="text-sm font-medium">
            {pledge.user.toString() === currentUserPrincipal
              ? 'You'
              : `${pledge.user.toString().slice(0, 8)}...`}
          </div>
          {userProfile && (
            <Badge variant="secondary" className="text-xs mt-1">
              {getSquadRoleLabel(userProfile.squadRole)}
            </Badge>
          )}
        </div>
      </div>
      <div className="text-sm font-semibold">{pledge.pledgedHH.toFixed(1)} HH</div>
    </div>
  );
}
