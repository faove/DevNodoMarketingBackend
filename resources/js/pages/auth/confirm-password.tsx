import { Form, Head } from '@inertiajs/react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';

export default function ConfirmPassword() {
    return (
        <>
            <Head title="Confirmar contraseña" />

            <Form
                action="/user/confirm-password"
                method="post"
                className="flex flex-col gap-6"
            >
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-2">
                            <Label htmlFor="password">Contraseña</Label>
                            <PasswordInput
                                id="password"
                                name="password"
                                required
                                autoFocus
                                autoComplete="current-password"
                            />
                            <InputError message={errors.password} />
                        </div>

                        <Button type="submit" disabled={processing}>
                            {processing && <Spinner />}
                            Confirmar
                        </Button>
                    </>
                )}
            </Form>
        </>
    );
}

ConfirmPassword.layout = {
    title: 'Confirmar contraseña',
    description: 'Esta es un área segura. Confirma tu contraseña para continuar',
};
