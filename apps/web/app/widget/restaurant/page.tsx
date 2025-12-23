"use client";
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function RestaurantWidget() {
    const [step, setStep] = useState(1);
    const [pax, setPax] = useState(2);
    const [time, setTime] = useState('20:00');

    return (
        <div className="min-h-screen bg-orange-50 dark:bg-zinc-950 flex items-center justify-center p-4">
            <Card className="w-full max-w-lg border-orange-200">
                <CardHeader>
                    <CardTitle className="text-orange-700">Reserve a Table</CardTitle>
                </CardHeader>
                <CardContent>
                    {step === 1 && (
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium">Date & Time</label>
                                <input type="datetime-local" className="w-full border p-2 rounded" />
                            </div>
                            <div>
                                <label className="text-sm font-medium">People</label>
                                <select className="w-full border p-2 rounded" value={pax} onChange={e => setPax(+e.target.value)}>
                                    <option value="2">2 People</option>
                                    <option value="4">4 People</option>
                                    <option value="6">6 People</option>
                                </select>
                            </div>
                            <Button className="w-full bg-orange-600 hover:bg-orange-700" onClick={() => setStep(2)}>
                                Find Table
                            </Button>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4 text-center">
                            <div className="text-4xl">🍽️</div>
                            <h2 className="text-xl font-bold">Table Confirmed!</h2>
                            <p className="text-gray-600">We await you at {time}.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
