"use client";
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, Check, Loader2, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchAPI } from '@/lib/api';

type ReviewForm = {
    id: string;
    guestName: string;
    checkInDate: string;
    checkOutDate: string;
    hotelName: string;
    alreadySubmitted: boolean;
};

type SubmitResponse = {
    ok?: boolean;
    redirectToGoogle?: boolean;
    googleUrl?: string | null;
    error?: boolean;
    message?: string;
};

const ACCENT = '#C59D5F';

function StarRating({ value, onChange, disabled }: { value: number; onChange: (v: number) => void; disabled?: boolean }) {
    return (
        <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map(n => (
                <button
                    key={n}
                    type="button"
                    onClick={() => !disabled && onChange(n)}
                    disabled={disabled}
                    aria-label={`${n} estrella${n > 1 ? 's' : ''}`}
                    className="p-1 disabled:cursor-not-allowed"
                >
                    <Star
                        className="w-7 h-7 transition-colors"
                        style={{
                            color: n <= value ? ACCENT : '#E5E7EB',
                            fill: n <= value ? ACCENT : 'transparent',
                        }}
                    />
                </button>
            ))}
        </div>
    );
}

export function HotelReviewBooking() {
    const sp = useSearchParams();
    const id = sp.get('id') || '';
    const token = sp.get('token') || '';

    const [form, setForm] = useState<ReviewForm | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [service, setService] = useState(0);
    const [room, setRoom] = useState(0);
    const [cleanliness, setCleanliness] = useState(0);
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
            `/bookings/public/${id}/review?token=${encodeURIComponent(token)}`
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

    const canSubmit = service > 0 && room > 0 && cleanliness > 0 && !submitting;

    const handleSubmit = async () => {
        if (!form || !canSubmit) return;
        setSubmitting(true);
        try {
            const res = await fetchAPI<SubmitResponse>(
                `/bookings/public/${form.id}/review?token=${encodeURIComponent(token)}`,
                {
                    method: 'POST',
                    body: JSON.stringify({
                        serviceScore: service,
                        roomScore: room,
                        cleanlinessScore: cleanliness,
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
        } catch (e: any) {
            alert(e?.message || 'Error al enviar la valoración.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
        );
    }

    if (error || !form) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white px-4">
                <div className="max-w-md text-center">
                    <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
                    <h1 className="text-xl font-bold mb-2" style={{ fontFamily: "'Oswald', sans-serif" }}>No se pudo abrir la valoración</h1>
                    <p className="text-sm text-gray-600">{error || 'Enlace inválido o caducado.'}</p>
                </div>
            </div>
        );
    }

    if (submitted) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white px-4">
                <div className="max-w-md text-center">
                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                        <Check className="w-8 h-8 text-gray-500" />
                    </div>
                    <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: "'Oswald', sans-serif" }}>¡Gracias!</h1>
                    <p className="text-sm text-gray-600">Hemos recibido tu valoración sobre tu estancia en {form.hotelName}. Es un detalle que nos ayuda muchísimo.</p>
                </div>
            </div>
        );
    }

    const firstName = form.guestName.split(' ')[0];

    return (
        <div className="min-h-screen bg-white text-[#0A0A0A]" style={{ fontFamily: "'Lato', sans-serif" }}>
            <div className="max-w-xl mx-auto px-4 py-10">
                <header className="text-center mb-8">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1" style={{ fontFamily: "'Oswald', sans-serif" }}>
                        {form.hotelName}
                    </p>
                    <h1 className="text-3xl font-bold uppercase tracking-tight" style={{ fontFamily: "'Oswald', sans-serif" }}>
                        ¿Qué tal tu estancia?
                    </h1>
                    <p className="text-sm text-gray-500 mt-2">
                        Hola {firstName}, gracias por elegirnos. Cuéntanos cómo fue.
                    </p>
                </header>

                <div className="space-y-6">
                    <div className="border border-gray-100 p-4">
                        <h2 className="text-xs font-bold uppercase tracking-widest mb-3 text-gray-500" style={{ fontFamily: "'Oswald', sans-serif" }}>
                            Atención
                        </h2>
                        <StarRating value={service} onChange={setService} disabled={submitting} />
                    </div>

                    <div className="border border-gray-100 p-4">
                        <h2 className="text-xs font-bold uppercase tracking-widest mb-3 text-gray-500" style={{ fontFamily: "'Oswald', sans-serif" }}>
                            Habitación
                        </h2>
                        <StarRating value={room} onChange={setRoom} disabled={submitting} />
                    </div>

                    <div className="border border-gray-100 p-4">
                        <h2 className="text-xs font-bold uppercase tracking-widest mb-3 text-gray-500" style={{ fontFamily: "'Oswald', sans-serif" }}>
                            Limpieza
                        </h2>
                        <StarRating value={cleanliness} onChange={setCleanliness} disabled={submitting} />
                    </div>

                    <div className="border border-gray-100 p-4">
                        <h2 className="text-xs font-bold uppercase tracking-widest mb-3 text-gray-500" style={{ fontFamily: "'Oswald', sans-serif" }}>
                            Consejos
                        </h2>
                        <textarea
                            className="w-full border border-gray-200 p-3 text-sm focus:outline-none focus:border-[#C59D5F] bg-white resize-none"
                            rows={4}
                            value={advice}
                            onChange={e => setAdvice(e.target.value)}
                            placeholder="¿Algo que podamos mejorar? ¿Algún detalle que quieras destacar?"
                            disabled={submitting}
                        />
                    </div>

                    <Button
                        type="button"
                        onClick={handleSubmit}
                        disabled={!canSubmit}
                        className="w-full h-12 text-sm font-bold uppercase tracking-widest text-white"
                        style={{ backgroundColor: ACCENT, fontFamily: "'Oswald', sans-serif" }}
                    >
                        {submitting ? 'Enviando…' : 'Enviar valoración'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
