import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  LayoutDashboard,
  Package,
  Upload,
  Settings,
  LogOut,
  TrendingUp,
  BarChart3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/products", label: "Products", icon: Package },
    { href: "/demand-prediction", label: "Analysis", icon: TrendingUp },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-card border-r border-border flex flex-col fixed md:sticky top-0 z-50 h-auto md:h-screen">
        <div className="p-6">
          <Link href="/landing">
            <div className="flex items-center gap-2 mb-8 cursor-pointer hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
                <TrendingUp className="w-5 h-5" />
              </div>
              <span className="font-display font-bold text-xl tracking-tight">CommercialQ</span>
            </div>
          </Link>

          <nav className="space-y-2">
            {navItems.map((item) => {
              const isActive = location === item.href;
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href}>
                  <div className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer
                    ${isActive
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }
                  `}>
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto p-6">
          <Separator className="mb-6" />
          <div className="flex items-center gap-3 mb-4">
            <Avatar className="h-10 w-10 border border-border">
              <AvatarImage src={user?.profileImageUrl} />
              <AvatarFallback>{user?.firstName?.[0] || "U"}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive"
            onClick={() => logout()}
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 lg:p-10 overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-8">
          {children}
        </div>
      </main>
    </div>
  );
}
