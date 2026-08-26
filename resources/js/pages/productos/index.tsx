import { Head, router } from '@inertiajs/react';
import { FormEvent, useState } from 'react';
import { Box, Plus } from 'lucide-react';
import Heading from '@/components/heading';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
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

type Product = {
    id: number;
    codigo: string;
    nombre: string;
    categoria: string;
    descripcion: string | null;
    url: string | null;
    activo: boolean;
    campanas_count: number;
};

export default function ProductsIndex({ productos }: { productos: Product[] }) {
    const [open, setOpen] = useState(false);

    const createProduct = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        router.post('/productos', new FormData(event.currentTarget), {
            preserveScroll: true,
            onSuccess: () => setOpen(false),
        });
    };

    return (
        <>
            <Head title="Productos" />
            <div className="flex flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <Heading title="Productos" description="Catálogo comercial asociado a las campañas." />
                    <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild><Button><Plus className="size-4" />Nuevo producto</Button></DialogTrigger>
                        <DialogContent>
                            <DialogHeader><DialogTitle>Crear producto</DialogTitle></DialogHeader>
                            <form onSubmit={createProduct} className="grid gap-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="grid gap-2"><Label htmlFor="codigo">Código</Label><Input id="codigo" name="codigo" required maxLength={40} /></div>
                                    <div className="grid gap-2"><Label htmlFor="nombre">Nombre</Label><Input id="nombre" name="nombre" required maxLength={120} /></div>
                                </div>
                                <div className="grid gap-2"><Label htmlFor="categoria">Categoría</Label><Input id="categoria" name="categoria" required maxLength={60} /></div>
                                <div className="grid gap-2"><Label htmlFor="url">URL</Label><Input id="url" name="url" type="url" maxLength={255} /></div>
                                <div className="grid gap-2">
                                    <Label htmlFor="descripcion">Descripción</Label>
                                    <textarea id="descripcion" name="descripcion" rows={3} className="w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                                </div>
                                <DialogFooter><Button type="submit">Crear producto</Button></DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                {productos.length === 0 ? (
                    <EmptyState icon={Box} title="No hay productos" description="Agrega productos para relacionarlos con tus campañas." />
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {productos.map((product) => (
                            <Card key={product.id}>
                                <CardHeader>
                                    <div className="flex items-start justify-between gap-3">
                                        <div><CardTitle>{product.nombre}</CardTitle><CardDescription>{product.codigo} · {product.categoria}</CardDescription></div>
                                        <span className={`size-2.5 rounded-full ${product.activo ? 'bg-success' : 'bg-muted-foreground'}`} aria-label={product.activo ? 'Activo' : 'Inactivo'} />
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground">{product.descripcion || 'Sin descripción.'}</p>
                                    <div className="mt-4 flex items-center justify-between text-sm">
                                        <span className="font-semibold">{product.campanas_count.toLocaleString('es-AR')} campañas</span>
                                        {product.url ? <a href={product.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">Ver producto</a> : null}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}

ProductsIndex.layout = {
    breadcrumbs: [{ title: 'Productos', href: '/productos' }],
};
