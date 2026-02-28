import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useGetCallerUserProfile, useGetCurrentUserStatus, useRequestApproval } from '../hooks/useQueries';
import { useActor } from '../hooks/useActor';
import { Variant_unapproved_admin_pending_approved } from '../backend';
import LoginScreen from './LoginScreen';
import ProfileSetupModal from './ProfileSetupModal';
import Dashboard from './Dashboard';
import Header from './Header';
import Footer from './Footer';
import AdminPanel from './AdminPanel';
import { Button } from '@/components/ui/button';
import { Shield, Clock, RefreshCw, LogIn } from 'lucide-react';
import { toast } from 'sonner';

// ── Step 1: Apply for Access ──────────────────────────────────────────────────
function ApplyForAccessScreen({ onApply, isApplying }: { onApply: () => void; isApplying: boolean }) {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="text-center max-w-md w-full">
          <div className="mx-auto mb-6 h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
            <LogIn className="h-10 w-10 text-primary" />
          </div>
          <h2 className="text-2xl font-bold mb-3">Request Access</h2>
          <p className="text-muted-foreground mb-2 text-sm leading-relaxed">
            Welcome to <strong>IASA Challenge</strong>. This platform is invite-only.
          </p>
          <p className="text-muted-foreground mb-8 text-sm leading-relaxed">
            Submit an access request and the administrator will review it. Once approved,
            you will have full access to the application.
          </p>

          {/* Steps */}
          <div className="mb-8 rounded-lg border bg-card p-4 text-left space-y-3">
            <div className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">1</span>
              <div>
                <p className="text-sm font-medium">Apply for access</p>
                <p className="text-xs text-muted-foreground">Click the button below to submit your request.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground text-xs font-bold">2</span>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Administrator approves</p>
                <p className="text-xs text-muted-foreground">The administrator reviews and approves your request.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground text-xs font-bold">3</span>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Access granted</p>
                <p className="text-xs text-muted-foreground">Log back in to access the full application.</p>
              </div>
            </div>
          </div>

          <Button
            onClick={onApply}
            disabled={isApplying}
            size="lg"
            className="gap-2 w-full sm:w-auto"
          >
            {isApplying ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Submitting request...
              </>
            ) : (
              <>
                <Shield className="h-4 w-4" />
                Apply for Access
              </>
            )}
          </Button>
        </div>
      </div>
      <Footer />
    </div>
  );
}

// ── Step 2: Pending Approval ──────────────────────────────────────────────────
function PendingApprovalScreen({ onCheckStatus, isChecking }: { onCheckStatus: () => void; isChecking: boolean }) {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="text-center max-w-md w-full">
          <div className="mx-auto mb-6 h-20 w-20 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <Clock className="h-10 w-10 text-amber-600 dark:text-amber-400" />
          </div>
          <h2 className="text-2xl font-bold mb-3">Awaiting Approval</h2>
          <p className="text-muted-foreground mb-2 text-sm leading-relaxed">
            Your access request has been submitted successfully.
          </p>
          <p className="text-muted-foreground mb-8 text-sm leading-relaxed">
            The administrator will review your request. Once approved, click the button below
            or log back in to access the application.
          </p>

          {/* Steps */}
          <div className="mb-8 rounded-lg border bg-card p-4 text-left space-y-3">
            <div className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-500 text-white text-xs font-bold">✓</span>
              <div>
                <p className="text-sm font-medium">Access requested</p>
                <p className="text-xs text-muted-foreground">Your request has been submitted.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-400 text-white text-xs font-bold">2</span>
              <div>
                <p className="text-sm font-medium">Administrator approves</p>
                <p className="text-xs text-muted-foreground">Waiting for the administrator to review your request.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground text-xs font-bold">3</span>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Access granted</p>
                <p className="text-xs text-muted-foreground">You will be able to enter the application once approved.</p>
              </div>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={onCheckStatus}
            disabled={isChecking}
            className="gap-2"
          >
            {isChecking ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Check approval status
          </Button>
        </div>
      </div>
      <Footer />
    </div>
  );
}

// ── Loading spinner ───────────────────────────────────────────────────────────
function LoadingScreen({ message }: { message: string }) {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
        <p className="text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function MainApp() {
  const { identity, isInitializing } = useInternetIdentity();
  const { isFetching: actorFetching } = useActor();

  // Single authoritative status query — replaces the dual isCallerAdmin + isCallerApproved checks
  const {
    data: userStatus,
    isLoading: statusLoading,
    refetch: refetchStatus,
    isFetching: statusFetching,
  } = useGetCurrentUserStatus();

  const isAuthenticated = !!identity;

  // Determine access from the single status value
  const hasAccess =
    userStatus === Variant_unapproved_admin_pending_approved.admin ||
    userStatus === Variant_unapproved_admin_pending_approved.approved;

  const isAdmin = userStatus === Variant_unapproved_admin_pending_approved.admin;

  const {
    data: userProfile,
    isLoading: profileLoading,
    isFetched,
    error: profileError,
    refetch: refetchProfile,
  } = useGetCallerUserProfile(hasAccess && !statusLoading);

  const requestApproval = useRequestApproval();

  const handleApply = async () => {
    try {
      await requestApproval.mutateAsync();
      toast.success('Access request submitted! The administrator will review it shortly.');
      // Refetch status so we immediately show the "pending" screen
      refetchStatus();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to submit access request. Please try again.');
    }
  };

  // 1. Initializing Internet Identity
  if (isInitializing) {
    return <LoadingScreen message="Initializing..." />;
  }

  // 2. Not authenticated → show login
  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  // 3. Actor still connecting
  if (actorFetching) {
    return <LoadingScreen message="Connecting to backend..." />;
  }

  // 4. Checking user status
  if (statusLoading) {
    return <LoadingScreen message="Verifying access..." />;
  }

  // 5. Unapproved: never applied → show "Apply for Access" screen (Step 1)
  if (userStatus === Variant_unapproved_admin_pending_approved.unapproved) {
    return (
      <ApplyForAccessScreen
        onApply={handleApply}
        isApplying={requestApproval.isPending}
      />
    );
  }

  // 6. Pending: applied but not yet approved → show "Awaiting Approval" screen (Step 2)
  if (userStatus === Variant_unapproved_admin_pending_approved.pending) {
    return (
      <PendingApprovalScreen
        onCheckStatus={() => refetchStatus()}
        isChecking={statusFetching}
      />
    );
  }

  // 7. Approved or admin — check profile loading
  if (profileError && isFetched) {
    return (
      <div className="flex h-screen items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <RefreshCw className="h-6 w-6 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Failed to Load Profile</h2>
          <p className="text-muted-foreground mb-4 text-sm">
            There was a problem loading your profile. Please try again.
          </p>
          <Button onClick={() => refetchProfile()} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // 8. Profile still loading
  if (profileLoading) {
    return <LoadingScreen message="Loading your profile..." />;
  }

  // 9. Show profile setup modal for new users (approved or admin with no profile yet)
  const showProfileSetup = isAuthenticated && !profileLoading && isFetched && userProfile === null;

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Dashboard />
        {isAdmin && <AdminPanel />}
      </main>
      <Footer />
      {showProfileSetup && <ProfileSetupModal />}
    </div>
  );
}
