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
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
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
    canal: string;
    plantilla_html: string | null;
};

type Segmento = {
    id: number;
    codigo: string;
    nombre: string;
    descripcion: string | null;
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

type SendMeta = {
    pendientes: number;
    daily_limit: number;
    sent_today: number;
    remaining_today: number;
};

type AudienceFilters = {
    segmento_id: string;
    con_email: boolean;
    opt_in_email: boolean;
    provincia: string;
};

const MOTIVOS: Record<string, string> = {
    sin_email: 'Sin email',
    opt_out: 'Opt-out',
    no_contactar: 'No contactar',
    sin_opt_in: 'Sin opt-in',
};

type Filtro = 'todos' | 'omitidos' | 'validos' | 'duplicados';

function buildAudienceBody(filters: AudienceFilters): Record<string, unknown> {
    if (filters.segmento_id && filters.segmento_id !== 'all') {
        return { segmento_id: Number(filters.segmento_id) };
    }

    return {
        filtros: {
            con_email: filters.con_email || undefined,
            opt_in_email: filters.opt_in_email || undefined,
            provincia: filters.provincia.trim() || undefined,
        },
    };
}

export default function CampaignPreview({
    campana,
    segmentos,
    sendMeta,
}: {
    campana: Campaign;
    segmentos: Segmento[];
    sendMeta: SendMeta;
}) {
    const { auth } = usePage<{ auth: Auth }>().props;

    const [page, setPage] = useState(1);
    const [filtro, setFiltro] = useState<Filtro>('todos');
    const [result, setResult] = useState<PaginatedJson<PreviewRow> | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [audienceFilters, setAudienceFilters] = useState<AudienceFilters>({
        segmento_id: 'all',
        con_email: true,
        opt_in_email: false,
        provincia: '',
    });
    const [appliedFilters, setAppliedFilters] = useState<AudienceFilters>(audienceFilters);

    const [building, setBuilding] = useState(false);
    const [buildResumen, setBuildResumen] = useState<BuildResumen | null>(null);
    const [sending, setSending] = useState(false);
    const [liveMeta, setLiveMeta] = useState(sendMeta);

    const [rowPreview, setRowPreview] = useState<{ subject: string; html: string; to: string | null } | 'loading' | null>(null);

    const [testSelectorOpen, setTestSelectorOpen] = useState(false);
    const [sendingTest, setSendingTest] = useState(false);
    const [testEmail, setTestEmail] = useState(auth.user?.email ?? '');

    const fetchPage = useCallback(
        (targetPage: number, filters: AudienceFilters) => {
            setLoading(true);
            setError(null);

            api.post<PaginatedJson<PreviewRow>>(
                `/campanas/${campana.id}/destinatarios/preview?page=${targetPage}&per_page=50`,
                buildAudienceBody(filters),
            )
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
        fetchPage(1, appliedFilters);
    }, [fetchPage, appliedFilters]);

    const applyFilters = () => {
        setAppliedFilters({ ...audienceFilters });
    };

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
        api.post<BuildResumen>(`/campanas/${campana.id}/destinatarios/build`, buildAudienceBody(appliedFilters))
            .then((resumen) => {
                setBuildResumen(resumen);
                setLiveMeta((prev) => ({ ...prev, pendientes: resumen.persistidos }));
                toast.success(`Audiencia confirmada: ${resumen.persistidos} destinatarios persistidos.`);
                fetchPage(page, appliedFilters);
                refreshSendStatus();
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

    const refreshSendStatus = () => {
        api.get<{
            estado_counts: Record<string, number>;
            daily_limit: number;
            sent_today: number;
            remaining_today: number;
            campana: { estado: string };
        }>(`/campanas/${campana.id}/send-status`)
            .then((status) => {
                setLiveMeta({
                    pendientes: Number(status.estado_counts.pendiente ?? 0),
                    daily_limit: status.daily_limit,
                    sent_today: status.sent_today,
                    remaining_today: status.remaining_today,
                });
            })
            .catch(() => undefined);
    };

    const handleSendCampaign = () => {
        if (!campana.asunto || !campana.plantilla_html) {
            toast.error('La campaña necesita asunto y plantilla HTML.');
            return;
        }
        if (liveMeta.pendientes <= 0) {
            toast.error('Confirmá la audiencia primero (sin destinatarios pendientes).');
            return;
        }
        if (liveMeta.remaining_today <= 0) {
            toast.error(`Tope diario alcanzado (${liveMeta.daily_limit}/día).`);
            return;
        }

        const willSend = Math.min(liveMeta.pendientes, liveMeta.remaining_today);
        if (!window.confirm(`¿Encolar envío de hasta ${willSend} emails hoy (tope ${liveMeta.daily_limit}/día)?`)) {
            return;
        }

        setSending(true);
        api.post<{ will_send_today: number; remaining_today: number; pendientes: number }>(`/campanas/${campana.id}/send`)
            .then((response) => {
                toast.success(
                    `Envío encolado: ${response.will_send_today} hoy · ${response.pendientes} pendientes totales · quedan ${response.remaining_today} del cupo.`,
                );
                refreshSendStatus();
            })
            .catch((error: unknown) => {
                const message =
                    typeof error === 'object' &&
                    error !== null &&
                    'message' in error &&
                    typeof (error as { message: unknown }).message === 'string'
                        ? (error as { message: string }).message
                        : 'No se pudo encolar el envío.';
                toast.error(message);
            })
            .finally(() => setSending(false));
    };

    const usingSegment = appliedFilters.segmento_id !== 'all';
    const canSend =
        Boolean(campana.asunto && campana.plantilla_html) &&
        liveMeta.pendientes > 0 &&
        liveMeta.remaining_today > 0 &&
        !sending;

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
                    <CardHeader>
                        <CardTitle>Audiencia</CardTitle>
                        <CardDescription>
                            Elegí un segmento o filtros antes de confirmar. Por defecto se limitan clientes con email.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-4">
                        <div className="grid gap-2 md:col-span-2">
                            <Label>Segmento</Label>
                            <Select
                                value={audienceFilters.segmento_id}
                                onValueChange={(value) =>
                                    setAudienceFilters((prev) => ({ ...prev, segmento_id: value }))
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Todos los clientes" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Sin segmento (usar filtros)</SelectItem>
                                    {segmentos.map((segmento) => (
                                        <SelectItem key={segmento.id} value={String(segmento.id)}>
                                            {segmento.nombre}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="provincia">Provincia</Label>
                            <Input
                                id="provincia"
                                value={audienceFilters.provincia}
                                disabled={audienceFilters.segmento_id !== 'all'}
                                onChange={(e) =>
                                    setAudienceFilters((prev) => ({ ...prev, provincia: e.target.value }))
                                }
                                placeholder="Córdoba"
                            />
                        </div>
                        <div className="flex flex-col justify-end gap-3">
                            <label className="flex items-center gap-2 text-sm">
                                <Checkbox
                                    checked={audienceFilters.con_email}
                                    disabled={audienceFilters.segmento_id !== 'all'}
                                    onCheckedChange={(checked) =>
                                        setAudienceFilters((prev) => ({
                                            ...prev,
                                            con_email: Boolean(checked),
                                        }))
                                    }
                                />
                                Con email
                            </label>
                            <label className="flex items-center gap-2 text-sm">
                                <Checkbox
                                    checked={audienceFilters.opt_in_email}
                                    disabled={audienceFilters.segmento_id !== 'all'}
                                    onCheckedChange={(checked) =>
                                        setAudienceFilters((prev) => ({
                                            ...prev,
                                            opt_in_email: Boolean(checked),
                                        }))
                                    }
                                />
                                Solo opt-in
                            </label>
                        </div>
                        <div className="md:col-span-4">
                            <Button onClick={applyFilters}>Aplicar audiencia</Button>
                            {usingSegment ? (
                                <p className="mt-2 text-xs text-muted-foreground">
                                    Usando segmento. Los filtros sueltos quedan ignorados.
                                </p>
                            ) : null}
                        </div>
                    </CardContent>
                </Card>

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
                                    El filtro Todos/Válidos/Omitidos se aplica sobre la página actual ({result?.data.length ?? 0} filas cargadas).
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
                                            onClick={() => fetchPage(page - 1, appliedFilters)}
                                        >
                                            <ChevronLeft />
                                            Anterior
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={!result || result.current_page >= result.last_page}
                                            onClick={() => fetchPage(page + 1, appliedFilters)}
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
                            <div className="flex items-center gap-2">
                                <Input
                                    className="w-56"
                                    type="email"
                                    value={testEmail}
                                    onChange={(e) => setTestEmail(e.target.value)}
                                    placeholder="tu@email.com"
                                />
                                <Button variant="outline" onClick={() => setTestSelectorOpen(true)} disabled={sendingTest}>
                                    <Send />
                                    Enviar prueba
                                </Button>
                            </div>
                        </div>

                        {buildResumen ? (
                            <p className="text-sm text-muted-foreground">
                                Última confirmación: {buildResumen.total} evaluados · {buildResumen.persistidos} persistidos ·{' '}
                                {buildResumen.omitidos} omitidos.
                            </p>
                        ) : null}

                        <div className="rounded-lg border p-4">
                            <div className="mb-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
                                <span>
                                    Pendientes: <strong className="text-foreground">{liveMeta.pendientes}</strong>
                                </span>
                                <span>
                                    Enviados hoy: <strong className="text-foreground">{liveMeta.sent_today}</strong> /{' '}
                                    {liveMeta.daily_limit}
                                </span>
                                <span>
                                    Cupo restante: <strong className="text-foreground">{liveMeta.remaining_today}</strong>
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Button onClick={handleSendCampaign} disabled={!canSend}>
                                    <Send />
                                    {sending ? 'Encolando...' : 'Enviar campaña'}
                                </Button>
                                <Button variant="outline" onClick={refreshSendStatus}>
                                    Actualizar estado
                                </Button>
                            </div>
                            <p className="mt-2 text-sm text-muted-foreground">
                                Tope global {liveMeta.daily_limit}/día. Si quedan pendientes, el scheduler continúa mañana
                                automáticamente.
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
