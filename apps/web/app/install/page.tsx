"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';

export default function InstallPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Form Data
    const [hotelName, setHotelName] = useState('');
    const [currency, setCurrency] = useState('EUR');
    const [adminEmail, setAdminEmail] = useState('');
    const [adminPassword, setAdminPassword] = useState('');

    // Check status on load
    useEffect(() => {
        checkStatus();
    }, []);

    async function checkStatus() {
        try {
            const res = await fetchAPI('/installer/status');
            if (res.isInstalled) {
                alert('System already installed. Redirecting to admin...');
                router.push('/admin');
            }
        } catch (e) { }
    }

    async function handleSetup() {
        if (!hotelName || !adminEmail || !adminPassword) return alert('All fields required');
        setLoading(true);

        try {
            await fetchAPI('/installer/setup', {
                method: 'POST',
                body: JSON.stringify({ hotelName, currency, adminEmail, adminPassword })
            });
            setStep(3); // Success
        } catch (e: any) {
            alert('Setup failed: ' + e.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-zinc-950 p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>SOTO PMS Installer</CardTitle>
                </CardHeader>
                <CardContent>
                    {/* Step 1: Welcome */}
                    {step === 1 && (
                        <div className="text-center space-y-4">
                            <div className="text-4xl">🚀</div>
                            <h2 className="text-xl font-semibold">Welcome to your new PMS</h2>
                            <p className="text-gray-500">This wizard will help you set up your hotel and admin account.</p>
                            <Button className="w-full" onClick={() => setStep(2)}>Get Started</Button>
                        </div>
                    )}

                    {/* Step 2: Configuration */}
                    {step === 2 && (
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium">Hotel Name</label>
                                <input className="w-full border p-2 rounded" value={hotelName} onChange={e => setHotelName(e.target.value)} placeholder="My Grand Hotel" />
                            </div>
                            <div>
                                <label className="text-sm font-medium">Currency</label>
                                <select className="w-full border p-2 rounded" value={currency} onChange={e => setCurrency(e.target.value)}>
                                    <option value="EUR">EUR (€)</option>
                                    <option value="USD">USD ($)</option>
                                    <option value="GBP">GBP (£)</option>
                                </select>
                            </div>

                            <div className="pt-4 border-t">
                                <h3 className="font-semibold mb-2">Admin Account</h3>
                                <div className="space-y-2">
                                    <div>
                                        <label className="text-sm font-medium">Email</label>
                                        <input className="w-full border p-2 rounded" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} placeholder="admin@example.com" />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium">Password</label>
                                        <input type="password" className="w-full border p-2 rounded" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} placeholder="AguyStrongPassword123" />
                                    </div>
                                </div>
                            </div>

                            <Button className="w-full" onClick={handleSetup} disabled={loading}>
                                {loading ? 'Installing...' : 'Install PMS'}
                            </Button>
                        </div>
                    )}

                    {/* Step 3: Success */}
                    {step === 3 && (
                        <div className="text-center space-y-4">
                            <div className="text-4xl">✅</div>
                            <h2 className="text-xl font-semibold">Installation Complete!</h2>
                            <p className="text-gray-500">Your system is ready to accept bookings.</p>
                            <Button className="w-full" onClick={() => router.push('/admin')}>Go to Dashboard</Button>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="text-center text-xs text-gray-400 justify-center">
                    v2.0.0-Envato • Powered by Next.js & NestJS
                </CardFooter>
            </Card>
        </div>
    );
}
