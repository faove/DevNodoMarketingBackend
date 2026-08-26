import { Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';

type PaginationLink = {
    url: string | null;
    label: string;
    active: boolean;
};

export function Pagination({ links }: { links: PaginationLink[] }) {
    if (!links || links.length <= 3) {
        return null;
    }

    return (
        <div className="flex flex-wrap items-center justify-end gap-1">
            {links.map((link, index) => {
                const label = link.label
                    .replace('&laquo;', '«')
                    .replace('&raquo;', '»');

                if (!link.url) {
                    return (
                        <Button
                            key={`${label}-${index}`}
                            variant="ghost"
                            size="sm"
                            disabled
                            dangerouslySetInnerHTML={{ __html: label }}
                        />
                    );
                }

                return (
                    <Button
                        key={`${label}-${index}`}
                        variant={link.active ? 'default' : 'outline'}
                        size="sm"
                        asChild
                    >
                        <Link href={link.url} preserveScroll>
                            <span dangerouslySetInnerHTML={{ __html: label }} />
                        </Link>
                    </Button>
                );
            })}
        </div>
    );
}
