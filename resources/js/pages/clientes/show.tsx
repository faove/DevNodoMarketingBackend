import { Form, Head, Link } from '@inertiajs/react';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

type Cliente = {
    id: number;
    tipo: string;
    razon_social: string | null;
    nombre: string | null;
    apellido: string | null;
    email_principal: string | null;
    telefono_principal: string | null;
    whatsapp: string | null;
    direccion: string | null;
    ciudad: string | null;
    provincia: string | null;
    pais: string | null;
    codigo_postal: string | null;
    cuit_cuil: string | null;
    estado: string;
    opt_in_email: boolean;
    opt_in_whatsapp: boolean;
    sector: string | null;
    rubro: string | null;
    notas: string | null;
    contactos: { id: number; tipo: string; valor: string; etiqueta: string | null }[];
    tags: { id: number; nombre: string; color: string | null }[];
    intereses: { id: number; producto?: { nombre: string } | null; prioridad: number }[];
    campana_destinatarios: {
        id: number;
        estado: string;
        destino: string;
        campana?: { id: number; nombre: string; codigo: string } | null;
    }[];
    interacciones: {
        id: number;
        tipo: string;
        direccion: string;
        canal: string;
        asunto: string | null;
        ocurrio_at: string;
    }[];
    consentimientos: {
        id: number;
        canal: string;
        otorgado: boolean;
        registrado_at: string;
    }[];
};

export default function ClienteShow({ cliente }: { cliente: Cliente }) {
    const title =
        cliente.razon_social ||
        [cliente.nombre, cliente.apellido].filter(Boolean).join(' ') ||
        `Cliente #${cliente.id}`;

    return (
        <>
            <Head title={title} />
            <div className="flex flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                        <Heading title={title} description={cliente.email_principal || 'Sin email'} />
                        <div className="mt-2 flex flex-wrap gap-2">
                            <StatusBadge status={cliente.estado} />
                            <Badge variant="outline">{cliente.tipo}</Badge>
                            {cliente.tags.map((tag) => (
                                <Badge key={tag.id} variant="secondary">
                                    {tag.nombre}
                                </Badge>
                            ))}
                        </div>
                    </div>
                    <Button variant="outline" asChild>
                        <Link href="/clientes">Volver</Link>
                    </Button>
                </div>

                <div className="grid gap-4 xl:grid-cols-3">
                    <Card className="xl:col-span-2">
                        <CardHeader>
                            <CardTitle>Datos de contacto</CardTitle>
                            <CardDescription>
                                Edita la información principal del lead/cliente
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Form
                                action={`/clientes/${cliente.id}`}
                                method="post"
                                className="grid gap-4 md:grid-cols-2"
                            >
                                {({ processing, errors }) => (
                                    <>
                                        <input type="hidden" name="_method" value="put" />
                                        <div className="grid gap-2">
                                            <Label htmlFor="razon_social">Razón social</Label>
                                            <Input id="razon_social" name="razon_social" defaultValue={cliente.razon_social ?? ''} />
                                            <InputError message={errors.razon_social} />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="cuit_cuil">CUIT/CUIL</Label>
                                            <Input id="cuit_cuil" name="cuit_cuil" defaultValue={cliente.cuit_cuil ?? ''} />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="nombre">Nombre</Label>
                                            <Input id="nombre" name="nombre" defaultValue={cliente.nombre ?? ''} />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="apellido">Apellido</Label>
                                            <Input id="apellido" name="apellido" defaultValue={cliente.apellido ?? ''} />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="email_principal">Email</Label>
                                            <Input id="email_principal" name="email_principal" type="email" defaultValue={cliente.email_principal ?? ''} />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="telefono_principal">Teléfono</Label>
                                            <Input id="telefono_principal" name="telefono_principal" defaultValue={cliente.telefono_principal ?? ''} />
                                        </div>
                                        <div className="grid gap-2 md:col-span-2">
                                            <Label htmlFor="direccion">Dirección</Label>
                                            <Input id="direccion" name="direccion" defaultValue={cliente.direccion ?? ''} />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="ciudad">Ciudad</Label>
                                            <Input id="ciudad" name="ciudad" defaultValue={cliente.ciudad ?? ''} />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="provincia">Provincia</Label>
                                            <Input id="provincia" name="provincia" defaultValue={cliente.provincia ?? ''} />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="estado">Estado</Label>
                                            <Input id="estado" name="estado" defaultValue={cliente.estado} />
                                        </div>
                                        <div className="flex items-center gap-6 pt-6">
                                            <label className="flex items-center gap-2 text-sm">
                                                <Checkbox name="opt_in_email" value="1" defaultChecked={cliente.opt_in_email} />
                                                Opt-in email
                                            </label>
                                            <label className="flex items-center gap-2 text-sm">
                                                <Checkbox name="opt_in_whatsapp" value="1" defaultChecked={cliente.opt_in_whatsapp} />
                                                Opt-in WhatsApp
                                            </label>
                                        </div>
                                        <div className="md:col-span-2">
                                            <Button disabled={processing}>Guardar cambios</Button>
                                        </div>
                                    </>
                                )}
                            </Form>
                        </CardContent>
                    </Card>

                    <div className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Contactos extra</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {cliente.contactos.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">Sin contactos adicionales.</p>
                                ) : (
                                    cliente.contactos.map((c) => (
                                        <div key={c.id} className="rounded-lg border px-3 py-2 text-sm">
                                            <div className="font-medium capitalize">{c.tipo}</div>
                                            <div className="text-muted-foreground">{c.valor}</div>
                                        </div>
                                    ))
                                )}
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Intereses</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {cliente.intereses.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">Sin productos asociados.</p>
                                ) : (
                                    cliente.intereses.map((i) => (
                                        <div key={i.id} className="flex justify-between text-sm">
                                            <span>{i.producto?.nombre ?? 'Producto'}</span>
                                            <Badge variant="outline">P{i.prioridad}</Badge>
                                        </div>
                                    ))
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Campañas</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Campaña</TableHead>
                                        <TableHead>Destino</TableHead>
                                        <TableHead>Estado</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {cliente.campana_destinatarios.map((d) => (
                                        <TableRow key={d.id}>
                                            <TableCell>
                                                {d.campana ? (
                                                    <Link href={`/campanas/${d.campana.id}`} className="hover:underline">
                                                        {d.campana.nombre}
                                                    </Link>
                                                ) : '—'}
                                            </TableCell>
                                            <TableCell>{d.destino}</TableCell>
                                            <TableCell><StatusBadge status={d.estado} /></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Interacciones</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Tipo</TableHead>
                                        <TableHead>Dirección</TableHead>
                                        <TableHead>Fecha</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {cliente.interacciones.map((i) => (
                                        <TableRow key={i.id}>
                                            <TableCell>{i.tipo}</TableCell>
                                            <TableCell><StatusBadge status={i.direccion} /></TableCell>
                                            <TableCell>{new Date(i.ocurrio_at).toLocaleString('es-AR')}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
}

ClienteShow.layout = {
    breadcrumbs: [
        { title: 'Clientes', href: '/clientes' },
        { title: 'Detalle', href: '#' },
    ],
};
