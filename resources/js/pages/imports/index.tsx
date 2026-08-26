import { Head, Link } from '@inertiajs/react';
import { Database } from 'lucide-react';
import Heading from '@/components/heading';
import { EmptyState } from '@/components/empty-state';
import { Pagination } from '@/components/pagination';
import { StatusBadge } from '@/components/status-badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

type ImportBatch = {
    id: number;
    fuente: string;
    archivo: string | null;
    total_filas: number;
    insertadas: number;
    actualizadas: number;
    omitidas: number;
    errores: number;
    started_at: string;
    finished_at: string | null;
};

type Paginated<T> = {
    data: T[];
    links: { url: string | null; label: string; active: boolean }[];
    total: number;
};

function formatDate(value: string | null) {
    return value ? new Date(value).toLocaleString('es-AR') : 'En proceso';
}

function batchStatus(batch: ImportBatch) {
    if (!batch.finished_at) return 'pendiente';
    return batch.errores > 0 ? 'error' : 'ok';
}

export default function ImportsIndex({ batches }: { batches: Paginated<ImportBatch> }) {
    return (
        <>
            <Head title="Importaciones" />
            <div className="flex flex-col gap-6 p-4 md:p-6">
                <Heading title="Importaciones" description={`${batches.total.toLocaleString('es-AR')} lotes procesados.`} />
                {batches.data.length === 0 ? (
                    <EmptyState icon={Database} title="No hay importaciones" description="Los lotes importados aparecerán aquí con su resultado." />
                ) : (
                    <div className="overflow-hidden rounded-xl border bg-card">
                        <Table>
                            <TableHeader><TableRow><TableHead>Origen</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Filas</TableHead><TableHead className="text-right">Insertadas</TableHead><TableHead className="text-right">Actualizadas</TableHead><TableHead className="text-right">Omitidas</TableHead><TableHead className="text-right">Errores</TableHead><TableHead>Inicio</TableHead><TableHead>Fin</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {batches.data.map((batch) => (
                                    <TableRow key={batch.id}>
                                        <TableCell>
                                            <Link href={`/imports/${batch.id}`} className="font-medium hover:underline">{batch.fuente}</Link>
                                            <div className="max-w-48 truncate text-xs text-muted-foreground">{batch.archivo || `Lote #${batch.id}`}</div>
                                        </TableCell>
                                        <TableCell><StatusBadge status={batchStatus(batch)} /></TableCell>
                                        <TableCell className="text-right">{batch.total_filas.toLocaleString('es-AR')}</TableCell>
                                        <TableCell className="text-right">{batch.insertadas.toLocaleString('es-AR')}</TableCell>
                                        <TableCell className="text-right">{batch.actualizadas.toLocaleString('es-AR')}</TableCell>
                                        <TableCell className="text-right">{batch.omitidas.toLocaleString('es-AR')}</TableCell>
                                        <TableCell className="text-right">{batch.errores.toLocaleString('es-AR')}</TableCell>
                                        <TableCell className="text-muted-foreground">{formatDate(batch.started_at)}</TableCell>
                                        <TableCell className="text-muted-foreground">{formatDate(batch.finished_at)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        <div className="border-t p-3"><Pagination links={batches.links} /></div>
                    </div>
                )}
            </div>
        </>
    );
}

ImportsIndex.layout = {
    breadcrumbs: [{ title: 'Importaciones', href: '/imports' }],
};
