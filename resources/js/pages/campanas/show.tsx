import { Head, Link, router } from '@inertiajs/react';
import { FormEvent } from 'react';
import { Mail, Users } from 'lucide-react';
import Heading from '@/components/heading';
import { EmptyState } from '@/components/empty-state';
import { Pagination } from '@/components/pagination';
import { StatusBadge } from '@/components/status-badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

type Client = {
    id: number;
    razon_social: string | null;
    nombre: string | null;
    apellido: string | null;
    email_principal: string | null;
};

type Recipient = {
    id: number;
    canal: string;
    destino: string | null;
    estado: string;
    enviado_at: string | null;
    abierto_at: string | null;
    error_msg: string | null;
    cliente?: Client | null;
};

type Campaign = {
    id: number;
    codigo: string;
    nombre: string;
    canal: string;
    objetivo: string | null;
    producto_id: number | null;
    estado: string;
    asunto: string | null;
    mensaje_preview: string | null;
    destinatarios_count: number;
    programada_at: string | null;
    producto?: { id: number; nombre: string; codigo: string } | null;
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
    return value ? new Date(value).toLocaleString('es-AR') : '—';
}

export default function CampaignShow({
    campana,
    destinatarios,
    estadoCounts,
}: {
    campana: Campaign;
    destinatarios: Paginated<Recipient>;
    estadoCounts: Record<string, number>;
}) {
    const updateCampaign = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        router.put(`/campanas/${campana.id}`, Object.fromEntries(new FormData(event.currentTarget)));
    };

    return (
        <>
            <Head title={campana.nombre} />
            <div className="flex flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <Heading title={campana.nombre} description={`${campana.codigo} · ${campana.canal}`} />
                    <StatusBadge status={campana.estado} />
                </div>

                <Alert variant="info">
                    <Mail />
                    <AlertTitle>Envío de emails próximamente</AlertTitle>
                    <AlertDescription>
                        La gestión y segmentación ya están disponibles. El envío masivo se habilitará en una próxima versión.
                    </AlertDescription>
                </Alert>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <Card><CardHeader className="pb-2"><CardDescription>Destinatarios</CardDescription></CardHeader><CardContent className="text-3xl font-extrabold">{campana.destinatarios_count.toLocaleString('es-AR')}</CardContent></Card>
                    {Object.entries(estadoCounts).slice(0, 3).map(([status, total]) => (
                        <Card key={status}>
                            <CardHeader className="pb-2"><CardDescription><StatusBadge status={status} /></CardDescription></CardHeader>
                            <CardContent className="text-3xl font-extrabold">{Number(total).toLocaleString('es-AR')}</CardContent>
                        </Card>
                    ))}
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Configuración</CardTitle>
                        <CardDescription>Edita la información operativa de la campaña.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={updateCampaign} className="grid gap-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="grid gap-2"><Label htmlFor="codigo">Código</Label><Input id="codigo" name="codigo" defaultValue={campana.codigo} required /></div>
                                <div className="grid gap-2"><Label htmlFor="nombre">Nombre</Label><Input id="nombre" name="nombre" defaultValue={campana.nombre} required /></div>
                                <div className="grid gap-2">
                                    <Label htmlFor="canal">Canal</Label>
                                    <Select name="canal" defaultValue={campana.canal}>
                                        <SelectTrigger id="canal"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {['email', 'sms', 'whatsapp', 'llamada', 'ads', 'mixto'].map((channel) => <SelectItem key={channel} value={channel}>{channel}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="estado">Estado</Label>
                                    <Select name="estado" defaultValue={campana.estado}>
                                        <SelectTrigger id="estado"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {['borrador', 'programada', 'activa', 'pausada', 'finalizada'].map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2"><Label htmlFor="asunto">Asunto</Label><Input id="asunto" name="asunto" defaultValue={campana.asunto ?? ''} /></div>
                                <div className="grid gap-2"><Label htmlFor="objetivo">Objetivo</Label><Input id="objetivo" name="objetivo" defaultValue={campana.objetivo ?? ''} /></div>
                                <div className="grid gap-2 md:col-span-2">
                                    <Label htmlFor="mensaje_preview">Vista previa del mensaje</Label>
                                    <textarea id="mensaje_preview" name="mensaje_preview" defaultValue={campana.mensaje_preview ?? ''} rows={4} className="w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                                </div>
                            </div>
                            {campana.producto_id ? <input type="hidden" name="producto_id" value={campana.producto_id} /> : null}
                            <div><Button type="submit">Guardar cambios</Button></div>
                        </form>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Destinatarios</CardTitle>
                        <CardDescription>{destinatarios.total.toLocaleString('es-AR')} contactos asociados.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {destinatarios.data.length === 0 ? (
                            <EmptyState icon={Users} title="Sin destinatarios" description="Esta campaña todavía no tiene contactos asociados." />
                        ) : (
                            <div className="overflow-hidden rounded-xl border">
                                <Table>
                                    <TableHeader><TableRow><TableHead>Cliente</TableHead><TableHead>Destino</TableHead><TableHead>Canal</TableHead><TableHead>Estado</TableHead><TableHead>Enviado</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {destinatarios.data.map((recipient) => (
                                            <TableRow key={recipient.id}>
                                                <TableCell>{recipient.cliente ? <Link href={`/clientes/${recipient.cliente.id}`} className="font-medium hover:underline">{clientName(recipient.cliente)}</Link> : '—'}</TableCell>
                                                <TableCell className="text-muted-foreground">{recipient.destino ?? recipient.cliente?.email_principal ?? '—'}</TableCell>
                                                <TableCell className="capitalize">{recipient.canal}</TableCell>
                                                <TableCell><StatusBadge status={recipient.estado} />{recipient.error_msg ? <div className="mt-1 text-xs text-destructive">{recipient.error_msg}</div> : null}</TableCell>
                                                <TableCell className="text-muted-foreground">{formatDate(recipient.enviado_at)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                <div className="border-t p-3"><Pagination links={destinatarios.links} /></div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

CampaignShow.layout = {
    breadcrumbs: [
        { title: 'Campañas', href: '/campanas' },
        { title: 'Detalle', href: '#' },
    ],
};
