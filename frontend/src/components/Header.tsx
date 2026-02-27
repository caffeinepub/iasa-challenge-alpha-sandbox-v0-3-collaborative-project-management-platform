import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useGetCallerUserProfile } from '../hooks/useQueries';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { LogOut, Star, Zap, Shield } from 'lucide-react';
import { ParticipationLevel } from '../backend';

const PARTICIPATION_LEVEL_LABELS: Record<ParticipationLevel, string> = {
  [ParticipationLevel.Apprentice]: 'Apprentice',
  [ParticipationLevel.Journeyman]: 'Journeyman',
  [ParticipationLevel.Master]: 'Master',
  [ParticipationLevel.GuestArtist]: 'Guest Artist',
};

const PARTICIPATION_LEVEL_COLORS: Record<ParticipationLevel, string> = {
  [ParticipationLevel.Apprentice]: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  [ParticipationLevel.Journeyman]: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  [ParticipationLevel.Master]: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  [ParticipationLevel.GuestArtist]: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
};

export default function Header() {
  const { clear, identity } = useInternetIdentity();
  const { data: userProfile } = useGetCallerUserProfile();
  const queryClient = useQueryClient();

  const handleLogout = async () => {
    await clear();
    queryClient.clear();
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const participationLevelLabel = userProfile?.participationLevel
    ? PARTICIPATION_LEVEL_LABELS[userProfile.participationLevel] ?? userProfile.participationLevel
    : null;

  const participationLevelColor = userProfile?.participationLevel
    ? PARTICIPATION_LEVEL_COLORS[userProfile.participationLevel] ?? ''
    : '';

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src="https://grupoiasa.cl/wp-content/uploads/2024/05/GRUPO-IASA.png"
            alt="IASA Challenge (Alpha Sandbox) v0.3 Logo"
            className="h-10 w-10 object-contain"
          />
          <div>
            <h1 className="text-xl font-bold">IASA Challenge (Alpha Sandbox) v0.3</h1>
          </div>
        </div>

        {identity && userProfile && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={userProfile.profilePicture} alt={userProfile.friendlyUsername} />
                  <AvatarFallback>{getInitials(userProfile.friendlyUsername)}</AvatarFallback>
                </Avatar>
                <span className="hidden md:inline-block">{userProfile.friendlyUsername}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuLabel>My Profile</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="px-2 py-3 space-y-3">
                {/* Participation Level */}
                {participationLevelLabel && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Shield className="h-3.5 w-3.5" />
                      Level
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${participationLevelColor}`}
                    >
                      {participationLevelLabel}
                    </span>
                  </div>
                )}

                {/* Voting Power */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Voting Power</span>
                  <span className="font-bold text-primary">{userProfile.votingPower.toFixed(1)}</span>
                </div>

                <DropdownMenuSeparator />

                {/* Scorecards */}
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Zap className="h-4 w-4" />
                    Earned HH
                  </span>
                  <span className="font-semibold">{userProfile.totalEarnedHH.toFixed(1)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Star className="h-4 w-4" />
                    Reputation
                  </span>
                  <span className="font-semibold">{userProfile.overallReputationScore.toFixed(2)} ★</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Pledged HH</span>
                  <span className="font-semibold">{userProfile.totalPledgedHH.toFixed(1)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Squad Role</span>
                  <Badge variant="outline" className="text-xs">
                    {userProfile.squadRole}
                  </Badge>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
