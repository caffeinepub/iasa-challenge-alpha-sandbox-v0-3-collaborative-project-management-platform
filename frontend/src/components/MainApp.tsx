import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useGetCallerUserProfile } from '../hooks/useQueries';
import LoginScreen from './LoginScreen';
import ProfileSetupModal from './ProfileSetupModal';
import Dashboard from './Dashboard';
import Header from './Header';
import Footer from './Footer';

export default function MainApp() {
  const { identity, isInitializing } = useInternetIdentity();
  const { data: userProfile, isLoading: profileLoading, isFetched } = useGetCallerUserProfile();

  const isAuthenticated = !!identity;

  if (isInitializing) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="text-muted-foreground">Initializing...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  const showProfileSetup = isAuthenticated && !profileLoading && isFetched && userProfile === null;

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Dashboard />
      </main>
      <Footer />
      {showProfileSetup && <ProfileSetupModal />}
    </div>
  );
}
