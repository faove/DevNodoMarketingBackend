import { Head, Link, router } from '@inertiajs/react';
import { FileCode2, Plus } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';

type Plantilla = {
    id: number;
    codigo: string;
    nombre: string;
    asunto_default: string | null;
    descripcion: string | null;
    activo: boolean;
    campanas_count: number;
    updated_at: string;
};

export default function PlantillasIndex({
    plantillas,
    daily_send_limit,
}: {
    plantillas: Plantilla[];
    daily_send_limit: number;
}) {
    return (
        <>
            <Head title="Plantillas email" />
            <div className="flex flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <Heading
                        title="Plantillas de email"
                        description={`Biblioteca reutilizable para campañas. Tope de envío: ${daily_send_limit}/día.`}
                    />
                    <Button asChild>
                        <Link href="/plantillas/nueva">
                            <Plus className="size-4" />
                            Nueva plantilla
                        </Link>
                    </Button>
                </div>

                {plantillas.length === 0 ? (
                    <EmptyState
                        icon={FileCode2}
                        title="Sin plantillas"
                        description="Creá la primera plantilla HTML para usarla en campañas."
                        actionHref="/plantillas/nueva"
                        actionLabel="Crear plantilla"
                    />
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {plantillas.map((plantilla) => (
                            <Card key={plantilla.id}>
                                <CardHeader>
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <CardTitle>{plantilla.nombre}</CardTitle>
                                            <CardDescription>{plantilla.codigo}</CardDescription>
                                        </div>
                                        <Badge variant={plantilla.activo ? 'success' : 'muted'}>
                                            {plantilla.activo ? 'Activa' : 'Inactiva'}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <p className="line-clamp-3 text-sm text-muted-foreground">
                                        {plantilla.descripcion || plantilla.asunto_default || 'Sin descripción.'}
                                    </p>
                                    <div className="flex items-center justify-between gap-3 text-sm">
                                        <span className="font-semibold">
                                            {plantilla.campanas_count.toLocaleString('es-AR')} campañas
                                        </span>
                                        <Button variant="outline" size="sm" asChild>
                                            <Link href={`/plantillas/${plantilla.id}/editar`}>Editar</Link>
                                        </Button>
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

PlantillasIndex.layout = {
    breadcrumbs: [{ title: 'Plantillas', href: '/plantillas' }],
};
