import { useState } from 'react';
import { Project, PeerRating } from '../backend';
import { useRatePeer, useGetUserProfile } from '../hooks/useQueries';
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Rate Project Participants</CardTitle>
          <CardDescription>
            Rate your fellow participants' contributions. You have 7 days after project completion.
            Mentor ratings carry 3x weight.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="peer">Select Participant</Label>
              <Select
                value={selectedPeer}
                onValueChange={setSelectedPeer}
                disabled={ratePeer.isPending}
              >
                <SelectTrigger id="peer">
                  <SelectValue placeholder="Choose a participant to rate" />
                </SelectTrigger>
                <SelectContent>
                  {otherParticipants.map((participant) => (
                    <ParticipantOption
                      key={participant.toString()}
                      principal={participant}
                    />
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
    </div>
  );
}

function ParticipantOption({ principal }: { principal: Principal }) {
  const { data: userProfile } = useGetUserProfile(principal);

  return (
    <SelectItem value={principal.toString()}>
      <div className="flex items-center gap-2">
        <span>{principal.toString().slice(0, 16)}...</span>
        {userProfile && (
          <Badge variant="secondary" className="text-xs">
            {userProfile.squadRole}
          </Badge>
        )}
      </div>
    </SelectItem>
  );
}
