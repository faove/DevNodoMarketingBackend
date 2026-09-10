import { FormEvent, useMemo, useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { toast } from 'sonner';
import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Auth } from '@/types';

type Plantilla = {
    id: number;
    codigo: string;
    nombre: string;
    asunto_default: string | null;
    html: string;
    descripcion: string | null;
    activo: boolean;
};

export default function PlantillaEdit({ plantilla }: { plantilla: Plantilla | null }) {
    const isNew = plantilla === null;
    const { flash } = usePage<{ auth: Auth; flash?: { success?: string } }>().props;

    const [codigo, setCodigo] = useState(plantilla?.codigo ?? '');
    const [nombre, setNombre] = useState(plantilla?.nombre ?? '');
    const [asunto, setAsunto] = useState(plantilla?.asunto_default ?? '');
    const [descripcion, setDescripcion] = useState(plantilla?.descripcion ?? '');
    const [html, setHtml] = useState(plantilla?.html ?? '');
    const [activo, setActivo] = useState(plantilla?.activo ?? true);
    const [saving, setSaving] = useState(false);

    const previewHtml = useMemo(() => html || '<p style="padding:16px;color:#666">Sin contenido</p>', [html]);

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        setSaving(true);

        const payload = {
            codigo,
            nombre,
            asunto_default: asunto || null,
            descripcion: descripcion || null,
            html,
            activo,
        };

        const options = {
            preserveScroll: true,
            onSuccess: () => {
                toast.success(flash?.success || (isNew ? 'Plantilla creada.' : 'Plantilla guardada.'));
            },
            onError: () => toast.error('No se pudo guardar la plantilla.'),
            onFinish: () => setSaving(false),
        };

        if (isNew) {
            router.post('/plantillas', payload, options);
        } else {
            router.put(`/plantillas/${plantilla.id}`, payload, options);
        }
    };

    return (
        <>
            <Head title={isNew ? 'Nueva plantilla' : `Editar — ${plantilla.nombre}`} />
            <div className="flex flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <Heading
                        title={isNew ? 'Nueva plantilla' : plantilla.nombre}
                        description="Editá el HTML y el asunto por defecto. Luego aplicála desde una campaña."
                    />
                    <Button variant="outline" asChild>
                        <Link href="/plantillas">Volver</Link>
                    </Button>
                </div>

                <form onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Datos</CardTitle>
                            <CardDescription>Identificación y contenido fuente de la plantilla.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-4">
                            <div className="grid gap-3 md:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="codigo">Código</Label>
                                    <Input id="codigo" value={codigo} onChange={(e) => setCodigo(e.target.value)} required maxLength={60} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="nombre">Nombre</Label>
                                    <Input id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required maxLength={160} />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="asunto">Asunto por defecto</Label>
                                <Input id="asunto" value={asunto} onChange={(e) => setAsunto(e.target.value)} maxLength={255} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="descripcion">Descripción</Label>
                                <textarea
                                    id="descripcion"
                                    value={descripcion}
                                    onChange={(e) => setDescripcion(e.target.value)}
                                    rows={2}
                                    className="w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="html">HTML</Label>
                                <textarea
                                    id="html"
                                    value={html}
                                    onChange={(e) => setHtml(e.target.value)}
                                    required
                                    rows={22}
                                    className="w-full rounded-md border bg-transparent px-3 py-2 font-mono text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                />
                            </div>
                            <label className="flex items-center gap-2 text-sm">
                                <Checkbox checked={activo} onCheckedChange={(checked) => setActivo(Boolean(checked))} />
                                Plantilla activa
                            </label>
                            <div>
                                <Button type="submit" disabled={saving}>
                                    {saving ? 'Guardando...' : isNew ? 'Crear plantilla' : 'Guardar cambios'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Vista previa</CardTitle>
                            <CardDescription>Render aproximado del HTML (sin merge tags).</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <iframe title="Preview plantilla" srcDoc={previewHtml} sandbox="" className="h-[42rem] w-full rounded-md border bg-white" />
                        </CardContent>
                    </Card>
                </form>
            </div>
        </>
    );
}

PlantillaEdit.layout = {
    breadcrumbs: [
        { title: 'Plantillas', href: '/plantillas' },
        { title: 'Editar', href: '#' },
    ],
};
