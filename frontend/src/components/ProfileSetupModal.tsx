import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, User, Star, Zap, Award, Palette } from 'lucide-react';
import { toast } from 'sonner';
import { useRegisterUser } from '../hooks/useQueries';
import { ParticipationLevel, SquadRole } from '../backend';

interface ProfileSetupModalProps {
  open: boolean;
  onComplete: () => void;
}

const PARTICIPATION_LEVELS: {
  value: ParticipationLevel;
  label: string;
  description: string;
  votingPower: number;
  icon: React.ReactNode;
  color: string;
}[] = [
  {
    value: ParticipationLevel.Apprentice,
    label: 'Apprentice',
    description: 'Learning the ropes. No voting power yet.',
    votingPower: 0,
    icon: <Star className="h-4 w-4" />,
    color: 'bg-muted text-muted-foreground',
  },
  {
    value: ParticipationLevel.Journeyman,
    label: 'Journeyman',
    description: 'Active contributor with basic voting rights.',
    votingPower: 1,
    icon: <Zap className="h-4 w-4" />,
    color: 'bg-primary/10 text-primary',
  },
  {
    value: ParticipationLevel.Master,
    label: 'Master',
    description: 'Experienced member with strong voting influence.',
    votingPower: 3,
    icon: <Award className="h-4 w-4" />,
    color: 'bg-accent/10 text-accent',
  },
  {
    value: ParticipationLevel.GuestArtist,
    label: 'Guest Artist',
    description: 'External expert with highest voting power.',
    votingPower: 4,
    icon: <Palette className="h-4 w-4" />,
    color: 'bg-secondary/20 text-secondary-foreground',
  },
];

// Role options filtered by participation level
const ROLE_OPTIONS: {
  value: SquadRole;
  label: string;
  description: string;
  compatibleLevels: ParticipationLevel[];
}[] = [
  {
    value: SquadRole.Apprentice,
    label: 'Team Player (Apprentice)',
    description: 'Contribute to tasks and learn from the team.',
    compatibleLevels: [
      ParticipationLevel.Apprentice,
      ParticipationLevel.Journeyman,
      ParticipationLevel.Master,
    ],
  },
  {
    value: SquadRole.Journeyman,
    label: 'Team Player (Journeyman)',
    description: 'Take on more responsibility and mentor others.',
    compatibleLevels: [
      ParticipationLevel.Apprentice,
      ParticipationLevel.Journeyman,
      ParticipationLevel.Master,
    ],
  },
  {
    value: SquadRole.Masters,
    label: 'Project Manager (PM)',
    description: 'Lead projects and manage the team.',
    compatibleLevels: [ParticipationLevel.Journeyman, ParticipationLevel.Master],
  },
  {
    value: SquadRole.Mentor,
    label: 'Mentor / Product Owner',
    description: 'Guide the team and sign off on deliverables.',
    compatibleLevels: [ParticipationLevel.Master, ParticipationLevel.GuestArtist],
  },
];

export default function ProfileSetupModal({ open, onComplete }: ProfileSetupModalProps) {
  const [username, setUsername] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<ParticipationLevel | null>(null);
  const [selectedRole, setSelectedRole] = useState<SquadRole | null>(null);

  const registerUser = useRegisterUser();

  const compatibleRoles = selectedLevel
    ? ROLE_OPTIONS.filter((r) => r.compatibleLevels.includes(selectedLevel))
    : [];

  const handleLevelChange = (level: ParticipationLevel) => {
    setSelectedLevel(level);
    // Reset role if it's no longer compatible
    if (selectedRole) {
      const roleOption = ROLE_OPTIONS.find((r) => r.value === selectedRole);
      if (roleOption && !roleOption.compatibleLevels.includes(level)) {
        setSelectedRole(null);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      toast.error('Please enter a username.');
      return;
    }
    if (!selectedLevel) {
      toast.error('Please select a participation level.');
      return;
    }
    if (!selectedRole) {
      toast.error('Please select a squad role.');
      return;
    }

    try {
      await registerUser.mutateAsync({
        username: username.trim(),
        role: selectedRole,
        participationLevel: selectedLevel,
      });
      toast.success('Profile created successfully!');
      onComplete();
    } catch (error: any) {
      const msg = error?.message ?? '';
      if (msg.includes('already registered')) {
        toast.info('Profile already exists.');
        onComplete();
      } else {
        toast.error(msg || 'Failed to create profile. Please try again.');
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-lg max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Set Up Your Profile
          </DialogTitle>
          <DialogDescription>
            Create your IASA Challenge profile to get started. Your participation level
            will be locked after registration.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-2">
          {/* Username */}
          <div className="space-y-2">
            <Label htmlFor="username">Display Name</Label>
            <Input
              id="username"
              placeholder="Enter your name or handle"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={registerUser.isPending}
              maxLength={50}
            />
          </div>

          {/* Participation Level */}
          <div className="space-y-2">
            <Label>Participation Level</Label>
            <p className="text-xs text-muted-foreground">
              This determines your voting power and available roles. Choose carefully —
              it can only be changed by an administrator later.
            </p>
            <div className="grid grid-cols-1 gap-2">
              {PARTICIPATION_LEVELS.map((level) => (
                <button
                  key={level.value}
                  type="button"
                  onClick={() => handleLevelChange(level.value)}
                  disabled={registerUser.isPending}
                  className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                    selectedLevel === level.value
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  }`}
                >
                  <span className={`p-1.5 rounded-md ${level.color}`}>
                    {level.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{level.label}</span>
                      <Badge variant="outline" className="text-xs">
                        {level.votingPower}x vote
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {level.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Squad Role */}
          {selectedLevel && (
            <div className="space-y-2">
              <Label>Squad Role</Label>
              <p className="text-xs text-muted-foreground">
                Select a role compatible with your participation level.
              </p>
              <div className="grid grid-cols-1 gap-2">
                {compatibleRoles.map((role) => (
                  <button
                    key={role.value}
                    type="button"
                    onClick={() => setSelectedRole(role.value)}
                    disabled={registerUser.isPending}
                    className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-all ${
                      selectedRole === role.value
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-border hover:border-primary/50 hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-sm">{role.label}</span>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {role.description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={
              registerUser.isPending ||
              !username.trim() ||
              !selectedLevel ||
              !selectedRole
            }
          >
            {registerUser.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Profile...
              </>
            ) : (
              'Create Profile'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
