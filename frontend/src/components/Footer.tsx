import { Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t bg-muted/30 py-6">
      <div className="container text-center text-sm text-muted-foreground">
        <p className="flex items-center justify-center gap-1 mb-1">
          © 2025. Built with <Heart className="h-4 w-4 fill-red-500 text-red-500" /> using{' '}
          <a
            href="https://caffeine.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-foreground hover:underline"
          >
            caffeine.ai
          </a>
        </p>
        <p className="text-xs">
          IASA Challenge (Alpha Sandbox) v0.3
        </p>
      </div>
    </footer>
  );
}
