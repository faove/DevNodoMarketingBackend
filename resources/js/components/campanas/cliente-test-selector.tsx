import { useEffect, useState } from 'react';
import { Search, UserRound } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { EmptyState } from '@/components/empty-state';

export type ClienteBusqueda = {
    id: number;
    nombre_completo: string;
    nombre: string | null;
    apellido: string | null;
    razon_social: string | null;
    ciudad: string | null;
    provincia: string | null;
    email_principal: string | null;
    opt_in_email: boolean;
    contactos_email: { id: number; valor: string; etiqueta: string | null }[];
};

export function ClienteTestSelector({
    open,
    onOpenChange,
    onSelect,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelect: (cliente: ClienteBusqueda) => void;
}) {
    const [search, setSearch] = useState('');
    const [results, setResults] = useState<ClienteBusqueda[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;

        setLoading(true);
        setError(null);

        const timeout = setTimeout(() => {
            api.get<{ data: ClienteBusqueda[] }>(`/clientes/buscar?q=${encodeURIComponent(search)}`)
                .then((response) => setResults(response.data))
                .catch(() => setError('No se pudo buscar clientes.'))
                .finally(() => setLoading(false));
        }, 300);

        return () => clearTimeout(timeout);
    }, [open, search]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>Elegir cliente de prueba</DialogTitle>
                </DialogHeader>
                <div className="relative">
                    <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        autoFocus
                        placeholder="Buscar por nombre, razón social o email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <div className="max-h-96 overflow-y-auto rounded-lg border">
                    {loading ? (
                        <div className="flex items-center justify-center py-10">
                            <Spinner className="size-5" />
                        </div>
                    ) : error ? (
                        <p className="p-4 text-sm text-destructive">{error}</p>
                    ) : results.length === 0 ? (
                        <EmptyState
                            icon={UserRound}
                            title="Sin resultados"
                            description="Probá con otro nombre, razón social o email."
                            className="border-0 py-10"
                        />
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Cliente</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Opt-in</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {results.map((cliente) => (
                                    <TableRow
                                        key={cliente.id}
                                        className="cursor-pointer"
                                        onClick={() => {
                                            onSelect(cliente);
                                            onOpenChange(false);
                                        }}
                                    >
                                        <TableCell className="font-medium">{cliente.nombre_completo}</TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {cliente.email_principal ?? cliente.contactos_email[0]?.valor ?? '—'}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={cliente.opt_in_email ? 'success' : 'muted'}>
                                                {cliente.opt_in_email ? 'Sí' : 'No'}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                    Cancelar
                </Button>
            </DialogContent>
        </Dialog>
    );
}
