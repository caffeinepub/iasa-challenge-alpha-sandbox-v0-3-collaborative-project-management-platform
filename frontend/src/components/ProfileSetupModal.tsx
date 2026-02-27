import { useState } from 'react';
import { useRegisterUser } from '../hooks/useQueries';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ParticipationLevel, SquadRole } from '../backend';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Users, Briefcase, Crown, Palette } from 'lucide-react';

interface ParticipationLevelOption {
  value: ParticipationLevel;
  label: string;
  subtitle: string;
  votingPower: number;
  icon: React.ReactNode;
  compatibleRoles: SquadRole[];
}

const PARTICIPATION_LEVELS: ParticipationLevelOption[] = [
  {
    value: ParticipationLevel.Apprentice,
    label: 'Apprentice',
    subtitle: 'Student or young professional',
    votingPower: 0,
    icon: <Users className="h-5 w-5" />,
    compatibleRoles: [SquadRole.Apprentice, SquadRole.Journeyman],
  },
  {
    value: ParticipationLevel.Journeyman,
    label: 'Journeyman',
    subtitle: 'Project leader',
    votingPower: 1,
    icon: <Briefcase className="h-5 w-5" />,
    compatibleRoles: [SquadRole.Apprentice, SquadRole.Journeyman, SquadRole.Masters],
  },
  {
    value: ParticipationLevel.Master,
    label: 'Master',
    subtitle: 'Senior professional',
    votingPower: 3,
    icon: <Crown className="h-5 w-5" />,
    compatibleRoles: [SquadRole.Apprentice, SquadRole.Journeyman, SquadRole.Masters, SquadRole.Mentor],
  },
  {
    value: ParticipationLevel.GuestArtist,
    label: 'Guest Artist',
    subtitle: 'External professional / Mentor',
    votingPower: 4,
    icon: <Palette className="h-5 w-5" />,
    compatibleRoles: [SquadRole.Mentor],
  },
];

// Derive the default squad role for a given participation level
function getDefaultRoleForLevel(level: ParticipationLevel): SquadRole {
  switch (level) {
    case ParticipationLevel.Apprentice:
      return SquadRole.Apprentice;
    case ParticipationLevel.Journeyman:
      return SquadRole.Journeyman;
    case ParticipationLevel.Master:
      return SquadRole.Masters;
    case ParticipationLevel.GuestArtist:
      return SquadRole.Mentor;
  }
}

const ROLE_LABELS: Record<SquadRole, string> = {
  [SquadRole.Apprentice]: 'Team Player (Apprentice)',
  [SquadRole.Journeyman]: 'Team Player / Project Manager',
  [SquadRole.Masters]: 'Project Manager (PM)',
  [SquadRole.Mentor]: 'Mentor / Product Owner',
};

export default function ProfileSetupModal() {
  const [username, setUsername] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<ParticipationLevel | null>(null);
  const [squadRole, setSquadRole] = useState<SquadRole | null>(null);
  const registerUser = useRegisterUser();

  const handleLevelSelect = (level: ParticipationLevel) => {
    setSelectedLevel(level);
    // Auto-select the default role for this level
    setSquadRole(getDefaultRoleForLevel(level));
  };

  const selectedLevelOption = PARTICIPATION_LEVELS.find((l) => l.value === selectedLevel);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim()) {
      toast.error('Please enter a username');
      return;
    }

    if (!selectedLevel) {
      toast.error('Please select your participation level');
      return;
    }

    if (!squadRole) {
      toast.error('Please select your role');
      return;
    }

    try {
      await registerUser.mutateAsync({
        username: username.trim(),
        role: squadRole,
        participationLevel: selectedLevel,
      });
      toast.success('Profile created successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create profile');
    }
  };

  return (
    <Dialog open={true}>
      <DialogContent
        className="sm:max-w-lg max-h-[90vh] overflow-y-auto"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Welcome to IASA Challenge!</DialogTitle>
          <DialogDescription>
            Set up your profile to get started. Your participation level determines your initial voting
            power and cannot be changed after registration (only an Administrator can modify it).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Username */}
          <div className="space-y-2">
            <Label htmlFor="username">Username *</Label>
            <Input
              id="username"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={registerUser.isPending}
            />
          </div>

          {/* Participation Level */}
          <div className="space-y-2">
            <Label>Participation Level *</Label>
            <p className="text-xs text-muted-foreground">
              Once selected, only an Administrator can change your level.
            </p>
            <div className="grid grid-cols-1 gap-2">
              {PARTICIPATION_LEVELS.map((option) => {
                const isSelected = selectedLevel === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    disabled={registerUser.isPending}
                    onClick={() => handleLevelSelect(option.value)}
                    className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-all hover:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                      isSelected
                        ? 'border-primary bg-primary/10 ring-1 ring-primary'
                        : 'border-border bg-background'
                    }`}
                  >
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${
                        isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {option.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{option.label}</span>
                        <Badge variant={isSelected ? 'default' : 'outline'} className="text-xs">
                          VP: {option.votingPower}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{option.subtitle}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Role selector — shown only after level is selected */}
          {selectedLevelOption && (
            <div className="space-y-2">
              <Label>Role *</Label>
              <p className="text-xs text-muted-foreground">
                Available roles for <strong>{selectedLevelOption.label}</strong>:
              </p>
              <div className="grid grid-cols-1 gap-2">
                {selectedLevelOption.compatibleRoles.map((role) => {
                  const isRoleSelected = squadRole === role;
                  return (
                    <button
                      key={role}
                      type="button"
                      disabled={registerUser.isPending}
                      onClick={() => setSquadRole(role)}
                      className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-all hover:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                        isRoleSelected
                          ? 'border-primary bg-primary/10 ring-1 ring-primary'
                          : 'border-border bg-background'
                      }`}
                    >
                      <div
                        className={`h-3 w-3 shrink-0 rounded-full border-2 ${
                          isRoleSelected ? 'border-primary bg-primary' : 'border-muted-foreground'
                        }`}
                      />
                      <span className="text-sm font-medium">{ROLE_LABELS[role]}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={registerUser.isPending || !selectedLevel || !squadRole}
          >
            {registerUser.isPending ? 'Creating Profile...' : 'Create Profile'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
