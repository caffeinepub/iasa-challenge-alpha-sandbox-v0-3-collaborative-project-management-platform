import React, { useState } from 'react';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useActor } from '../hooks/useActor';
import {
  useIsCallerAdmin,
  useIsCallerApproved,
  useGetCallerUserProfile,
  useRequestApproval,
} from '../hooks/useQueries';
import LoginScreen from './LoginScreen';
import Dashboard from './Dashboard';
import Header from './Header';
import Footer from './Footer';
import AdminPanel from './AdminPanel';
import ProfileSetupModal from './ProfileSetupModal';
import { Loader2, Clock, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function MainApp() {
  const { identity, isInitializing } = useInternetIdentity();
  const { isFetching: actorFetching } = useActor();
  const isAuthenticated = !!identity;

  const { data: isAdmin, isLoading: adminLoading } = useIsCallerAdmin();
  const { data: isApproved, isLoading: approvedLoading } = useIsCallerApproved();
  const {
    data: userProfile,
    isLoading: profileLoading,
    isFetched,
    error: profileError,
    refetch: refetchProfile,
  } = useGetCallerUserProfile();

  const requestApproval = useRequestApproval();
  const [approvalRequested, setApprovalRequested] = useState(false);

  // Step 1: Internet Identity is initializing
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Initializing...</p>
        </div>
      </div>
    );
  }

  // Step 2: Not authenticated → show login screen
  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  // Step 3: Actor is being fetched
  if (actorFetching) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Connecting to backend...</p>
        </div>
      </div>
    );
  }

  // Step 4: Checking admin/approval status
  if (adminLoading || approvedLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Verifying access...</p>
        </div>
      </div>
    );
  }

  // Step 5: Not admin and not approved
  if (!isAdmin && !isApproved) {
    // If the user has no profile yet, show the profile setup modal first
    // so they can register (which is allowed for any authenticated user)
    // before requesting approval.
    const showProfileSetupForNewUser =
      !profileLoading && isFetched && userProfile === null;

    const handleRequestApproval = async () => {
      try {
        await requestApproval.mutateAsync();
        setApprovalRequested(true);
        toast.success(
          'Access request sent! The administrator will review your request shortly.'
        );
      } catch (error: any) {
        const msg = error?.message ?? '';
        if (msg.includes('Only registered users') || msg.includes('registered/authenticated')) {
          toast.info(
            'Please complete your profile registration first, then request approval.'
          );
        } else if (msg.includes('already')) {
          setApprovalRequested(true);
          toast.info('Your access request is already pending review.');
        } else {
          toast.error(msg || 'Failed to send approval request. Please try again.');
        }
      }
    };

    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center space-y-6">
            {approvalRequested ? (
              <>
                <div className="flex justify-center">
                  <CheckCircle className="h-16 w-16 text-green-500" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">Request Sent!</h2>
                <p className="text-muted-foreground">
                  Your access request has been submitted. The administrator will review
                  it shortly. Please check back later.
                </p>
              </>
            ) : (
              <>
                <div className="flex justify-center">
                  <Clock className="h-16 w-16 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">
                  Pending Administrator Approval
                </h2>
                <p className="text-muted-foreground">
                  {showProfileSetupForNewUser
                    ? 'Please complete your profile setup first, then request access to the IASA Challenge platform.'
                    : 'Your account is pending administrator approval. Click below to request access to the IASA Challenge platform.'}
                </p>
                <Button
                  onClick={handleRequestApproval}
                  disabled={requestApproval.isPending || showProfileSetupForNewUser}
                  className="w-full"
                >
                  {requestApproval.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending Request...
                    </>
                  ) : (
                    'Request Access'
                  )}
                </Button>
              </>
            )}
          </div>
        </main>
        <Footer />

        {/* Show profile setup modal for new users who haven't registered yet */}
        {showProfileSetupForNewUser && (
          <ProfileSetupModal
            open={true}
            onComplete={() => {
              refetchProfile();
            }}
          />
        )}
      </div>
    );
  }

  // Step 6: Profile error (only for approved/admin users)
  if (profileError && isFetched) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-6 max-w-sm text-center">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Failed to Load Profile
            </h2>
            <p className="text-muted-foreground text-sm">
              There was an error loading your profile. Please try again.
            </p>
          </div>
          <Button onClick={() => refetchProfile()} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // Step 7: Profile is loading (for approved/admin users)
  if (profileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Loading your profile...</p>
        </div>
      </div>
    );
  }

  // Step 8: Profile setup for approved/admin users who haven't set up their profile
  const showProfileSetup = isAuthenticated && !profileLoading && isFetched && userProfile === null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1">
        <AdminPanel />
        <Dashboard />
      </main>
      <Footer />

      {showProfileSetup && (
        <ProfileSetupModal
          open={true}
          onComplete={() => {
            refetchProfile();
          }}
        />
      )}
    </div>
  );
}
