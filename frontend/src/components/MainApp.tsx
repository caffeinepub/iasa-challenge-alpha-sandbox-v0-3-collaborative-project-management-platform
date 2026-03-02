import { useInternetIdentity } from '../hooks/useInternetIdentity';
import {
  useGetCallerUserProfile,
  useGetCurrentUserStatus,
  useDoesCallerUserProfileExist,
} from '../hooks/useQueries';
import { useActor } from '../hooks/useActor';
import { Variant_admin_regular } from '../backend';
import LoginScreen from './LoginScreen';
import ProfileSetupModal from './ProfileSetupModal';
import Dashboard from './Dashboard';
import Header from './Header';
import Footer from './Footer';
import AdminPanel from './AdminPanel';

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

  const isAuthenticated = !!identity;

  // Check if user is admin
  const {
    data: userStatus,
    isLoading: statusLoading,
  } = useGetCurrentUserStatus();

  const isAdmin = userStatus === Variant_admin_regular.admin;

  // Load the full profile (used by Header and Dashboard)
  const {
    isLoading: profileLoading,
  } = useGetCallerUserProfile(isAuthenticated && !actorFetching);

  // Authoritative existence check — uses doesCallerUserProfileExist()
  // which is a simple boolean query with no authorization trap.
  // On error it defaults to `true` (profile assumed to exist) to avoid
  // incorrectly showing the setup modal to pre-existing users.
  const {
    data: profileExists,
    isLoading: existenceLoading,
    isFetched: existenceFetched,
  } = useDoesCallerUserProfileExist();

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

  // 4. Checking user status / profile existence
  if (statusLoading || profileLoading || existenceLoading) {
    return <LoadingScreen message="Loading..." />;
  }

  // 5. Show profile setup modal only when we have confirmed the user has NO profile.
  //    profileExists === false means the backend explicitly confirmed no profile exists.
  //    If existenceFetched is false (query hasn't resolved yet), we don't show the modal.
  const showProfileSetup = isAuthenticated && existenceFetched && profileExists === false;

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
