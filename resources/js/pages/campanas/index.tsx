import { Head, Link, router } from '@inertiajs/react';
import { FormEvent, useState } from 'react';
import { Megaphone, Plus, Search } from 'lucide-react';
import Heading from '@/components/heading';
import { EmptyState } from '@/components/empty-state';
import { Pagination } from '@/components/pagination';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

type Campaign = {
    id: number;
    codigo: string;
    nombre: string;
    canal: string;
    estado: string;
    asunto: string | null;
    destinatarios_count: number;
    producto?: { id: number; nombre: string; codigo: string } | null;
};

type Paginated<T> = {
    data: T[];
    links: { url: string | null; label: string; active: boolean }[];
    total: number;
};

type Product = { id: number; nombre: string; codigo: string };

export default function CampaignsIndex({
    campanas,
    filters,
    productos,
}: {
    campanas: Paginated<Campaign>;
    filters: { search: string; estado: string; canal: string };
    productos: Product[];
}) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [open, setOpen] = useState(false);

    const applyFilters = (overrides: Record<string, string | undefined> = {}) => {
        router.get(
            '/campanas',
            {
                search: search || undefined,
                estado: filters.estado || undefined,
                canal: filters.canal || undefined,
                ...overrides,
            },
            { preserveState: true, replace: true },
        );
    };

    const createCampaign = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        router.post('/campanas', new FormData(event.currentTarget), {
            onSuccess: () => setOpen(false),
        });
    };

    return (
        <>
            <Head title="Campañas" />
            <div className="flex flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <Heading
                        title="Campañas"
                        description={`${campanas.total.toLocaleString('es-AR')} campañas registradas.`}
                    />
                    <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild>
                            <Button><Plus className="size-4" />Nueva campaña</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader><DialogTitle>Crear campaña</DialogTitle></DialogHeader>
                            <form onSubmit={createCampaign} className="grid gap-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="grid gap-2">
                                        <Label htmlFor="codigo">Código</Label>
                                        <Input id="codigo" name="codigo" required maxLength={60} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="nombre">Nombre</Label>
                                        <Input id="nombre" name="nombre" required maxLength={160} />
                                    </div>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="asunto">Asunto</Label>
                                    <Input id="asunto" name="asunto" maxLength={255} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="producto_id">Producto</Label>
                                    <Select name="producto_id">
                                        <SelectTrigger id="producto_id"><SelectValue placeholder="Sin producto" /></SelectTrigger>
                                        <SelectContent>
                                            {productos.map((product) => (
                                                <SelectItem key={product.id} value={String(product.id)}>
                                                    {product.nombre} · {product.codigo}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <input type="hidden" name="canal" value="email" />
                                <input type="hidden" name="estado" value="borrador" />
                                <DialogFooter><Button type="submit">Crear campaña</Button></DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 lg:flex-row">
                    <div className="relative flex-1">
                        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            className="pl-9"
                            value={search}
                            placeholder="Buscar por nombre, código o asunto..."
                            onChange={(event) => setSearch(event.target.value)}
                            onKeyDown={(event) => event.key === 'Enter' && applyFilters({ search: search || undefined })}
                        />
                    </div>
                    <Select value={filters.estado || 'all'} onValueChange={(value) => applyFilters({ estado: value === 'all' ? undefined : value })}>
                        <SelectTrigger className="w-full lg:w-48"><SelectValue placeholder="Estado" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos los estados</SelectItem>
                            {['borrador', 'programada', 'activa', 'pausada', 'finalizada'].map((status) => (
                                <SelectItem key={status} value={status}>{status}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={filters.canal || 'all'} onValueChange={(value) => applyFilters({ canal: value === 'all' ? undefined : value })}>
                        <SelectTrigger className="w-full lg:w-44"><SelectValue placeholder="Canal" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos los canales</SelectItem>
                            {['email', 'sms', 'whatsapp', 'llamada', 'ads', 'mixto'].map((channel) => (
                                <SelectItem key={channel} value={channel}>{channel}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button onClick={() => applyFilters({ search: search || undefined })}>Filtrar</Button>
                </div>

                {campanas.data.length === 0 ? (
                    <EmptyState icon={Megaphone} title="No hay campañas" description="Ajusta los filtros o crea tu primera campaña." />
                ) : (
                    <div className="overflow-hidden rounded-xl border bg-card">
                        <Table>
                            <TableHeader><TableRow>
                                <TableHead>Campaña</TableHead><TableHead>Producto</TableHead>
                                <TableHead>Canal</TableHead><TableHead>Estado</TableHead>
                                <TableHead className="text-right">Destinatarios</TableHead>
                            </TableRow></TableHeader>
                            <TableBody>
                                {campanas.data.map((campaign) => (
                                    <TableRow key={campaign.id}>
                                        <TableCell>
                                            <Link href={`/campanas/${campaign.id}`} className="font-medium hover:underline">{campaign.nombre}</Link>
                                            <div className="text-xs text-muted-foreground">{campaign.codigo}{campaign.asunto ? ` · ${campaign.asunto}` : ''}</div>
                                        </TableCell>
                                        <TableCell>{campaign.producto?.nombre ?? '—'}</TableCell>
                                        <TableCell className="capitalize">{campaign.canal}</TableCell>
                                        <TableCell><StatusBadge status={campaign.estado} /></TableCell>
                                        <TableCell className="text-right">{campaign.destinatarios_count.toLocaleString('es-AR')}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        <div className="border-t p-3"><Pagination links={campanas.links} /></div>
                    </div>
                )}
            </div>
        </>
    );
}

CampaignsIndex.layout = {
    breadcrumbs: [{ title: 'Campañas', href: '/campanas' }],
};
