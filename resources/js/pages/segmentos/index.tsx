import { Head, router } from '@inertiajs/react';
import { FormEvent, useState } from 'react';
import { Plus, UsersRound } from 'lucide-react';
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

type Segment = {
    id: number;
    codigo: string;
    nombre: string;
    descripcion: string | null;
    activo: boolean;
};

export default function SegmentsIndex({ segmentos }: { segmentos: Segment[] }) {
    const [open, setOpen] = useState(false);

    const createSegment = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        router.post('/segmentos', new FormData(event.currentTarget), {
            preserveScroll: true,
            onSuccess: () => setOpen(false),
        });
    };

    return (
        <>
            <Head title="Segmentos" />
            <div className="flex flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <Heading title="Segmentos" description="Organiza audiencias reutilizables para tus campañas." />
                    <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild><Button><Plus className="size-4" />Nuevo segmento</Button></DialogTrigger>
                        <DialogContent>
                            <DialogHeader><DialogTitle>Crear segmento</DialogTitle></DialogHeader>
                            <form onSubmit={createSegment} className="grid gap-4">
                                <div className="grid gap-2"><Label htmlFor="codigo">Código</Label><Input id="codigo" name="codigo" required maxLength={60} /></div>
                                <div className="grid gap-2"><Label htmlFor="nombre">Nombre</Label><Input id="nombre" name="nombre" required maxLength={120} /></div>
                                <div className="grid gap-2">
                                    <Label htmlFor="descripcion">Descripción</Label>
                                    <textarea id="descripcion" name="descripcion" rows={4} className="w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                                </div>
                                <DialogFooter><Button type="submit">Crear segmento</Button></DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                {segmentos.length === 0 ? (
                    <EmptyState icon={UsersRound} title="No hay segmentos" description="Crea una audiencia para organizar tus próximos envíos." />
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {segmentos.map((segment) => (
                            <Card key={segment.id}>
                                <CardHeader>
                                    <div className="flex items-start justify-between gap-3">
                                        <div><CardTitle>{segment.nombre}</CardTitle><CardDescription>{segment.codigo}</CardDescription></div>
                                        <span className={`size-2.5 rounded-full ${segment.activo ? 'bg-success' : 'bg-muted-foreground'}`} aria-label={segment.activo ? 'Activo' : 'Inactivo'} />
                                    </div>
                                </CardHeader>
                                <CardContent className="text-sm text-muted-foreground">{segment.descripcion || 'Sin descripción.'}</CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}

SegmentsIndex.layout = {
    breadcrumbs: [{ title: 'Segmentos', href: '/segmentos' }],
};
