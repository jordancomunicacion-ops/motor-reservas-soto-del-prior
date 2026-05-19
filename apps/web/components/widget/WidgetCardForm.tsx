"use client";
import { useState } from 'react';
import { CardElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import type { WidgetColors } from './widget-types';

interface Props {
    onSuccess: (paymentMethodId: string) => void;
    submitting: boolean;
    colors?: WidgetColors;
    amount: number;
}

export function WidgetCardForm({ onSuccess, submitting, colors, amount }: Props) {
    const stripe = useStripe();
    const elements = useElements();
    const [error, setError] = useState<string | null>(null);
    const accent = colors?.accent ?? '#C59D5F';

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
        <div className="space-y-4">
            <div className="p-4 bg-gray-50 border rounded-none">
                <p className="text-[10px] font-bold uppercase tracking-widest mb-4" style={{ color: accent }}>Datos de la Tarjeta</p>
                <CardElement options={{
                    style: {
                        base: {
                            fontSize: '16px',
                            color: '#424770',
                            '::placeholder': { color: '#aab7c4' },
                        },
                        invalid: { color: '#9e2146' },
                    },
                }} />
            </div>
            {error && <p className="text-xs text-red-500 italic">{error}</p>}
            <p className="text-[11px] text-gray-500 leading-relaxed italic">
                * No se realizará ningún cargo ahora. Solo se solicita como garantía. Se aplicará una penalización de {amount}€ por persona en caso de no presentarse sin cancelar con 48h de antelación.
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
