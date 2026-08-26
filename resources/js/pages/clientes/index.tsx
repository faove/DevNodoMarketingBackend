import { Head, Link, router } from '@inertiajs/react';
import { FormEvent, useState } from 'react';
import { Plus, Search, Users } from 'lucide-react';
import Heading from '@/components/heading';
import { EmptyState } from '@/components/empty-state';
import { Pagination } from '@/components/pagination';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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

type ClienteRow = {
    id: number;
    razon_social: string | null;
    nombre: string | null;
    apellido: string | null;
    email_principal: string | null;
    telefono_principal: string | null;
    direccion: string | null;
    ciudad: string | null;
    provincia: string | null;
    estado: string;
    opt_in_email: boolean;
};

type Paginated<T> = {
    data: T[];
    links: { url: string | null; label: string; active: boolean }[];
    total: number;
};

function displayName(c: ClienteRow) {
    return (
        c.razon_social ||
        [c.nombre, c.apellido].filter(Boolean).join(' ') ||
        c.email_principal ||
        `#${c.id}`
    );
}

export default function ClientesIndex({
    clientes,
    filters,
}: {
    clientes: Paginated<ClienteRow>;
    filters: {
        search: string;
        estado: string;
        con_email: boolean;
        opt_in_email: boolean;
        provincia: string;
        sort: string;
        direction: string;
    };
}) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [open, setOpen] = useState(false);

    const applyFilters = (overrides: Record<string, unknown> = {}) => {
        router.get(
            '/clientes',
            {
                search,
                estado: filters.estado || undefined,
                con_email: filters.con_email || undefined,
                opt_in_email: filters.opt_in_email || undefined,
                provincia: filters.provincia || undefined,
                sort: filters.sort,
                direction: filters.direction,
                ...overrides,
            },
            { preserveState: true, replace: true },
        );
    };

    const createCliente = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        router.post('/clientes', form, {
            onSuccess: () => setOpen(false),
        });
    };

    return (
        <>
            <Head title="Clientes" />
            <div className="flex flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <Heading
                        title="Clientes"
                        description={`${clientes.total.toLocaleString('es-AR')} registros en el CRM.`}
                    />
                    <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="size-4" />
                                Nuevo cliente
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Crear cliente</DialogTitle>
                            </DialogHeader>
                            <form
                                onSubmit={createCliente}
                                className="grid gap-3"
                            >
                                <div className="grid gap-2">
                                    <Label htmlFor="razon_social">
                                        Razón social
                                    </Label>
                                    <Input
                                        id="razon_social"
                                        name="razon_social"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="grid gap-2">
                                        <Label htmlFor="nombre">Nombre</Label>
                                        <Input id="nombre" name="nombre" />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="apellido">
                                            Apellido
                                        </Label>
                                        <Input id="apellido" name="apellido" />
                                    </div>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="email_principal">
                                        Email
                                    </Label>
                                    <Input
                                        id="email_principal"
                                        name="email_principal"
                                        type="email"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="telefono_principal">
                                        Teléfono
                                    </Label>
                                    <Input
                                        id="telefono_principal"
                                        name="telefono_principal"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="direccion">Dirección</Label>
                                    <Input id="direccion" name="direccion" />
                                </div>
                                <input
                                    type="hidden"
                                    name="estado"
                                    value="nuevo"
                                />
                                <input type="hidden" name="tipo" value="lead" />
                                <DialogFooter>
                                    <Button type="submit">Guardar</Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 lg:flex-row lg:items-center">
                    <div className="relative flex-1">
                        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            className="pl-9"
                            placeholder="Buscar por nombre, email, teléfono, dirección..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    applyFilters({ search });
                                }
                            }}
                        />
                    </div>
                    <Select
                        value={filters.estado || 'all'}
                        onValueChange={(value) =>
                            applyFilters({
                                estado: value === 'all' ? '' : value,
                            })
                        }
                    >
                        <SelectTrigger className="w-full lg:w-48">
                            <SelectValue placeholder="Estado" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos los estados</SelectItem>
                            {[
                                'nuevo',
                                'contactado',
                                'calificado',
                                'propuesta',
                                'negociacion',
                                'ganado',
                                'perdido',
                                'no_contactar',
                            ].map((estado) => (
                                <SelectItem key={estado} value={estado}>
                                    {estado}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <label className="flex items-center gap-2 text-sm">
                        <Checkbox
                            checked={filters.con_email}
                            onCheckedChange={(checked) =>
                                applyFilters({ con_email: Boolean(checked) })
                            }
                        />
                        Con email
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                        <Checkbox
                            checked={filters.opt_in_email}
                            onCheckedChange={(checked) =>
                                applyFilters({
                                    opt_in_email: Boolean(checked),
                                })
                            }
                        />
                        Opt-in
                    </label>
                    <Button onClick={() => applyFilters({ search })}>
                        Filtrar
                    </Button>
                </div>

                {clientes.data.length === 0 ? (
                    <EmptyState
                        icon={Users}
                        title="No hay clientes con estos filtros"
                        description="Ajusta la búsqueda o crea un nuevo lead para empezar."
                    />
                ) : (
                    <div className="overflow-hidden rounded-xl border bg-card">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Cliente</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Teléfono</TableHead>
                                    <TableHead>Dirección</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead>Opt-in</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {clientes.data.map((cliente) => (
                                    <TableRow key={cliente.id}>
                                        <TableCell>
                                            <Link
                                                href={`/clientes/${cliente.id}`}
                                                className="font-medium hover:underline"
                                            >
                                                {displayName(cliente)}
                                            </Link>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {cliente.email_principal || '—'}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {cliente.telefono_principal || '—'}
                                        </TableCell>
                                        <TableCell>
                                            <div className="max-w-[240px] truncate">
                                                {cliente.direccion || '—'}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {[
                                                    cliente.ciudad,
                                                    cliente.provincia,
                                                ]
                                                    .filter(Boolean)
                                                    .join(', ')}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <StatusBadge
                                                status={cliente.estado}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            {cliente.opt_in_email
                                                ? 'Sí'
                                                : 'No'}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        <div className="border-t p-3">
                            <Pagination links={clientes.links} />
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

ClientesIndex.layout = {
    breadcrumbs: [{ title: 'Clientes', href: '/clientes' }],
};
