import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function ForgotPasswordPage() {
    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-background">
            <div className="w-full max-w-sm space-y-8">
                <div className="flex flex-col items-center gap-3 text-center">
                    <Image src="/logo-icon.png" alt="Soto del Prior" width={56} height={56} />
                    <div className="space-y-1.5">
                        <p className="text-eyebrow">Acceso</p>
                        <h1 className="font-display text-3xl font-medium tracking-tight">
                            Recuperar contraseña
                        </h1>
                    </div>
                </div>

                <Card className="border-border/60 shadow-sm">
                    <CardContent className="space-y-4 text-sm leading-relaxed text-muted-foreground">
                        <p>
                            Por seguridad, el restablecimiento de contraseña se realiza
                            manualmente. Contacta con el administrador del sistema y te
                            enviarán una nueva contraseña temporal.
                        </p>
                    </CardContent>
                </Card>

                <div className="text-center">
                    <Link
                        href="/login"
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline underline-offset-4"
                    >
                        <ArrowLeft className="size-3.5" />
                        Volver al inicio de sesión
                    </Link>
                </div>
            </div>
        </div>
    );
}
