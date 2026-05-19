"use client";
import { useState } from 'react';
import { CardElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { AlertCircle, CreditCard } from 'lucide-react';

interface Props {
    onSuccess: (paymentMethodId: string) => void;
    submitting: boolean;
    amount: number;
}

export function WidgetCardForm({ onSuccess, submitting, amount }: Props) {
    const stripe = useStripe();
    const elements = useElements();
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e?: React.MouseEvent) => {
        if (e) e.preventDefault();
        if (!stripe || !elements) return;

        const cardElement = elements.getElement(CardElement);
        if (!cardElement) return;

        const { error: stripeError, paymentMethod } = await stripe.createPaymentMethod({
            type: 'card',
            card: cardElement,
        });

        if (stripeError) {
            setError(stripeError.message || 'Error al procesar la tarjeta');
        } else if (paymentMethod) {
            onSuccess(paymentMethod.id);
        }
    };

    return (
        <div className="space-y-3">
            <div className="rounded-md border border-border bg-card p-4 space-y-3">
                <div className="flex items-center gap-2 text-eyebrow text-primary">
                    <CreditCard className="size-3.5" />
                    Datos de la tarjeta
                </div>
                <CardElement options={{
                    style: {
                        base: {
                            fontSize: '15px',
                            fontFamily: 'inherit',
                            color: 'var(--foreground)',
                            '::placeholder': { color: 'var(--muted-foreground)' },
                        },
                        invalid: { color: 'var(--destructive)' },
                    },
                }} />
            </div>
            {error && (
                <div className="flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/5 p-2.5 text-xs text-destructive">
                    <AlertCircle className="size-3.5 mt-0.5 shrink-0" />
                    <span>{error}</span>
                </div>
            )}
            <p className="text-[11px] text-muted-foreground leading-relaxed italic">
                No se realizará ningún cargo ahora. Solo se solicita como garantía.
                Se aplicará una penalización de {amount}€ por persona en caso de no presentarse sin cancelar con 48 h de antelación.
            </p>
            <Button
                id="stripe-submit-btn"
                className="hidden"
                onClick={handleSubmit}
                disabled={submitting}
            >
                Confirmar
            </Button>
        </div>
    );
}
