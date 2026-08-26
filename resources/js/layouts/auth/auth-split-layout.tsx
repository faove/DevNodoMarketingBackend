import { Link, usePage } from '@inertiajs/react';
import { Mail, Megaphone, Users } from 'lucide-react';
import AppLogoIcon from '@/components/app-logo-icon';
import type { AuthLayoutProps } from '@/types';

const features = [
    { icon: Users, label: 'CRM de leads y clientes' },
    { icon: Megaphone, label: 'Campañas de email outreach' },
    { icon: Mail, label: 'Consentimientos y segmentación' },
];

export default function AuthSplitLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    const { name } = usePage().props;

    return (
        <div className="grid min-h-dvh lg:grid-cols-2">
            <div
                className="relative hidden flex-col justify-between overflow-hidden bg-[#0a1220] p-10 text-white lg:flex"
                style={{
                    backgroundImage:
                        'radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)',
                    backgroundSize: '22px 22px',
                }}
            >
                <Link href="/" className="flex items-center gap-3">
                    <span className="flex size-10 flex-none items-center justify-center rounded-xl bg-primary">
                        <AppLogoIcon className="size-[22px] text-[#04141a]" />
                    </span>
                    <span className="text-xl font-extrabold tracking-tight">
                        {name}
                    </span>
                </Link>

                <div className="max-w-md">
                    <h2 className="mb-4 text-3xl font-extrabold tracking-tight text-balance">
                        Centro de control de marketing digital
                    </h2>
                    <p className="mb-9 text-[15px] font-medium text-slate-400">
                        Clientes, campañas, segmentos e interacciones en un solo
                        lugar, listo para automatizar outreach.
                    </p>
                    <div className="flex flex-col gap-4">
                        {features.map((feature) => (
                            <div
                                key={feature.label}
                                className="flex items-center gap-3.5"
                            >
                                <span className="flex size-8 flex-none items-center justify-center rounded-[9px] bg-primary/15 text-primary">
                                    <feature.icon className="size-[18px]" />
                                </span>
                                <span className="text-[14.5px] font-semibold text-slate-200">
                                    {feature.label}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                <p className="text-xs font-semibold text-slate-500">
                    © {new Date().getFullYear()} {name}. AI Marketing Platform.
                </p>
            </div>

            <div className="flex items-center justify-center bg-background p-6 md:p-10">
                <div className="w-full max-w-sm">
                    <Link
                        href="/"
                        className="mb-8 flex items-center justify-center gap-2 lg:hidden"
                    >
                        <span className="flex size-9 flex-none items-center justify-center rounded-lg bg-primary">
                            <AppLogoIcon className="size-5 text-primary-foreground" />
                        </span>
                        <span className="text-lg font-extrabold tracking-tight">
                            {name}
                        </span>
                    </Link>

                    <div className="mb-8">
                        <h1 className="text-2xl font-extrabold tracking-tight">
                            {title}
                        </h1>
                        <p className="mt-1.5 text-sm font-medium text-muted-foreground">
                            {description}
                        </p>
                    </div>

                    {children}
                </div>
            </div>
        </div>
    );
}
