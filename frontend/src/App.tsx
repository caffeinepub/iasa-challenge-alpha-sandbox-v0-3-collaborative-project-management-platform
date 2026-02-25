import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { InternetIdentityProvider } from './hooks/useInternetIdentity';
import { Toaster } from '@/components/ui/sonner';
import MainApp from './components/MainApp';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        <InternetIdentityProvider>
          <MainApp />
          <Toaster />
        </InternetIdentityProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
