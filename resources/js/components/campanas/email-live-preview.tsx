import { useState } from 'react';
import { Monitor, Smartphone } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

export function EmailLivePreview({
    from,
    to,
    subject,
    html,
}: {
    from: string;
    to: string;
    subject: string;
    html: string;
}) {
    const [viewport, setViewport] = useState<'desktop' | 'mobile'>('desktop');

    return (
        <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">Vista previa</p>
                <ToggleGroup
                    type="single"
                    variant="outline"
                    size="sm"
                    value={viewport}
                    onValueChange={(value) => value && setViewport(value as 'desktop' | 'mobile')}
                >
                    <ToggleGroupItem value="desktop" aria-label="Vista escritorio">
                        <Monitor className="size-4" />
                    </ToggleGroupItem>
                    <ToggleGroupItem value="mobile" aria-label="Vista móvil">
                        <Smartphone className="size-4" />
                    </ToggleGroupItem>
                </ToggleGroup>
            </div>

            <div className="space-y-1 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                <div className="flex gap-2">
                    <span className="w-14 shrink-0 text-muted-foreground">De:</span>
                    <span className="truncate">{from || '—'}</span>
                </div>
                <div className="flex gap-2">
                    <span className="w-14 shrink-0 text-muted-foreground">Para:</span>
                    <span className="truncate">{to || '—'}</span>
                </div>
                <div className="flex gap-2">
                    <span className="w-14 shrink-0 text-muted-foreground">Asunto:</span>
                    <span className="truncate font-medium">{subject || '(sin asunto)'}</span>
                </div>
            </div>

            <div className="flex justify-center rounded-lg border bg-muted/30 p-3">
                <iframe
                    title="Vista previa del email"
                    srcDoc={html || '<p style="font-family:sans-serif;color:#888;padding:1rem;">Sin contenido</p>'}
                    sandbox=""
                    className="h-[480px] rounded-md border bg-white transition-[width] duration-200"
                    style={{ width: viewport === 'desktop' ? '100%' : '375px' }}
                />
            </div>
        </div>
    );
}
