import { Head, Link, usePage } from '@inertiajs/react';
import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Eye, Send, Users } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import Heading from '@/components/heading';
import { EmptyState } from '@/components/empty-state';
import { StatusBadge } from '@/components/status-badge';
import { ClienteTestSelector, type ClienteBusqueda } from '@/components/campanas/cliente-test-selector';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import type { Auth } from '@/types';

type Campaign = {
    id: number;
    codigo: string;
    nombre: string;
    asunto: string | null;
    estado: string;
};

type PreviewRow = {
    cliente: { id: number; nombre_completo: string; razon_social: string | null };
    destino: string | null;
    origen: string | null;
    asunto_renderizado: string;
    opt_in_email: boolean;
    omitido: boolean;
    motivo: string | null;
    duplicado: boolean;
};

type PaginatedJson<T> = {
    data: T[];
    current_page: number;
    last_page: number;
    total: number;
    per_page: number;
};

type BuildResumen = { total: number; persistidos: number; omitidos: number };

const MOTIVOS: Record<string, string> = {
    sin_email: 'Sin email',
    opt_out: 'Opt-out',
    no_contactar: 'No contactar',
    sin_opt_in: 'Sin opt-in',
};

type Filtro = 'todos' | 'omitidos' | 'validos' | 'duplicados';

export default function CampaignPreview({ campana }: { campana: Campaign }) {
    const { auth } = usePage<{ auth: Auth }>().props;

    const [page, setPage] = useState(1);
    const [filtro, setFiltro] = useState<Filtro>('todos');
    const [result, setResult] = useState<PaginatedJson<PreviewRow> | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [building, setBuilding] = useState(false);
    const [buildResumen, setBuildResumen] = useState<BuildResumen | null>(null);

    const [rowPreview, setRowPreview] = useState<{ subject: string; html: string; to: string | null } | 'loading' | null>(null);

    const [testSelectorOpen, setTestSelectorOpen] = useState(false);
    const [sendingTest, setSendingTest] = useState(false);
    const [testEmail, setTestEmail] = useState(auth.user?.email ?? '');

    const fetchPage = useCallback(
        (targetPage: number) => {
            setLoading(true);
            setError(null);

            api.post<PaginatedJson<PreviewRow>>(`/campanas/${campana.id}/destinatarios/preview?page=${targetPage}&per_page=50`)
                .then((response) => {
                    setResult(response);
                    setPage(response.current_page);
                })
                .catch(() => setError('No se pudo cargar el preview de destinatarios.'))
                .finally(() => setLoading(false));
        },
        [campana.id],
    );

    useEffect(() => {
        fetchPage(1);
    }, [fetchPage]);

    const rows = (result?.data ?? []).filter((row) => {
        if (filtro === 'omitidos') return row.omitido;
        if (filtro === 'validos') return !row.omitido;
        if (filtro === 'duplicados') return row.duplicado;
        return true;
    });

    const counts = (result?.data ?? []).reduce(
        (acc, row) => {
            acc.todos += 1;
            if (row.omitido) acc.omitidos += 1;
            else acc.validos += 1;
            if (row.duplicado) acc.duplicados += 1;
            return acc;
        },
        { todos: 0, validos: 0, omitidos: 0, duplicados: 0 },
    );

    const handleBuild = () => {
        setBuilding(true);
        api.post<BuildResumen>(`/campanas/${campana.id}/destinatarios/build`)
            .then((resumen) => {
                setBuildResumen(resumen);
                toast.success(`Audiencia confirmada: ${resumen.persistidos} destinatarios persistidos.`);
                fetchPage(page);
            })
            .catch(() => toast.error('No se pudo confirmar la audiencia.'))
            .finally(() => setBuilding(false));
    };

    const openRowPreview = (clienteId: number) => {
        setRowPreview('loading');
        api.get<{ asunto: string; html: string; to: string | null }>(`/campanas/${campana.id}/email-preview?cliente_id=${clienteId}`)
            .then((response) => setRowPreview({ subject: response.asunto, html: response.html, to: response.to }))
            .catch(() => {
                toast.error('No se pudo renderizar el email para este cliente.');
                setRowPreview(null);
            });
    };

    const handleSendTest = (cliente: ClienteBusqueda) => {
        if (!testEmail) {
            toast.error('Indicá un email de destino para la prueba.');
            return;
        }

        setSendingTest(true);
        api.post(`/campanas/${campana.id}/send-test`, { to: testEmail, cliente_id: cliente.id })
            .then(() => toast.success(`Prueba enviada a ${testEmail} (usando datos de ${cliente.nombre_completo}).`))
            .catch(() => toast.error('No se pudo enviar la prueba.'))
            .finally(() => setSendingTest(false));
    };

    return (
        <>
            <Head title={`Audiencia — ${campana.nombre}`} />
            <div className="flex flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <Heading title="Vista previa de audiencia" description={`${campana.nombre} · ${campana.asunto ?? 'Sin asunto'}`} />
                    <Button variant="outline" asChild>
                        <Link href={`/campanas/${campana.id}`}>Volver a la campaña</Link>
                    </Button>
                </div>

                <Card>
                    <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <CardTitle>Destinatarios resueltos</CardTitle>
                            <CardDescription>
                                {result ? `${result.total.toLocaleString('es-AR')} clientes evaluados en total.` : 'Cargando...'}
                            </CardDescription>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <ToggleGroup type="single" variant="outline" size="sm" value={filtro} onValueChange={(v) => v && setFiltro(v as Filtro)}>
                                <ToggleGroupItem value="todos">Todos ({counts.todos})</ToggleGroupItem>
                                <ToggleGroupItem value="validos">Válidos ({counts.validos})</ToggleGroupItem>
                                <ToggleGroupItem value="omitidos">Omitidos ({counts.omitidos})</ToggleGroupItem>
                                <ToggleGroupItem value="duplicados">Duplicados ({counts.duplicados})</ToggleGroupItem>
                            </ToggleGroup>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex items-center justify-center py-16">
                                <Spinner className="size-6" />
                            </div>
                        ) : error ? (
                            <p className="py-8 text-center text-sm text-destructive">{error}</p>
                        ) : rows.length === 0 ? (
                            <EmptyState icon={Users} title="Sin resultados" description="No hay destinatarios que coincidan con el filtro elegido." />
                        ) : (
                            <>
                                <p className="mb-2 text-xs text-muted-foreground">
                                    El filtro se aplica sobre la página actual ({result?.data.length ?? 0} filas cargadas).
                                </p>
                                <div className="overflow-hidden rounded-xl border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Cliente</TableHead>
                                                <TableHead>Email destino</TableHead>
                                                <TableHead>Origen</TableHead>
                                                <TableHead>Asunto renderizado</TableHead>
                                                <TableHead>Opt-in</TableHead>
                                                <TableHead>Estado</TableHead>
                                                <TableHead className="text-right">Preview</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {rows.map((row) => (
                                                <TableRow key={row.cliente.id}>
                                                    <TableCell>
                                                        <Link href={`/clientes/${row.cliente.id}`} className="font-medium hover:underline">
                                                            {row.cliente.nombre_completo || row.cliente.razon_social || `#${row.cliente.id}`}
                                                        </Link>
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground">{row.destino ?? '—'}</TableCell>
                                                    <TableCell className="text-muted-foreground">{row.origen ?? '—'}</TableCell>
                                                    <TableCell className="max-w-64 truncate">{row.asunto_renderizado}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={row.opt_in_email ? 'success' : 'muted'}>{row.opt_in_email ? 'Sí' : 'No'}</Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        {row.omitido ? (
                                                            <div>
                                                                <StatusBadge status="omitido" />
                                                                <div className="mt-1 text-xs text-muted-foreground">{MOTIVOS[row.motivo ?? ''] ?? row.motivo}</div>
                                                            </div>
                                                        ) : (
                                                            <StatusBadge status="ok" />
                                                        )}
                                                        {row.duplicado ? (
                                                            <Badge variant="warning" className="mt-1">
                                                                Duplicado
                                                            </Badge>
                                                        ) : null}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button variant="ghost" size="icon" onClick={() => openRowPreview(row.cliente.id)}>
                                                            <Eye />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>

                                <div className="mt-3 flex items-center justify-between">
                                    <p className="text-sm text-muted-foreground">
                                        Página {result?.current_page} de {result?.last_page}
                                    </p>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={!result || result.current_page <= 1}
                                            onClick={() => fetchPage(page - 1)}
                                        >
                                            <ChevronLeft />
                                            Anterior
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={!result || result.current_page >= result.last_page}
                                            onClick={() => fetchPage(page + 1)}
                                        >
                                            Siguiente
                                            <ChevronRight />
                                        </Button>
                                    </div>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Acciones</CardTitle>
                        <CardDescription>Confirmá la audiencia para persistirla o mandate una prueba a tu propio email.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                        <div className="flex flex-wrap items-center gap-3">
                            <Button onClick={handleBuild} disabled={building}>
                                <Users />
                                {building ? 'Confirmando...' : 'Confirmar audiencia'}
                            </Button>
                            <Button variant="outline" onClick={() => setTestSelectorOpen(true)} disabled={sendingTest}>
                                <Send />
                                Enviar prueba a mi email
                            </Button>
                        </div>

                        {buildResumen ? (
                            <p className="text-sm text-muted-foreground">
                                Última confirmación: {buildResumen.total} evaluados · {buildResumen.persistidos} persistidos ·{' '}
                                {buildResumen.omitidos} omitidos.
                            </p>
                        ) : null}

                        <div className="rounded-lg border border-dashed p-4">
                            <Button disabled>Enviar campaña</Button>
                            <p className="mt-2 text-sm text-muted-foreground">
                                Deshabilitado: falta configurar SMTP y definir el criterio legal de opt-in masivo antes de habilitar el envío
                                real.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <ClienteTestSelector
                open={testSelectorOpen}
                onOpenChange={setTestSelectorOpen}
                onSelect={(cliente) => handleSendTest(cliente)}
            />

            <Dialog open={rowPreview !== null} onOpenChange={(open) => !open && setRowPreview(null)}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Vista previa del email</DialogTitle>
                    </DialogHeader>
                    {rowPreview === 'loading' ? (
                        <div className="flex items-center justify-center py-10">
                            <Spinner className="size-5" />
                        </div>
                    ) : rowPreview ? (
                        <div className="flex flex-col gap-3">
                            <div className="space-y-1 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                                <div className="flex gap-2">
                                    <span className="w-14 shrink-0 text-muted-foreground">Para:</span>
                                    <span className="truncate">{rowPreview.to ?? '—'}</span>
                                </div>
                                <div className="flex gap-2">
                                    <span className="w-14 shrink-0 text-muted-foreground">Asunto:</span>
                                    <span className="truncate font-medium">{rowPreview.subject}</span>
                                </div>
                            </div>
                            <iframe title="Vista previa" srcDoc={rowPreview.html} sandbox="" className="h-96 rounded-md border bg-white" />
                        </div>
                    ) : null}
                </DialogContent>
            </Dialog>
        </>
    );
}

CampaignPreview.layout = {
    breadcrumbs: [
        { title: 'Campañas', href: '/campanas' },
        { title: 'Detalle', href: '#' },
        { title: 'Audiencia', href: '#' },
    ],
};
