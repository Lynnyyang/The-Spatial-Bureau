import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar, SidebarHeader,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard, Compass, Network, Grid3x3, Activity,
  FolderOpen, Trophy, Award, GraduationCap, Radar,
} from "lucide-react";

const main = [
  { title: "控制中心", url: "/", icon: LayoutDashboard },
  { title: "案件档案", url: "/cases", icon: FolderOpen },
];

const labs = [
  { title: "依赖性实验室", url: "/lab/dependency", icon: Compass },
  { title: "邻居中心", url: "/lab/neighbors", icon: Network },
  { title: "权重矩阵工坊", url: "/lab/weights", icon: Grid3x3 },
  { title: "自相关作战室", url: "/lab/autocorrelation", icon: Activity },
];

const profile = [
  { title: "训练营", url: "/training", icon: Radar },
  { title: "排行榜", url: "/leaderboard", icon: Trophy },
  { title: "成就", url: "/achievements", icon: Award },
  { title: "证书中心", url: "/certificate", icon: GraduationCap },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const isActive = (p: string) => (p === "/" ? location.pathname === "/" : location.pathname.startsWith(p));

  const renderItem = (item: { title: string; url: string; icon: React.ElementType }) => (
    <SidebarMenuItem key={item.url}>
      <SidebarMenuButton asChild isActive={isActive(item.url)}>
        <NavLink
          to={item.url}
          end={item.url === "/"}
          className="hover:bg-sidebar-accent transition-colors"
          activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
        >
          <item.icon className="h-4 w-4 shrink-0" />
          {!collapsed && <span>{item.title}</span>}
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-3">
          <div className="h-8 w-8 rounded-md bg-gradient-hero flex items-center justify-center shadow-glow">
            <Compass className="h-4 w-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="leading-tight">
              <div className="text-sm font-semibold">空间探案局</div>
              <div className="text-[10px] text-muted-foreground tracking-wider">SPATIAL DETECTIVE</div>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>主控</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{main.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>实验室</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{labs.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>个人</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{profile.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
