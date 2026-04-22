import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { useAppStore } from "@/store/app";
import { Coins, Sparkles } from "lucide-react";

export function AppLayout({ children }: { children: ReactNode }) {
  const xp = useAppStore((s) => s.xp);
  const coins = useAppStore((s) => s.coins);
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-soft">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b border-border bg-card/80 backdrop-blur sticky top-0 z-30">
            <div className="flex items-center gap-3 pl-2">
              <SidebarTrigger />
              <div className="hidden sm:block text-xs text-muted-foreground font-mono tracking-wider">
                NEW DOMAIN CITY · 实时监测中
              </div>
            </div>
            <div className="flex items-center gap-3 pr-4">
              <div className="hidden sm:flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-primary-soft text-primary font-medium">
                <Sparkles className="h-3 w-3" />
                {xp} XP
              </div>
              <div className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-warning/15 text-warning-foreground font-medium">
                <Coins className="h-3 w-3" />
                {coins}
              </div>
            </div>
          </header>
          <main className="flex-1 p-4 sm:p-6 lg:p-8 animate-fade-in">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
