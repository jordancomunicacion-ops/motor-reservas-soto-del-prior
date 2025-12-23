"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { fetchAPI } from '@/lib/api';

export default function AdminHub() {
    const [stats, setStats] = useState({ hotels: 0, restaurants: 0 });

    useEffect(() => {
        // Mock stats for now, eventually fetchAPI
        setStats({ hotels: 1, restaurants: 0 });
    }, []);

    return (
        <div className="p-8 space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">SOTO Hub</h1>
                <p className="text-muted-foreground">Select a business unit to manage.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* HOTEL CARD */}
                <Link href="/admin/hotels" className="block group">
                    <Card className="h-full hover:border-blue-500 transition-colors cursor-pointer">
                        <CardHeader>
                            <div className="text-4xl mb-2">🏨</div>
                            <CardTitle className="text-2xl group-hover:text-blue-600">Hotel Manager</CardTitle>
                            <CardDescription>Manage rooms, bookings, and rates.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="text-sm text-gray-500">
                                • Reservation Engine<br />
                                • Channel Manager (iCal)<br />
                                • Inventory Control
                            </div>
                            <Button className="mt-4 w-full" variant="outline">Enter Hotel Dashboard</Button>
                        </CardContent>
                    </Card>
                </Link>

                {/* RESTAURANT CARD */}
                <Link href="/admin/restaurant" className="block group">
                    <Card className="h-full hover:border-orange-500 transition-colors cursor-pointer">
                        <CardHeader>
                            <div className="text-4xl mb-2">🍽️</div>
                            <CardTitle className="text-2xl group-hover:text-orange-600">Restaurant Manager</CardTitle>
                            <CardDescription>Manage tables, zones, and shifts.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="text-sm text-gray-500">
                                • Digital Table Plan<br />
                                • Zone Management (Terraza/Interior)<br />
                                • Shift Scheduling
                            </div>
                            <Button className="mt-4 w-full" variant="outline">Enter Restaurant Dashboard</Button>
                        </CardContent>
                    </Card>
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* SYSTEM SETTINGS */}
                <Link href="/admin/settings" className="block">
                    <Card className="hover:bg-gray-50">
                        <CardHeader>
                            <CardTitle>⚙️ System Settings</CardTitle>
                            <CardDescription>Users, Billing, and Logs.</CardDescription>
                        </CardHeader>
                    </Card>
                </Link>

                {/* WIDGET CONFIG */}
                <Link href="/admin/widget-config" className="block">
                    <Card className="hover:bg-gray-50">
                        <CardHeader>
                            <CardTitle>🎨 Widget Config</CardTitle>
                            <CardDescription>Customize colors and CSS.</CardDescription>
                        </CardHeader>
                    </Card>
                </Link>

                {/* HELP */}
                <Link href="https://sotodelprior.com/help" className="block">
                    <Card className="hover:bg-gray-50">
                        <CardHeader>
                            <CardTitle>❓ Help & Support</CardTitle>
                            <CardDescription>Documentation and Guides.</CardDescription>
                        </CardHeader>
                    </Card>
                </Link>
            </div>
        </div>
    );
}
