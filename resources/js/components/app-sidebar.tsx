import { Link } from '@inertiajs/react';
import {
    LayoutGrid,
    Users,
    Megaphone,
    Tags,
    Layers,
    Package,
    Activity,
    Database,
    Settings,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import type { NavItem } from '@/types';

const overviewNavItems: NavItem[] = [
    { title: 'Dashboard', href: '/dashboard', icon: LayoutGrid },
];

const crmNavItems: NavItem[] = [
    { title: 'Clientes', href: '/clientes', icon: Users },
    { title: 'Interacciones', href: '/interacciones', icon: Activity },
];

const outreachNavItems: NavItem[] = [
    { title: 'Campañas', href: '/campanas', icon: Megaphone },
    { title: 'Segmentos', href: '/segmentos', icon: Layers },
    { title: 'Tags', href: '/tags', icon: Tags },
];

const catalogNavItems: NavItem[] = [
    { title: 'Productos', href: '/productos', icon: Package },
];

const dataNavItems: NavItem[] = [
    { title: 'Imports', href: '/imports', icon: Database },
];

const accountNavItems: NavItem[] = [
    { title: 'Configuración', href: '/settings/profile', icon: Settings },
];

export function AppSidebar() {
    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="/dashboard" prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={overviewNavItems} />
                <NavMain label="CRM" items={crmNavItems} />
                <NavMain label="Outreach" items={outreachNavItems} />
                <NavMain label="Catálogo" items={catalogNavItems} />
                <NavMain label="Datos" items={dataNavItems} />
                <NavMain label="Cuenta" items={accountNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
