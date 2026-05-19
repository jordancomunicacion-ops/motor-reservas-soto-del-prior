'use client';

import { useActionState, useEffect } from 'react';
import { authenticate } from '@/app/lib/actions';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, Loader2 } from 'lucide-react';

export default function Page() {
    const [errorMessage, formAction, isPending] = useActionState(
        authenticate,
        '',
    );

    useEffect(() => {
        if (errorMessage === undefined) {
            window.location.href = '/admin';
        }
    }, [errorMessage]);

    return (
        <div className="min-h-screen grid lg:grid-cols-2 bg-background">
            {/* Side visual: brand wash */}
            <div className="hidden lg:flex relative bg-foreground text-background overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,oklch(0.715_0.085_75/0.18),transparent_55%)]" />
                <div className="relative flex flex-col justify-between p-12 w-full">
                    <div className="flex items-center gap-3">
                        <Image src="/logo-icon.png" alt="" width={36} height={36} className="invert" />
                        <span className="text-eyebrow text-background/70">Soto del Prior</span>
                    </div>
                    <div className="space-y-4 max-w-md">
                        <h2 className="font-display text-4xl font-medium leading-tight tracking-tight">
                            La gestión, tan cuidada como tu hospitalidad.
                        </h2>
                        <p className="text-sm text-background/70 leading-relaxed">
                            Motor de reservas, planning y valoraciones — todo en un mismo lugar.
                        </p>
                    </div>
                    <p className="text-[11px] text-background/40">© {new Date().getFullYear()} Soto del Prior</p>
                </div>
            </div>

            {/* Form */}
            <div className="flex items-center justify-center p-6 sm:p-12">
                <div className="w-full max-w-sm space-y-8">
                    <div className="text-center space-y-3">
                        <div className="lg:hidden flex justify-center">
                            <Image src="/logo-icon.png" alt="Soto del Prior" width={56} height={56} />
                        </div>
                        <div className="space-y-1.5">
                            <p className="text-eyebrow">Motor de reservas</p>
                            <h1 className="font-display text-3xl font-medium tracking-tight">
                                Bienvenido de vuelta
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                Accede a tu panel para gestionar reservas.
                            </p>
                        </div>
                    </div>

                    <Card className="border-border/60 shadow-sm">
                        <CardContent>
                            <form action={formAction} className="space-y-5">
                                <div className="space-y-2">
                                    <Label htmlFor="email">Usuario</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        name="email"
                                        required
                                        autoComplete="email"
                                        placeholder="tu@correo.com"
                                        className="h-11"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="password">Contraseña</Label>
                                        <Link
                                            href="/forgot-password"
                                            className="text-xs font-medium text-primary hover:underline underline-offset-4"
                                        >
                                            ¿La olvidaste?
                                        </Link>
                                    </div>
                                    <Input
                                        id="password"
                                        type="password"
                                        name="password"
                                        required
                                        minLength={4}
                                        autoComplete="current-password"
                                        className="h-11"
                                    />
                                </div>

                                <div className="flex items-center gap-2">
                                    <Checkbox id="remember-me" name="remember-me" />
                                    <Label htmlFor="remember-me" className="text-sm font-normal text-muted-foreground cursor-pointer">
                                        Recuérdame en este dispositivo
                                    </Label>
                                </div>

                                {errorMessage && (
                                    <div
                                        className="flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive"
                                        aria-live="polite"
                                    >
                                        <AlertCircle className="size-4 mt-0.5 shrink-0" />
                                        <span>{errorMessage}</span>
                                    </div>
                                )}

                                <Button
                                    type="submit"
                                    size="lg"
                                    className="w-full"
                                    disabled={isPending}
                                    aria-disabled={isPending}
                                >
                                    {isPending && <Loader2 className="size-4 animate-spin" />}
                                    {isPending ? 'Iniciando sesión…' : 'Iniciar sesión'}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    <p className="text-center text-[11px] text-muted-foreground">
                        ¿Problemas para acceder? Contacta con tu administrador.
                    </p>
                </div>
            </div>
        </div>
    );
}
