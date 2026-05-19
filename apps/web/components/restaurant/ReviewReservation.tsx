"use client";
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { AlertCircle, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { StarRating } from '@/components/ui/star-rating';
import { EmptyState } from '@/components/ui/empty-state';
import { fetchAPI } from '@/lib/api';

type ReviewForm = {
    id: string;
    guestName: string;
    date: string;
    restaurantName: string;
    alreadySubmitted: boolean;
};

type SubmitResponse = {
    ok?: boolean;
    redirectToGoogle?: boolean;
    googleUrl?: string | null;
    error?: boolean;
    message?: string;
};

export function ReviewReservation() {
    const sp = useSearchParams();
    const id = sp.get('id') || '';
    const token = sp.get('token') || '';

    const [form, setForm] = useState<ReviewForm | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [service, setService] = useState(0);
    const [ambiance, setAmbiance] = useState(0);
    const [food, setFood] = useState(0);
    const [advice, setAdvice] = useState('');

    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    useEffect(() => {
        if (!id || !token) {
            setError('Enlace inválido. Faltan parámetros.');
            setLoading(false);
            return;
        }
        fetchAPI<ReviewForm | { error: boolean; message: string }>(
            `/restaurant/public/reservation/${id}/review?token=${encodeURIComponent(token)}`
        ).then(data => {
            if ('error' in data && data.error) {
                setError(data.message || 'No se pudo cargar el formulario.');
            } else {
                const f = data as ReviewForm;
                setForm(f);
                if (f.alreadySubmitted) setSubmitted(true);
            }
        }).catch(() => setError('No se pudo cargar el formulario.'))
            .finally(() => setLoading(false));
    }, [id, token]);

    const canSubmit = service > 0 && ambiance > 0 && food > 0 && !submitting;

    const handleSubmit = async () => {
        if (!form || !canSubmit) return;
        setSubmitting(true);
        try {
            const res = await fetchAPI<SubmitResponse>(
                `/restaurant/public/reservation/${form.id}/review?token=${encodeURIComponent(token)}`,
                {
                    method: 'POST',
                    body: JSON.stringify({
                        serviceScore: service,
                        ambianceScore: ambiance,
                        foodScore: food,
                        advice: advice.trim() || undefined,
                    }),
                }
            );
            if (res?.error) {
                alert(res.message || 'No se pudo enviar la valoración.');
                return;
            }
            if (res?.redirectToGoogle && res.googleUrl) {
                window.location.href = res.googleUrl;
                return;
            }
            setSubmitted(true);
        } catch (e) {
            alert((e instanceof Error && e.message) || 'Error al enviar la valoración.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen grid place-items-center bg-background">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (error || !form) {
        return (
            <div className="min-h-screen grid place-items-center bg-background px-4">
                <EmptyState
                    icon={AlertCircle}
                    tone="danger"
                    title="No se pudo abrir la valoración"
                    description={error || 'Enlace inválido o caducado.'}
                />
            </div>
        );
    }

    if (submitted) {
        return (
            <div className="min-h-screen grid place-items-center bg-background px-4">
                <EmptyState
                    icon={Check}
                    title="¡Gracias!"
                    description={`Hemos recibido tu valoración para ${form.restaurantName}. Es un detalle que nos ayuda muchísimo.`}
                />
            </div>
        );
    }

    const firstName = form.guestName.split(' ')[0];

    return (
        <div className="min-h-screen bg-background text-foreground">
            <div className="max-w-xl mx-auto px-4 py-12 sm:py-16">
                <header className="text-center mb-10">
                    <div className="flex justify-center mb-6">
                        <Image src="/logo-icon.png" alt="Soto del Prior" width={48} height={48} />
                    </div>
                    <p className="text-eyebrow mb-2">{form.restaurantName}</p>
                    <h1 className="font-display text-4xl font-medium tracking-tight">
                        ¿Qué tal tu experiencia?
                    </h1>
                    <p className="text-sm text-muted-foreground mt-3 max-w-md mx-auto">
                        Hola {firstName}, gracias por visitarnos. Cuéntanos cómo fue.
                    </p>
                </header>

                <div className="space-y-4">
                    {[
                        { label: 'Atención', value: service, onChange: setService },
                        { label: 'Entorno', value: ambiance, onChange: setAmbiance },
                        { label: 'Comida', value: food, onChange: setFood },
                    ].map(({ label, value, onChange }) => (
                        <div
                            key={label}
                            className="rounded-lg border border-border/60 bg-card p-5 flex items-center justify-between gap-4"
                        >
                            <h2 className="text-sm font-medium text-foreground">{label}</h2>
                            <StarRating value={value} onChange={onChange} disabled={submitting} />
                        </div>
                    ))}

                    <div className="rounded-lg border border-border/60 bg-card p-5 space-y-3">
                        <h2 className="text-sm font-medium text-foreground">Consejos</h2>
                        <Textarea
                            value={advice}
                            onChange={e => setAdvice(e.target.value)}
                            placeholder="¿Algo que podamos mejorar? ¿Algún detalle que quieras destacar?"
                            disabled={submitting}
                            rows={4}
                            className="resize-none"
                        />
                    </div>

                    <Button
                        type="button"
                        size="xl"
                        onClick={handleSubmit}
                        disabled={!canSubmit}
                        className="w-full mt-4"
                    >
                        {submitting && <Loader2 className="size-4 animate-spin" />}
                        {submitting ? 'Enviando…' : 'Enviar valoración'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
