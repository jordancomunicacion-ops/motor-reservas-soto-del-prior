"use client";
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function RestaurantWidget() {
    const [step, setStep] = useState(1);
    const [pax, setPax] = useState(2);
    const [time, setTime] = useState('20:00');

    return (
        <>
            <link rel="stylesheet" href="/custom-widget.css" />
            <div className="widget-container">
                <Card className="w-full max-w-lg border-orange-200">
                    <CardContent>
                        {step === 1 && (
                            <div className="space-y-2">
                                <div>
                                    <label htmlFor="booking-datetime" className="text-sm font-medium">Fecha y Hora</label>
                                    <input
                                        id="booking-datetime"
                                        name="datetime"
                                        type="datetime-local"
                                        className="w-full border p-2 rounded"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="booking-pax" className="text-sm font-medium">Personas</label>
                                    <select
                                        id="booking-pax"
                                        name="pax"
                                        className="w-full border p-2 rounded"
                                        value={pax}
                                        onChange={e => setPax(+e.target.value)}
                                    >
                                        <option value="2">2 Personas</option>
                                        <option value="4">4 Personas</option>
                                        <option value="6">6 Personas</option>
                                    </select>
                                </div>
                                <Button className="w-full bg-orange-600 hover:bg-orange-700" onClick={() => setStep(2)}>
                                    Buscar Mesa
                                </Button>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="space-y-4 text-center">
                                <div className="text-4xl">🍽️</div>
                                <h2 className="text-xl font-bold">¡Mesa Confirmada!</h2>
                                <p className="text-gray-600">Te esperamos a las {time}.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
