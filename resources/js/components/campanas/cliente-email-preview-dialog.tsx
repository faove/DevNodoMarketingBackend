import { useState } from 'react';
import { Mail } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';

type CampanaOpcion = { id: number; codigo: string; nombre: string };
type ContactoEmail = { id: number; valor: string; etiqueta: string | null };

export function ClienteEmailPreviewDialog({
    clienteId,
    campanas,
    contactosEmail,
    emailPrincipal,
}: {
    clienteId: number;
    campanas: CampanaOpcion[];
    contactosEmail: ContactoEmail[];
    emailPrincipal: string | null;
}) {
    const [open, setOpen] = useState(false);
    const [campanaId, setCampanaId] = useState<string>(String(campanas[0]?.id ?? ''));
    const [contactoId, setContactoId] = useState<string>('principal');
    const [loading, setLoading] = useState(false);
    const [preview, setPreview] = useState<{ asunto: string; html: string; to: string | null } | null>(null);

    const cargarPreview = () => {
        if (!campanaId) return;

        setLoading(true);
        setPreview(null);

        const params = new URLSearchParams({ cliente_id: String(clienteId) });
        if (contactoId !== 'principal') {
            params.set('contacto_id', contactoId);
        }

        api.get<{ asunto: string; html: string; to: string | null }>(`/campanas/${campanaId}/email-preview?${params.toString()}`)
            .then((response) => setPreview(response))
            .catch(() => toast.error('No se pudo renderizar el email para este cliente.'))
            .finally(() => setLoading(false));
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                setOpen(next);
                if (next) cargarPreview();
            }}
        >
            <DialogTrigger asChild>
                <Button variant="outline">
                    <Mail />
                    Vista previa email
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>Vista previa de email</DialogTitle>
                </DialogHeader>

                <div className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-2">
                        <Label htmlFor="preview-campana">Campaña (borrador)</Label>
                        <Select
                            value={campanaId}
                            onValueChange={(value) => {
                                setCampanaId(value);
                                setTimeout(cargarPreview, 0);
                            }}
                        >
                            <SelectTrigger id="preview-campana">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {campanas.map((campana) => (
                                    <SelectItem key={campana.id} value={String(campana.id)}>
                                        {campana.codigo} — {campana.nombre}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {contactosEmail.length > 0 ? (
                        <div className="grid gap-2">
                            <Label htmlFor="preview-contacto">Email de contacto</Label>
                            <Select
                                value={contactoId}
                                onValueChange={(value) => {
                                    setContactoId(value);
                                    setTimeout(cargarPreview, 0);
                                }}
                            >
                                <SelectTrigger id="preview-contacto">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="principal">Principal{emailPrincipal ? ` (${emailPrincipal})` : ''}</SelectItem>
                                    {contactosEmail.map((contacto) => (
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

                {loading ? (
                    <div className="flex items-center justify-center py-10">
                        <Spinner className="size-5" />
                    </div>
                ) : preview ? (
                    <div className="flex flex-col gap-3">
                        <div className="space-y-1 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                            <div className="flex gap-2">
                                <span className="w-14 shrink-0 text-muted-foreground">Para:</span>
                                <span className="truncate">{preview.to ?? '—'}</span>
                            </div>
                            <div className="flex gap-2">
                                <span className="w-14 shrink-0 text-muted-foreground">Asunto:</span>
                                <span className="truncate font-medium">{preview.asunto}</span>
                            </div>
                        </div>
                        <iframe title="Vista previa" srcDoc={preview.html} sandbox="" className="h-96 rounded-md border bg-white" />
                    </div>
                ) : null}
            </DialogContent>
        </Dialog>
    );
}
