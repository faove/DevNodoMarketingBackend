import { Link } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function EmptyState({
    icon: Icon,
    title,
    description,
    actionHref,
    actionLabel,
    className,
}: {
    icon: LucideIcon;
    title: string;
    description: string;
    actionHref?: string;
    actionLabel?: string;
    className?: string;
}) {
    return (
        <div
            className={cn(
                'flex flex-col items-center justify-center rounded-xl border border-dashed bg-card px-6 py-16 text-center',
                className,
            )}
        >
            <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="size-6" />
            </div>
            <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
            <p className="mt-1.5 max-w-md text-sm text-muted-foreground">
                {description}
            </p>
            {actionHref && actionLabel ? (
                <Button asChild className="mt-6">
                    <Link href={actionHref}>{actionLabel}</Link>
                </Button>
            ) : null}
        </div>
    );
}
