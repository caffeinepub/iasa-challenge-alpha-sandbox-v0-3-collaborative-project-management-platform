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
import { LogOut, Star, Zap } from 'lucide-react';

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

  const getSquadRoleLabel = (role: string) => {
    return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
  };

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
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>My Scorecards</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="px-2 py-3 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Squad Role</span>
                  <Badge variant="outline">{getSquadRoleLabel(userProfile.squadRole)}</Badge>
                </div>
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
                  <span className="text-muted-foreground">Voting Power</span>
                  <span className="font-semibold">{userProfile.votingPower.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Pledged HH</span>
                  <span className="font-semibold">{userProfile.totalPledgedHH.toFixed(1)}</span>
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
