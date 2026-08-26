import { Head, Link } from '@inertiajs/react';
import {
    Activity,
    Mail,
    Megaphone,
    UserCheck,
    Users,
} from 'lucide-react';
import Heading from '@/components/heading';
import { StatusBadge } from '@/components/status-badge';
import { Badge } from '@/components/ui/badge';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { EmptyState } from '@/components/empty-state';

type Stats = {
    clientes: number;
    clientes_con_email: number;
    clientes_opt_in_email: number;
    campanas: number;
    campanas_activas: number;
    interacciones: number;
    interacciones_inbound: number;
};

type Interaction = {
    id: number;
    canal: string;
    direccion: string;
    tipo: string;
    asunto: string | null;
    ocurrio_at: string;
    cliente?: {
        id: number;
        razon_social: string | null;
        nombre: string | null;
        apellido: string | null;
        email_principal: string | null;
    } | null;
    campana?: { id: number; nombre: string; codigo: string } | null;
};

function clienteLabel(cliente?: Interaction['cliente']) {
    if (!cliente) return '—';
    return (
        cliente.razon_social ||
        [cliente.nombre, cliente.apellido].filter(Boolean).join(' ') ||
        cliente.email_principal ||
        `#${cliente.id}`
    );
}

function formatNumber(value: number) {
    return new Intl.NumberFormat('es-AR').format(value);
}

export default function Dashboard({
    stats,
    campaignsByEstado,
    recentInteractions,
}: {
    stats: Stats;
    campaignsByEstado: Record<string, number>;
    recentInteractions: Interaction[];
}) {
    const kpis = [
        {
            label: 'Clientes',
            value: stats.clientes,
            hint: 'Base CRM total',
            icon: Users,
        },
        {
            label: 'Con email',
            value: stats.clientes_con_email,
            hint: 'Contactables por correo',
            icon: Mail,
        },
        {
            label: 'Opt-in email',
            value: stats.clientes_opt_in_email,
            hint: 'Consentimiento activo',
            icon: UserCheck,
        },
        {
            label: 'Campañas activas',
            value: stats.campanas_activas,
            hint: `${formatNumber(stats.campanas)} totales`,
            icon: Megaphone,
        },
    ];

    return (
        <>
            <Head title="Dashboard" />

            <div className="flex flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                    <Heading
                        title="Centro de control"
                        description="Actividad de marketing, audiencia y campañas en un vistazo."
                    />
                    <div className="flex gap-2">
                        <Badge variant="outline" className="font-medium">
                            {formatNumber(stats.interacciones)} interacciones
                        </Badge>
                        <Badge variant="secondary" className="font-medium">
                            {formatNumber(stats.interacciones_inbound)} inbound
                        </Badge>
                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {kpis.map((kpi) => (
                        <Card key={kpi.label} className="overflow-hidden">
                            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                                <CardDescription className="font-medium">
                                    {kpi.label}
                                </CardDescription>
                                <span className="rounded-lg bg-primary/10 p-2 text-primary">
                                    <kpi.icon className="size-4" />
                                </span>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-extrabold tracking-tight">
                                    {formatNumber(kpi.value)}
                                </div>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    {kpi.hint}
                                </p>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <div className="grid gap-4 xl:grid-cols-3">
                    <Card className="xl:col-span-2">
                        <CardHeader>
                            <CardTitle>Actividad reciente</CardTitle>
                            <CardDescription>
                                Últimas interacciones CRM inbound / outbound
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {recentInteractions.length === 0 ? (
                                <EmptyState
                                    icon={Activity}
                                    title="Sin interacciones aún"
                                    description="Cuando registres actividad o envíes campañas, verás el timeline aquí."
                                    actionHref="/interacciones"
                                    actionLabel="Ver interacciones"
                                />
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Cliente</TableHead>
                                            <TableHead>Tipo</TableHead>
                                            <TableHead>Dirección</TableHead>
                                            <TableHead>Canal</TableHead>
                                            <TableHead className="text-right">
                                                Fecha
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {recentInteractions.map((item) => (
                                            <TableRow key={item.id}>
                                                <TableCell>
                                                    {item.cliente ? (
                                                        <Link
                                                            href={`/clientes/${item.cliente.id}`}
                                                            className="font-medium hover:underline"
                                                        >
                                                            {clienteLabel(
                                                                item.cliente,
                                                            )}
                                                        </Link>
                                                    ) : (
                                                        '—'
                                                    )}
                                                    {item.asunto ? (
                                                        <div className="text-xs text-muted-foreground">
                                                            {item.asunto}
                                                        </div>
                                                    ) : null}
                                                </TableCell>
                                                <TableCell>{item.tipo}</TableCell>
                                                <TableCell>
                                                    <StatusBadge
                                                        status={item.direccion}
                                                    />
                                                </TableCell>
                                                <TableCell className="capitalize">
                                                    {item.canal}
                                                </TableCell>
                                                <TableCell className="text-right text-muted-foreground">
                                                    {new Date(
                                                        item.ocurrio_at,
                                                    ).toLocaleString('es-AR')}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Campañas por estado</CardTitle>
                            <CardDescription>
                                Distribución operativa actual
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {Object.keys(campaignsByEstado).length === 0 ? (
                                <EmptyState
                                    icon={Megaphone}
                                    title="Sin campañas"
                                    description="Crea tu primera campaña de outreach para empezar."
                                    actionHref="/campanas"
                                    actionLabel="Ir a campañas"
                                    className="py-10"
                                />
                            ) : (
                                Object.entries(campaignsByEstado).map(
                                    ([estado, total]) => (
                                        <div
                                            key={estado}
                                            className="flex items-center justify-between rounded-lg border px-3 py-2"
                                        >
                                            <StatusBadge status={estado} />
                                            <span className="text-sm font-semibold">
                                                {formatNumber(total)}
                                            </span>
                                        </div>
                                    ),
                                )
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
}

Dashboard.layout = {
    breadcrumbs: [{ title: 'Dashboard', href: '/dashboard' }],
};
