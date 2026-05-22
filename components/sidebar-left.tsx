"use client";

import * as React from "react";
import { Settings, FolderKanban, FolderCheck, Gauge, ChevronRight } from "lucide-react";
import { Sidebar, SidebarContent, SidebarHeader, SidebarFooter } from "@/components/ui/sidebar";
import { usePathname } from "next/navigation";

// ─── nav data ─────────────────────────────────────────────────────────────────

const navFavorites = [
  { name: "Dashboard", url: "/dashboard", icon: Gauge },
];

const navWorkspaces = [
  {
    name: "Tickets",
    icon: FolderKanban,
    pages: [{ name: "Receiving Tickets", url: "/tickets/received" }],
  },
  //{
    //name: "Service Catalogue",
    //icon: FolderCheck,
    //pages: [{ name: "Audit Logs", url: "/catalogue/services" }],
  //},
];

const navSecondary = [
  { title: "Settings", url: "/settings", icon: Settings },
];

// ─── helpers ──────────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3 mb-1 text-[9px] font-mono font-bold uppercase tracking-[0.25em] text-[#f97316]/60">
      {children}
    </p>
  );
}

function Divider() {
  return <div className="border-t border-[#2a2a1a] my-3 mx-3" />;
}

// ─── component ────────────────────────────────────────────────────────────────

export function SidebarLeft(props: React.ComponentProps<typeof Sidebar>) {
  const [userId, setUserId] = React.useState<string | null>(null);
  const [openSections, setOpenSections] = React.useState<Record<string, boolean>>({});
  const pathname = usePathname();

  React.useEffect(() => {
    const saved = localStorage.getItem("sidebarOpenSections");
    if (saved) setOpenSections(JSON.parse(saved));
  }, []);

  React.useEffect(() => {
    localStorage.setItem("sidebarOpenSections", JSON.stringify(openSections));
  }, [openSections]);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setUserId(params.get("id"));
  }, []);

  const withId = React.useCallback(
    (url: string) => {
      if (!userId || !url || url === "#") return url;
      return url.includes("?")
        ? `${url}&id=${encodeURIComponent(userId)}`
        : `${url}?id=${encodeURIComponent(userId)}`;
    },
    [userId]
  );

  const isActive = (url: string) => pathname?.startsWith(url.split("?")[0]);

  return (
    <Sidebar
      className="border-r bg-[#0d1117] font-mono" 
      {...props}
    >
      {/* ── Header / Logo ── */}
      <SidebarHeader className="border-b bg-[#0d1117]">
        <div className="flex items-center gap-3 px-3 py-4">
          <div
            className="flex items-center justify-center w-7 h-7 shrink-0 border font-mono font-bold text-[11px]"
            style={{
              backgroundColor: "rgba(251,146,60,0.1)",
              borderColor: "rgba(251,146,60,0.3)",
              color: "#fb923c",
            }}
          >
            H
          </div>
          <div>
            <p className="text-[11px] font-mono font-bold text-[#e5e5d0]/90 uppercase tracking-widest">
              Help Desk
            </p>
            <p className="text-[9px] font-mono text-[#6b6b4a]/50 uppercase tracking-[0.15em]">
              IT Ticketing System
            </p>
          </div>
        </div>
      </SidebarHeader>

      {/* ── Content ── */}
      <SidebarContent className="py-4 overflow-y-auto bg-[#0d1117]">

        {/* AGENTS / Favorites */}
        <SectionLabel>Agents</SectionLabel>
        <nav className="space-y-0.5 px-2 mb-1">
          {navFavorites.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.url);
            return (
              <a
                key={item.name}
                href={withId(item.url)}
                className={`flex items-center gap-2.5 px-3 py-2 transition-colors ${
                  active
                    ? "bg-[#1a1a0f] border-l-2 text-[#f97316]"
                    : "text-[#e5e5d0]/60 hover:bg-[#1a1a0f] hover:text-[#e5e5d0]/90 border-l-2 border-transparent"
                }`}
              >
                <span className={`w-1.5 h-1.5 shrink-0 ${active ? "bg-[#22c55e]" : "bg-[#2a2a1a]"}`} />
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="text-[10px] font-mono uppercase tracking-[0.15em]">{item.name}</span>
                {active && (
                  <span className="ml-auto text-[9px] font-mono text-[#22c55e] uppercase tracking-widest">
                    Active
                  </span>
                )}
              </a>
            );
          })}
        </nav>

        {/* WORKSPACES */}
        <SectionLabel>Workspaces</SectionLabel>
        <nav className="space-y-0.5 px-2 mb-1">
          {navWorkspaces.map((workspace) => {
            const WIcon = workspace.icon;
            const isOpen = !!openSections[workspace.name];
            const hasMultiple = workspace.pages.length > 1;
            const singleUrl = !hasMultiple ? withId(workspace.pages[0].url) : "#";
            const anyActive = workspace.pages.some((p) => isActive(p.url));

            return (
              <div key={workspace.name}>
                <div
                  className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors ${
                    anyActive && !hasMultiple
                      ? "bg-[#1a1a0f] border-l-2 border-[#f97316] text-[#f97316]"
                      : "text-[#e5e5d0]/60 hover:bg-[#1a1a0f] hover:text-[#e5e5d0]/90 border-l-2 border-transparent"
                  }`}
                  onClick={() => {
                    if (hasMultiple) {
                      setOpenSections((prev) => ({ ...prev, [workspace.name]: !prev[workspace.name] }));
                    } else {
                      window.location.href = singleUrl;
                    }
                  }}
                >
                  <span className={`w-1.5 h-1.5 shrink-0 ${anyActive ? "bg-[#22c55e]" : "bg-[#2a2a1a]"}`} />
                  <WIcon className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-[10px] font-mono uppercase tracking-[0.15em] flex-1">{workspace.name}</span>
                  {hasMultiple && (
                    <ChevronRight
                      className={`w-3 h-3 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}
                    />
                  )}
                  {anyActive && !hasMultiple && (
                    <span className="text-[9px] font-mono text-[#22c55e] uppercase tracking-widest">Active</span>
                  )}
                </div>

                {hasMultiple && isOpen && (
                  <div className="ml-6 border-l border-[#2a2a1a] space-y-0.5 mt-0.5">
                    {workspace.pages.map((page) => {
                      const active = isActive(page.url);
                      return (
                        <a
                          key={page.name}
                          href={withId(page.url)}
                          className={`flex items-center gap-2 pl-3 pr-3 py-1.5 transition-colors ${
                            active
                              ? "text-[#f97316] bg-[#1a1a0f]"
                              : "text-[#6b6b4a]/60 hover:text-[#e5e5d0]/80 hover:bg-[#1a1a0f]"
                          }`}
                        >
                          <span className={`w-1 h-1 shrink-0 ${active ? "bg-[#22c55e]" : "bg-[#2a2a1a]"}`} />
                          <span className="text-[9px] font-mono uppercase tracking-[0.15em]">{page.name}</span>
                          {active && (
                            <span className="ml-auto text-[9px] font-mono text-[#22c55e] uppercase tracking-widest">Active</span>
                          )}
                        </a>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* SYSTEM / Settings */}
        <SectionLabel>System</SectionLabel>
        <nav className="space-y-0.5 px-2">
          {navSecondary.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.url);
            return (
              <a
                key={item.title}
                href={withId(item.url)}
                className={`flex items-center gap-2.5 px-3 py-2 transition-colors ${
                  active
                    ? "bg-[#1a1a0f] border-l-2 border-[#f97316] text-[#f97316]"
                    : "text-[#e5e5d0]/60 hover:bg-[#1a1a0f] hover:text-[#e5e5d0]/90 border-l-2 border-transparent"
                }`}
              >
                <span className={`w-1.5 h-1.5 shrink-0 ${active ? "bg-[#22c55e]" : "bg-[#2a2a1a]"}`} />
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="text-[10px] font-mono uppercase tracking-[0.15em]">{item.title}</span>
              </a>
            );
          })}
        </nav>

      </SidebarContent>

      {/* ── Footer ── */}
      <SidebarFooter className="border-t border-[#2a2a1a] px-4 py-3 bg-[#0d1117]">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-[#22c55e]" />
          <span className="text-[9px] font-mono text-[#22c55e]/60 uppercase tracking-[0.2em]">
            System operational
          </span>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
