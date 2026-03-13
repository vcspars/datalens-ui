export default function LandingFooter() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
        <div className="flex flex-col items-center text-center gap-2">
          <img src="/9.png" alt="SPARS lens" className="h-20 sm:h-24 w-auto object-contain" />
          <p className="text-sm text-muted-foreground max-w-2xl">
            Transform your documents and data into intelligent insights with AI-powered analysis and automation.
          </p>
          <p className="text-xs text-muted-foreground">
            &copy; 2026 SPARS Lens. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            Powered by <span className="text-primary font-medium">SPARS</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
