import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const statusMap: Record<string, { label: string; className: string }> = {
    nuevo: { label: 'Nuevo', className: 'bg-muted text-muted-foreground' },
    contactado: { label: 'Contactado', className: 'bg-info/15 text-info' },
    calificado: { label: 'Calificado', className: 'bg-primary/15 text-primary' },
    propuesta: { label: 'Propuesta', className: 'bg-secondary/15 text-secondary' },
    negociacion: { label: 'Negociación', className: 'bg-warning/15 text-warning' },
    ganado: { label: 'Ganado', className: 'bg-success/15 text-success' },
    perdido: { label: 'Perdido', className: 'bg-destructive/15 text-destructive' },
    no_contactar: { label: 'No contactar', className: 'bg-muted text-muted-foreground' },
    borrador: { label: 'Borrador', className: 'bg-muted text-muted-foreground' },
    programada: { label: 'Programada', className: 'bg-warning/15 text-warning' },
    activa: { label: 'Activa', className: 'bg-primary/15 text-primary' },
    pausada: { label: 'Pausada', className: 'bg-warning/15 text-warning' },
    finalizada: { label: 'Finalizada', className: 'bg-success/15 text-success' },
    pendiente: { label: 'Pendiente', className: 'bg-warning/15 text-warning' },
    enviado: { label: 'Enviado', className: 'bg-primary/15 text-primary' },
    entregado: { label: 'Entregado', className: 'bg-success/15 text-success' },
    abierto: { label: 'Abierto', className: 'bg-success/15 text-success' },
    click: { label: 'Click', className: 'bg-secondary/15 text-secondary' },
    respondido: { label: 'Respondido', className: 'bg-info/15 text-info' },
    rebote: { label: 'Rebote', className: 'bg-destructive/15 text-destructive' },
    fallido: { label: 'Fallido', className: 'bg-destructive/15 text-destructive' },
    omitido: { label: 'Omitido', className: 'bg-muted text-muted-foreground' },
    inbound: { label: 'Inbound', className: 'bg-info/15 text-info' },
    outbound: { label: 'Outbound', className: 'bg-primary/15 text-primary' },
    ok: { label: 'OK', className: 'bg-success/15 text-success' },
    omitido_row: { label: 'Omitido', className: 'bg-muted text-muted-foreground' },
    error: { label: 'Error', className: 'bg-destructive/15 text-destructive' },
};

export function StatusBadge({
    status,
    className,
}: {
    status?: string | null;
    className?: string;
}) {
    if (!status) {
        return null;
    }

    const mapped = statusMap[status] ?? {
        label: status,
        className: 'bg-muted text-muted-foreground',
    };

    return (
        <Badge
            variant="outline"
            className={cn('border-0 font-medium', mapped.className, className)}
        >
            {mapped.label}
        </Badge>
    );
}
