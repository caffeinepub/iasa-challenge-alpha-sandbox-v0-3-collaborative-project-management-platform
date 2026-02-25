import { useState } from 'react';
import { useSaveCallerUserProfile } from '../hooks/useQueries';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SquadRole } from '../backend';
import { toast } from 'sonner';

export default function ProfileSetupModal() {
  const [username, setUsername] = useState('');
  const [profilePicture, setProfilePicture] = useState('');
  const [squadRole, setSquadRole] = useState<SquadRole>(SquadRole.Apprentice);
  const saveProfile = useSaveCallerUserProfile();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim()) {
      toast.error('Please enter a username');
      return;
    }

    try {
      await saveProfile.mutateAsync({
        friendlyUsername: username.trim(),
        profilePicture: profilePicture.trim() || `https://api.dicebear.com/7.x/initials/svg?seed=${username}`,
        totalPledgedHH: 0,
        totalEarnedHH: 0,
        overallReputationScore: 3.0,
        votingPower: 9.0,
        squadRole: squadRole,
      });
      toast.success('Profile created successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create profile');
    }
  };

  return (
    <Dialog open={true}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Welcome to IASA Challenge!</DialogTitle>
          <DialogDescription>
            Please set up your profile to get started.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username *</Label>
            <Input
              id="username"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={saveProfile.isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profilePicture">Profile Picture URL (optional)</Label>
            <Input
              id="profilePicture"
              placeholder="https://example.com/avatar.jpg"
              value={profilePicture}
              onChange={(e) => setProfilePicture(e.target.value)}
              disabled={saveProfile.isPending}
            />
            <p className="text-xs text-muted-foreground">
              Leave empty to use a default avatar
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="squadRole">Squad Role *</Label>
            <Select 
              value={squadRole} 
              onValueChange={(value) => setSquadRole(value as SquadRole)}
              disabled={saveProfile.isPending}
            >
              <SelectTrigger id="squadRole">
                <SelectValue placeholder="Select your squad role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SquadRole.Apprentice}>Apprentice</SelectItem>
                <SelectItem value={SquadRole.Journeyman}>Journeyman</SelectItem>
                <SelectItem value={SquadRole.Mentor}>Mentor</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Mentor ratings carry 3x weight in reputation calculations
            </p>
          </div>
          <Button type="submit" className="w-full" disabled={saveProfile.isPending}>
            {saveProfile.isPending ? 'Creating Profile...' : 'Create Profile'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
