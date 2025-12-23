"use client";
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { fetchAPI } from '@/lib/api';

export default function WidgetConfigPage() {
    const [config, setConfig] = useState({
        primaryColor: '#3b82f6',
        customCss: '',
        showLogo: true
    });

    const HOTEL_ID = "DEMO-HOTEL-ID";

    useEffect(() => {
        // Fetch config...
    }, []);

    async function saveConfig() {
        await fetchAPI(`/config/${HOTEL_ID}`, {
            method: 'POST',
            body: JSON.stringify(config)
        });
        alert('Saved!');
    }

    return (
        <div className="space-y-6 max-w-4xl">
            <h2 className="text-2xl font-bold">Widget Configuration</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* VISUAL SETTINGS */}
                <Card>
                    <CardHeader><CardTitle>Appearance</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="text-sm font-medium">Primary Color</label>
                            <div className="flex gap-2">
                                <input type="color" className="w-12 h-10 p-0 border-0" value={config.primaryColor} onChange={e => setConfig({ ...config, primaryColor: e.target.value })} />
                                <input className="border p-2 rounded flex-1" value={config.primaryColor} onChange={e => setConfig({ ...config, primaryColor: e.target.value })} />
                            </div>
                        </div>
                        <div>
                            <label className="text-sm font-medium">Custom CSS</label>
                            <textarea
                                className="w-full border p-2 rounded h-32 font-mono text-xs"
                                value={config.customCss}
                                onChange={e => setConfig({ ...config, customCss: e.target.value })}
                                placeholder=".widget-container { background: transparent; }"
                            />
                        </div>
                        <Button onClick={saveConfig}>Save Changes</Button>
                    </CardContent>
                </Card>

                {/* INTEGRATION LINKS */}
                <Card>
                    <CardHeader><CardTitle>Integration Code</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="text-sm font-medium">Hotel Widget Link</label>
                            <div className="flex gap-2">
                                <code className="bg-gray-100 p-2 rounded text-xs flex-1 block overflow-x-auto whitespace-nowrap">
                                    https://motor.sotodelprior.com/widget?hotelId={HOTEL_ID}
                                </code>
                                <Button variant="outline" size="sm">Copy</Button>
                            </div>
                        </div>

                        <div>
                            <label className="text-sm font-medium">Restaurant Widget Link</label>
                            <div className="flex gap-2">
                                <code className="bg-gray-100 p-2 rounded text-xs flex-1 block overflow-x-auto whitespace-nowrap">
                                    https://motor.sotodelprior.com/widget/restaurant?id={HOTEL_ID}
                                </code>
                                <Button variant="outline" size="sm">Copy</Button>
                            </div>
                        </div>

                        <div className="p-4 bg-yellow-50 text-yellow-800 text-sm rounded">
                            <strong>Tip:</strong> You can embed these links in an <code>&lt;iframe&gt;</code> on your main website.
                        </div>
                    </CardContent>
                </Card>

            </div>
        </div>
    );
}
