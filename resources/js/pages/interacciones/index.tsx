import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import { Activity, Search } from 'lucide-react';
import Heading from '@/components/heading';
import { EmptyState } from '@/components/empty-state';
import { Pagination } from '@/components/pagination';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

type Interaction = {
    id: number;
    canal: string;
    direccion: string;
    tipo: string;
    asunto: string | null;
    detalle: string | null;
    resultado: string | null;
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

type Paginated<T> = {
    data: T[];
    links: { url: string | null; label: string; active: boolean }[];
    total: number;
};

function clientName(client: NonNullable<Interaction['cliente']>) {
    return client.razon_social || [client.nombre, client.apellido].filter(Boolean).join(' ') || client.email_principal || `#${client.id}`;
}

export default function InteractionsIndex({
    interacciones,
    filters,
}: {
    interacciones: Paginated<Interaction>;
    filters: { search: string; direccion: string; canal: string };
}) {
    const [search, setSearch] = useState(filters.search ?? '');

    const applyFilters = (overrides: Record<string, string | undefined> = {}) => {
        router.get(
            '/interacciones',
            {
                search: search || undefined,
                direccion: filters.direccion || undefined,
                canal: filters.canal || undefined,
                ...overrides,
            },
            { preserveState: true, replace: true },
        );
    };

    return (
        <>
            <Head title="Interacciones" />
            <div className="flex flex-col gap-6 p-4 md:p-6">
                <Heading title="Interacciones" description={`${interacciones.total.toLocaleString('es-AR')} eventos en el historial CRM.`} />

                <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 lg:flex-row">
                    <div className="relative flex-1">
                        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            className="pl-9"
                            value={search}
                            placeholder="Buscar por asunto, tipo o detalle..."
                            onChange={(event) => setSearch(event.target.value)}
                            onKeyDown={(event) => event.key === 'Enter' && applyFilters({ search: search || undefined })}
                        />
                    </div>
                    <Select value={filters.direccion || 'all'} onValueChange={(value) => applyFilters({ direccion: value === 'all' ? undefined : value })}>
                        <SelectTrigger className="w-full lg:w-44"><SelectValue placeholder="Dirección" /></SelectTrigger>
                        <SelectContent><SelectItem value="all">Todas</SelectItem><SelectItem value="inbound">Inbound</SelectItem><SelectItem value="outbound">Outbound</SelectItem></SelectContent>
                    </Select>
                    <Select value={filters.canal || 'all'} onValueChange={(value) => applyFilters({ canal: value === 'all' ? undefined : value })}>
                        <SelectTrigger className="w-full lg:w-44"><SelectValue placeholder="Canal" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos los canales</SelectItem>
                            {['email', 'sms', 'whatsapp', 'llamada', 'web', 'ads', 'otro'].map((channel) => <SelectItem key={channel} value={channel}>{channel}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Button onClick={() => applyFilters({ search: search || undefined })}>Filtrar</Button>
                </div>

                {interacciones.data.length === 0 ? (
                    <EmptyState icon={Activity} title="No hay interacciones" description="No se encontraron eventos para los filtros seleccionados." />
                ) : (
                    <div className="overflow-hidden rounded-xl border bg-card">
                        <Table>
                            <TableHeader><TableRow><TableHead>Cliente</TableHead><TableHead>Actividad</TableHead><TableHead>Dirección</TableHead><TableHead>Canal</TableHead><TableHead>Campaña</TableHead><TableHead className="text-right">Fecha</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {interacciones.data.map((interaction) => (
                                    <TableRow key={interaction.id}>
                                        <TableCell>{interaction.cliente ? <Link href={`/clientes/${interaction.cliente.id}`} className="font-medium hover:underline">{clientName(interaction.cliente)}</Link> : '—'}</TableCell>
                                        <TableCell>
                                            <div className="font-medium">{interaction.asunto || interaction.tipo}</div>
                                            <div className="max-w-sm truncate text-xs text-muted-foreground">{interaction.asunto ? interaction.tipo : interaction.detalle || '—'}</div>
                                        </TableCell>
                                        <TableCell><StatusBadge status={interaction.direccion} /></TableCell>
                                        <TableCell className="capitalize">{interaction.canal}</TableCell>
                                        <TableCell>{interaction.campana ? <Link href={`/campanas/${interaction.campana.id}`} className="hover:underline">{interaction.campana.nombre}</Link> : '—'}</TableCell>
                                        <TableCell className="text-right text-muted-foreground">{new Date(interaction.ocurrio_at).toLocaleString('es-AR')}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        <div className="border-t p-3"><Pagination links={interacciones.links} /></div>
                    </div>
                )}
            </div>
        </>
    );
}

InteractionsIndex.layout = {
    breadcrumbs: [{ title: 'Interacciones', href: '/interacciones' }],
};
