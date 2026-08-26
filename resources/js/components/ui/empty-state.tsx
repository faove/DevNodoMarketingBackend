import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Props = {
    icon: LucideIcon;
    title: string;
    description?: string;
    actionLabel?: string;
    onAction?: () => void;
    className?: string;
};

export function EmptyState({
    icon: Icon,
    title,
    description,
    actionLabel,
    onAction,
    className,
}: Props) {
    return (
        <div
            className={cn(
                'flex flex-col items-center px-6 py-12 text-center',
                className,
            )}
        >
            <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-primary/10">
                <Icon className="size-6 text-primary" strokeWidth={1.75} />
            </div>
            <p className="text-[15px] font-bold">{title}</p>
            {description ? (
                <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">
                    {description}
                </p>
            ) : null}
            {actionLabel && onAction ? (
                <Button
                    variant="outline"
                    size="sm"
                    className="mt-5"
                    onClick={onAction}
                >
                    {actionLabel}
                </Button>
            ) : null}
        </div>
    );
}
