"use client";

import { ChevronRight } from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";

export function NavWorkspaces({
  workspaces,
  openSections,
  onToggleSection,
}: {
  workspaces: {
    name: string;
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    url?: string;
    pages: {
      name: string;
      icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
      url: string;
    }[];
  }[];
  openSections: Record<string, boolean>;
  onToggleSection: (section: string) => void;
}) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Workspaces</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {workspaces.map((workspace) => {
            const WorkspaceIcon = workspace.icon;

            // If only one page, render single menu item without collapsible
            if (workspace.pages.length === 1) {
              const page = workspace.pages[0];
              const PageIcon = page.icon;

              // Use workspace.url if exists; else fallback to page.url
              const href = workspace.url || page.url;

              return (
                <SidebarMenuItem key={workspace.name}>
                  <SidebarMenuButton asChild>
                    <a href={href} className="flex items-center space-x-2">
                      <WorkspaceIcon className="w-5 h-5" />
                      <span>{workspace.name}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            }

            // Multiple pages: collapsible with submenu
            return (
              <Collapsible
                key={workspace.name}
                open={!!openSections[workspace.name]}
                onOpenChange={() => onToggleSection(workspace.name)}
              >
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <a href={workspace.url || "#"} className="flex items-center space-x-2">
                      <WorkspaceIcon className="w-5 h-5" />
                      <span>{workspace.name}</span>
                    </a>
                  </SidebarMenuButton>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuAction
                      className="bg-sidebar-accent text-sidebar-accent-foreground left-2 data-[state=open]:rotate-90"
                      showOnHover
                    >
                      <ChevronRight />
                    </SidebarMenuAction>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub className="pl-5">
                      {workspace.pages.map((page) => {
                        const PageIcon = page.icon;
                        return (
                          <SidebarMenuSubItem key={page.name}>
                            <SidebarMenuSubButton asChild>
                              <a href={page.url} className="flex items-center space-x-2">
                                {PageIcon && <PageIcon className="w-4 h-4" />}
                                <span>{page.name}</span>
                              </a>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        );
                      })}
                    </SidebarMenuSub>
                  </CollapsibleContent>

                </SidebarMenuItem>
              </Collapsible>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
