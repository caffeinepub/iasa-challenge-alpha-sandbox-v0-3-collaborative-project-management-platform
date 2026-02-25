import { useState } from 'react';
import { Project } from '../backend';
import { useGetPeerRatings, useRatePeer, useGetUserProfile } from '../hooks/useQueries';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { Principal } from '@icp-sdk/core/principal';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Star } from 'lucide-react';
import { toast } from 'sonner';

interface PeerRatingSectionProps {
  project: Project;
}

export default function PeerRatingSection({ project }: PeerRatingSectionProps) {
  const [selectedPeer, setSelectedPeer] = useState<string>('');
  const [rating, setRating] = useState<string>('');
  const { data: ratings = [] } = useGetPeerRatings(project.id);
  const ratePeer = useRatePeer();
  const { identity } = useInternetIdentity();

  const currentUserPrincipal = identity?.getPrincipal().toString();

  // Get all participants except current user
  const allParticipants = [project.creator, ...project.participants];
  const otherParticipants = allParticipants.filter(
    (p) => p.toString() !== currentUserPrincipal
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPeer || !rating) {
      toast.error('Please select a peer and rating');
      return;
    }

    const ratingValue = parseFloat(rating);
    if (isNaN(ratingValue) || ratingValue < 0 || ratingValue > 5) {
      toast.error('Rating must be between 0 and 5');
      return;
    }

    try {
      await ratePeer.mutateAsync({
        ratee: Principal.fromText(selectedPeer),
        projectId: project.id,
        rating: ratingValue,
      });
      toast.success('Rating submitted successfully!');
      setSelectedPeer('');
      setRating('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit rating');
    }
  };

  const getSquadRoleLabel = (role: string) => {
    return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Rate Project Participants</CardTitle>
          <CardDescription>
            Rate your fellow participants' contributions. You have 7 days after project completion. Mentor ratings carry 3x weight.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="peer">Select Participant</Label>
              <Select value={selectedPeer} onValueChange={setSelectedPeer} disabled={ratePeer.isPending}>
                <SelectTrigger id="peer">
                  <SelectValue placeholder="Choose a participant to rate" />
                </SelectTrigger>
                <SelectContent>
                  {otherParticipants.map((participant) => (
                    <ParticipantOption key={participant.toString()} principal={participant.toString()} />
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rating">Rating (0-5 stars)</Label>
              <Select value={rating} onValueChange={setRating} disabled={ratePeer.isPending}>
                <SelectTrigger id="rating">
                  <SelectValue placeholder="Select rating" />
                </SelectTrigger>
                <SelectContent>
                  {[0, 1, 2, 3, 4, 5].map((value) => (
                    <SelectItem key={value} value={value.toString()}>
                      {value} {value === 1 ? 'star' : 'stars'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" disabled={ratePeer.isPending}>
              {ratePeer.isPending ? 'Submitting...' : 'Submit Rating'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div>
        <h3 className="mb-4 text-lg font-semibold">Rating History</h3>
        {ratings.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="text-muted-foreground">No ratings yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {ratings.map((rating, index) => (
              <RatingRow key={index} rating={rating} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ParticipantOption({ principal }: { principal: string }) {
  const { data: userProfile } = useGetUserProfile(principal);

  const getSquadRoleLabel = (role: string) => {
    return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
  };

  return (
    <SelectItem value={principal}>
      <div className="flex items-center gap-2">
        <span>{principal.slice(0, 16)}...</span>
        {userProfile && (
          <Badge variant="secondary" className="text-xs">
            {getSquadRoleLabel(userProfile.squadRole)}
          </Badge>
        )}
      </div>
    </SelectItem>
  );
}

function RatingRow({ rating }: { rating: any }) {
  const { data: raterProfile } = useGetUserProfile(rating.rater.toString());
  const { data: rateeProfile } = useGetUserProfile(rating.ratee.toString());

  const getSquadRoleLabel = (role: string) => {
    return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
  };

  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <div className="flex items-center gap-3">
        <Avatar className="h-8 w-8">
          <AvatarFallback>
            {rating.rater.toString().slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="text-sm">
          <div className="font-medium flex items-center gap-2">
            <span>{rating.rater.toString().slice(0, 8)}...</span>
            {raterProfile && (
              <Badge variant="secondary" className="text-xs">
                {getSquadRoleLabel(raterProfile.squadRole)}
              </Badge>
            )}
            <span className="text-muted-foreground">rated</span>
            <span>{rating.ratee.toString().slice(0, 8)}...</span>
            {rateeProfile && (
              <Badge variant="secondary" className="text-xs">
                {getSquadRoleLabel(rateeProfile.squadRole)}
              </Badge>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
        <span className="text-sm font-semibold">{rating.rating.toFixed(1)}</span>
      </div>
    </div>
  );
}
