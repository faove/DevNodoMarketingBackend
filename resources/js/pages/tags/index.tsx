import { Head, router } from '@inertiajs/react';
import { FormEvent, useState } from 'react';
import { Plus, Tags } from 'lucide-react';
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

type Tag = {
    id: number;
    codigo: string;
    nombre: string;
    color: string | null;
    descripcion: string | null;
    clientes_count: number;
};

export default function TagsIndex({ tags }: { tags: Tag[] }) {
    const [open, setOpen] = useState(false);

    const createTag = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        router.post('/tags', new FormData(event.currentTarget), {
            preserveScroll: true,
            onSuccess: () => setOpen(false),
        });
    };

    return (
        <>
            <Head title="Tags" />
            <div className="flex flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <Heading title="Tags" description="Clasifica clientes con etiquetas visuales." />
                    <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild><Button><Plus className="size-4" />Nuevo tag</Button></DialogTrigger>
                        <DialogContent>
                            <DialogHeader><DialogTitle>Crear tag</DialogTitle></DialogHeader>
                            <form onSubmit={createTag} className="grid gap-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="grid gap-2"><Label htmlFor="codigo">Código</Label><Input id="codigo" name="codigo" required maxLength={60} /></div>
                                    <div className="grid gap-2"><Label htmlFor="nombre">Nombre</Label><Input id="nombre" name="nombre" required maxLength={120} /></div>
                                </div>
                                <div className="grid gap-2"><Label htmlFor="color">Color</Label><Input id="color" name="color" type="color" defaultValue="#6366f1" className="h-10 p-1" /></div>
                                <div className="grid gap-2">
                                    <Label htmlFor="descripcion">Descripción</Label>
                                    <textarea id="descripcion" name="descripcion" rows={3} className="w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                                </div>
                                <DialogFooter><Button type="submit">Crear tag</Button></DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                {tags.length === 0 ? (
                    <EmptyState icon={Tags} title="No hay tags" description="Crea etiquetas para clasificar y encontrar clientes fácilmente." />
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {tags.map((tag) => (
                            <Card key={tag.id}>
                                <CardHeader>
                                    <div className="flex items-start gap-3">
                                        <span className="mt-1 size-4 shrink-0 rounded-full border" style={{ backgroundColor: tag.color || '#94a3b8' }} />
                                        <div className="min-w-0"><CardTitle>{tag.nombre}</CardTitle><CardDescription>{tag.codigo}</CardDescription></div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground">{tag.descripcion || 'Sin descripción.'}</p>
                                    <p className="mt-4 text-sm font-semibold">{tag.clientes_count.toLocaleString('es-AR')} clientes</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}

TagsIndex.layout = {
    breadcrumbs: [{ title: 'Tags', href: '/tags' }],
};
