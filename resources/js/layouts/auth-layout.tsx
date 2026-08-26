import { PageFlashToasts } from '@/hooks/use-flash-toast';
import AuthLayoutTemplate from '@/layouts/auth/auth-split-layout';

export default function AuthLayout({
    title = '',
    description = '',
    children,
}: {
    title?: string;
    description?: string;
    children: React.ReactNode;
}) {
    return (
        <AuthLayoutTemplate title={title} description={description}>
            <PageFlashToasts />
            {children}
        </AuthLayoutTemplate>
    );
}
