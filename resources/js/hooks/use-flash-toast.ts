import { router, usePage } from '@inertiajs/react';
import { useEffect } from 'react';
import { toast } from 'sonner';

/**
 * Safe outside Inertia PageContext (used by the global Toaster wrapper).
 * Listens to Inertia flash events when available.
 */
export function useFlashToast(): void {
    useEffect(() => {
        return router.on('flash', (event) => {
            const flash = (event as CustomEvent).detail?.flash as
                | { success?: string | null; error?: string | null; toast?: { type: 'success' | 'error' | 'info' | 'warning'; message: string } }
                | undefined;

            if (!flash) {
                return;
            }

            if (flash.toast) {
                toast[flash.toast.type](flash.toast.message);
                return;
            }

            if (flash.success) {
                toast.success(flash.success);
            }

            if (flash.error) {
                toast.error(flash.error);
            }
        });
    }, []);
}

/**
 * Must be rendered inside an Inertia page/layout (has PageContext).
 */
export function PageFlashToasts(): null {
    const { flash } = usePage().props;

    useEffect(() => {
        if (flash?.success) {
            toast.success(flash.success);
        }

        if (flash?.error) {
            toast.error(flash.error);
        }
    }, [flash?.success, flash?.error]);

    return null;
}
