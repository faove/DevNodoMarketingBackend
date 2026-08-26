import { Head, Link } from '@inertiajs/react';
import { FileSpreadsheet } from 'lucide-react';
import Heading from '@/components/heading';
import { EmptyState } from '@/components/empty-state';
import { Pagination } from '@/components/pagination';
import { StatusBadge } from '@/components/status-badge';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
} from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

type Client = {
    id: number;
    razon_social: string | null;
    nombre: string | null;
    apellido: string | null;
    email_principal: string | null;
};

type ImportRow = {
    id: number;
    origen_tabla: string | null;
    origen_id: string | number | null;
    estado: string;
    mensaje: string | null;
    created_at: string | null;
    cliente?: Client | null;
};

type ImportBatch = {
    id: number;
    fuente: string;
    archivo: string | null;
    total_filas: number;
    insertadas: number;
    actualizadas: number;
    omitidas: number;
    errores: number;
    notas: string | null;
    started_at: string;
    finished_at: string | null;
    rows_count?: number;
};

type Paginated<T> = {
    data: T[];
    links: { url: string | null; label: string; active: boolean }[];
    total: number;
};

function clientName(client?: Client | null) {
    if (!client) return '—';
    return client.razon_social || [client.nombre, client.apellido].filter(Boolean).join(' ') || client.email_principal || `#${client.id}`;
}

function formatDate(value: string | null) {
    return value ? new Date(value).toLocaleString('es-AR') : 'En proceso';
}

export default function ImportShow({ batch, rows }: { batch: ImportBatch; rows: Paginated<ImportRow> }) {
    const stats = [
        { label: 'Filas', value: batch.total_filas },
        { label: 'Insertadas', value: batch.insertadas },
        { label: 'Actualizadas', value: batch.actualizadas },
        { label: 'Omitidas', value: batch.omitidas },
        { label: 'Errores', value: batch.errores },
    ];

    return (
        <>
            <Head title={`Importación #${batch.id}`} />
            <div className="flex flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <Heading title={`Importación #${batch.id}`} description={`${batch.fuente} · ${batch.archivo || 'Sin archivo'}`} />
                    <StatusBadge status={!batch.finished_at ? 'pendiente' : batch.errores > 0 ? 'error' : 'ok'} />
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                    {stats.map((stat) => (
                        <Card key={stat.label}>
                            <CardHeader className="pb-2"><CardDescription>{stat.label}</CardDescription></CardHeader>
                            <CardContent className="text-3xl font-extrabold">{stat.value.toLocaleString('es-AR')}</CardContent>
                        </Card>
                    ))}
                </div>

                <Card>
                    <CardContent className="grid gap-3 pt-6 text-sm md:grid-cols-2">
                        <div><span className="text-muted-foreground">Inicio:</span> <span className="font-medium">{formatDate(batch.started_at)}</span></div>
                        <div><span className="text-muted-foreground">Finalización:</span> <span className="font-medium">{formatDate(batch.finished_at)}</span></div>
                        {batch.notas ? <div className="md:col-span-2"><span className="text-muted-foreground">Notas:</span> {batch.notas}</div> : null}
                    </CardContent>
                </Card>

                {rows.data.length === 0 ? (
                    <EmptyState icon={FileSpreadsheet} title="Sin filas registradas" description="Este lote no contiene detalles de importación." />
                ) : (
                    <div className="overflow-hidden rounded-xl border bg-card">
                        <Table>
                            <TableHeader><TableRow><TableHead>Origen</TableHead><TableHead>Cliente</TableHead><TableHead>Estado</TableHead><TableHead>Mensaje</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {rows.data.map((row) => (
                                    <TableRow key={row.id}>
                                        <TableCell><span className="font-medium">{row.origen_tabla || batch.fuente}</span><div className="text-xs text-muted-foreground">{row.origen_id ? `#${row.origen_id}` : `Fila #${row.id}`}</div></TableCell>
                                        <TableCell>{row.cliente ? <Link href={`/clientes/${row.cliente.id}`} className="font-medium hover:underline">{clientName(row.cliente)}</Link> : '—'}</TableCell>
                                        <TableCell><StatusBadge status={row.estado} /></TableCell>
                                        <TableCell className="max-w-md text-muted-foreground">{row.mensaje || '—'}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        <div className="border-t p-3"><Pagination links={rows.links} /></div>
                    </div>
                )}
            </div>
        </>
    );
}

ImportShow.layout = {
    breadcrumbs: [
        { title: 'Importaciones', href: '/imports' },
        { title: 'Detalle', href: '#' },
    ],
};
