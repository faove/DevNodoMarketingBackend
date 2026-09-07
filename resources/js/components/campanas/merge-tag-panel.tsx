import { Tags } from 'lucide-react';
import { MERGE_TAGS } from '@/lib/merge-tags';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function MergeTagPanel({ onInsert }: { onInsert: (tag: string) => void }) {
    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                    <Tags className="size-4" />
                    Merge tags
                </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-1.5">
                {MERGE_TAGS.map((mergeTag) => (
                    <Button
                        key={mergeTag.tag}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="font-mono text-xs"
                        onClick={() => onInsert(mergeTag.tag)}
                        title={mergeTag.label}
                    >
                        {mergeTag.tag}
                    </Button>
                ))}
            </CardContent>
        </Card>
    );
}
