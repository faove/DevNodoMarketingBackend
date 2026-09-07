import { Link, router } from '@inertiajs/react';
import { useMemo, useRef, useState } from 'react';
import { Eye, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { insertAtCursor } from '@/lib/insert-at-cursor';
import { renderTemplate } from '@/lib/merge-tags';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MergeTagPanel } from '@/components/campanas/merge-tag-panel';
import { EmailLivePreview } from '@/components/campanas/email-live-preview';
import { ClienteTestSelector, type ClienteBusqueda } from '@/components/campanas/cliente-test-selector';

type Campaign = {
    id: number;
    codigo: string;
    nombre: string;
    canal: string;
    objetivo: string | null;
    producto_id: number | null;
    estado: string;
    asunto: string | null;
    plantilla_html: string | null;
    mensaje_preview: string | null;
    programada_at: string | null;
};

const CLIENTE_EJEMPLO = {
    nombre_completo: 'Nombre Apellido',
    nombre: 'Nombre',
    apellido: 'Apellido',
    razon_social: 'Empresa Ejemplo S.A.',
    ciudad: 'Córdoba',
    provincia: 'Córdoba',
    email_principal: 'cliente@ejemplo.com',
};

export function CampaignEmailEditor({ campana, empresa }: { campana: Campaign; empresa: { nombre: string; email: string } }) {
    const [asunto, setAsunto] = useState(campana.asunto ?? '');
    const [plantillaHtml, setPlantillaHtml] = useState(campana.plantilla_html ?? '');
    const [activeField, setActiveField] = useState<'asunto' | 'plantilla'>('plantilla');
    const [testCliente, setTestCliente] = useState<ClienteBusqueda | null>(null);
    const [testContactoId, setTestContactoId] = useState<string>('principal');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    const asuntoRef = useRef<HTMLInputElement>(null);
    const plantillaRef = useRef<HTMLTextAreaElement>(null);

    const handleInsert = (tag: string) => {
        if (activeField === 'asunto' && asuntoRef.current) {
            setAsunto(insertAtCursor(asuntoRef.current, tag));
        } else if (plantillaRef.current) {
            setPlantillaHtml(insertAtCursor(plantillaRef.current, tag));
        }
    };

    const contactoSeleccionado = testCliente?.contactos_email.find((c) => String(c.id) === testContactoId);

    const valores = useMemo(() => {
        const cliente = testCliente
            ? {
                  nombre_completo: testCliente.nombre_completo,
                  nombre: testCliente.nombre ?? '',
                  apellido: testCliente.apellido ?? '',
                  razon_social: testCliente.razon_social ?? '',
                  ciudad: testCliente.ciudad ?? '',
                  provincia: testCliente.provincia ?? '',
                  email: contactoSeleccionado?.valor ?? testCliente.email_principal ?? '',
              }
            : { ...CLIENTE_EJEMPLO, email: CLIENTE_EJEMPLO.email_principal };

        return {
            cliente,
            empresa: { nombre: empresa.nombre ?? '', email: empresa.email ?? '' },
        };
    }, [testCliente, contactoSeleccionado, empresa]);

    const renderedAsunto = renderTemplate(asunto, valores);
    const renderedHtml = renderTemplate(plantillaHtml, valores);
    const to = contactoSeleccionado?.valor ?? testCliente?.email_principal ?? CLIENTE_EJEMPLO.email_principal;

    const handleSave = () => {
        setSaving(true);
        router.put(
            `/campanas/${campana.id}`,
            {
                codigo: campana.codigo,
                nombre: campana.nombre,
                canal: campana.canal,
                estado: campana.estado,
                objetivo: campana.objetivo,
                producto_id: campana.producto_id,
                mensaje_preview: campana.mensaje_preview,
                programada_at: campana.programada_at,
                asunto,
                plantilla_html: plantillaHtml,
            },
            {
                preserveScroll: true,
                onFinish: () => setSaving(false),
            },
        );
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                    <CardTitle>Email</CardTitle>
                    <CardDescription>Editá el contenido, personalizalo con merge tags y probá el resultado.</CardDescription>
                </div>
                <Button variant="outline" asChild>
                    <Link href={`/campanas/${campana.id}/preview`}>
                        <Eye />
                        Vista previa de audiencia
                    </Link>
                </Button>
            </CardHeader>
            <CardContent className="grid gap-6 xl:grid-cols-2">
                <div className="flex flex-col gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="email-asunto">Asunto</Label>
                        <Input
                            id="email-asunto"
                            ref={asuntoRef}
                            value={asunto}
                            onChange={(e) => setAsunto(e.target.value)}
                            onFocus={() => setActiveField('asunto')}
                            placeholder="Ej: {{cliente.nombre}}, tenemos una novedad para vos"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="email-plantilla">Plantilla HTML</Label>
                        <textarea
                            id="email-plantilla"
                            ref={plantillaRef}
                            value={plantillaHtml}
                            onChange={(e) => setPlantillaHtml(e.target.value)}
                            onFocus={() => setActiveField('plantilla')}
                            rows={10}
                            className="w-full rounded-md border bg-transparent px-3 py-2 font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            placeholder="<p>Hola {{cliente.nombre_completo}}, ...</p>"
                        />
                    </div>

                    <MergeTagPanel onInsert={handleInsert} />

                    <div className="flex flex-col gap-3 rounded-lg border p-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium">Cliente de prueba</p>
                                <p className="text-sm text-muted-foreground">
                                    {testCliente ? testCliente.nombre_completo : 'Usando datos de ejemplo'}
                                </p>
                            </div>
                            <Button type="button" variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
                                <UserRound />
                                {testCliente ? 'Cambiar' : 'Elegir cliente'}
                            </Button>
                        </div>

                        {testCliente && testCliente.contactos_email.length > 0 ? (
                            <div className="grid gap-2">
                                <Label htmlFor="email-contacto">Email de contacto</Label>
                                <Select value={testContactoId} onValueChange={setTestContactoId}>
                                    <SelectTrigger id="email-contacto">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="principal">
                                            Email principal{testCliente.email_principal ? ` (${testCliente.email_principal})` : ''}
                                        </SelectItem>
                                        {testCliente.contactos_email.map((contacto) => (
                                            <SelectItem key={contacto.id} value={String(contacto.id)}>
                                                {contacto.etiqueta ? `${contacto.etiqueta} — ` : ''}
                                                {contacto.valor}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        ) : null}
                    </div>

                    <div>
                        <Button type="button" onClick={handleSave} disabled={saving}>
                            {saving ? 'Guardando...' : 'Guardar plantilla'}
                        </Button>
                    </div>
                </div>

                <EmailLivePreview from={empresa.email} to={to} subject={renderedAsunto} html={renderedHtml} />
            </CardContent>

            <ClienteTestSelector
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                onSelect={(cliente) => {
                    setTestCliente(cliente);
                    setTestContactoId('principal');
                    toast.success(`Cliente de prueba: ${cliente.nombre_completo}`);
                }}
            />
        </Card>
    );
}
