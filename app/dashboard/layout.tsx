"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Truck, Route, Wrench, FileText, Bell, Search, User } from "lucide-react";
import { ChatWidget } from "@/components/chatbot/ChatWidget";

const SIDEBAR_ITEMS = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Flotilla", href: "/dashboard/flotilla", icon: Truck },
  { name: "Rutas", href: "/dashboard/rutas", icon: Route },
  { name: "Mantenimiento", href: "/dashboard/mantenimiento", icon: Wrench },
  { name: "Reportes", href: "/dashboard/reportes", icon: FileText },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden text-foreground">
      {/* Sidebar Oscuro y Angosto */}
      <aside className="w-24 bg-sidebar border-r border-sidebar-border flex flex-col items-center py-6 shrink-0">
        <div className="mb-10 w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center">
          <Truck className="w-6 h-6 text-primary" />
        </div>
        <nav className="flex flex-col gap-6 w-full px-2">
          {SIDEBAR_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl transition-colors ${
                  isActive
                    ? "bg-primary/20 text-primary"
                    : "text-muted-foreground hover:bg-card hover:text-foreground"
                }`}
              >
                <Icon className="w-6 h-6 mb-1" />
                <span className="text-[10px] font-medium tracking-wide">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Área Principal */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Topbar */}
        <header className="h-20 border-b border-border bg-background flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar unidad, ruta o conductor..."
                className="w-full h-10 pl-10 pr-4 bg-input/50 rounded-full border-none focus:ring-1 focus:ring-primary text-sm text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>
          <div className="flex items-center gap-6">
            <button className="relative text-muted-foreground hover:text-foreground transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-destructive rounded-full border border-background"></span>
            </button>
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-end">
                <span className="text-sm font-medium">Administrador</span>
                <span className="text-xs text-muted-foreground">Admin Mode</span>
              </div>
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
            </div>
          </div>
        </header>

        {/* Contenido de cada página */}
        <main className="flex-1 overflow-y-auto p-8">
          {children}
        </main>
      </div>
      <ChatWidget />
    </div>
  );
}
