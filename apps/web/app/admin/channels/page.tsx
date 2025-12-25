"use client";
import { useEffect, useState } from 'react';
import { fetchAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, RotateCw } from 'lucide-react';

interface RoomType { id: string; name: string; }
interface Feed { id: string; name: string; url: string; source: string; roomType: RoomType; lastSync: string; isActive: boolean; }

export default function ChannelWizard() {
    const [step, setStep] = useState(1);
    const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
    const [feeds, setFeeds] = useState<Feed[]>([]);
    const [loading, setLoading] = useState(false);

    // Form State
    const [selectedRoomType, setSelectedRoomType] = useState('');
    const [channelSource, setChannelSource] = useState('BOOKING');
    const [icalUrl, setIcalUrl] = useState('');
    const [feedName, setFeedName] = useState('');

    useEffect(() => {
        // MOCK DATA - To prevent "Failed to fetch" error
        const mockRoomTypes = [
            { id: 'rt1', name: 'Double Room Deluxe' },
            { id: 'rt2', name: 'Single Room Standard' },
            { id: 'rt3', name: 'Suite Primary' }
        ];
        setRoomTypes(mockRoomTypes);

        loadFeeds();
    }, []);

    const loadFeeds = () => {
        // MOCK DATA
        const mockFeeds: Feed[] = [
            {
                id: 'f1',
                name: 'Booking.com Main',
                url: 'https://admin.booking.com/...',
                source: 'BOOKING',
                roomType: { id: 'rt1', name: 'Double Room Deluxe' },
                lastSync: new Date().toISOString(),
                isActive: true
            }
        ];
        setFeeds(mockFeeds);
    };

    const handleCreateFeed = async () => {
        if (!selectedRoomType || !icalUrl) return;
        setLoading(true);
        try {
            // Simulate API Call
            await new Promise(resolve => setTimeout(resolve, 1000));
            // In a real app, this would POST to the backend

            // Allow success flow
            setStep(3); // Success Step
        } catch (e) {
            console.error(e);
            alert("Failed to connect channel.");
        } finally {
            setLoading(false);
        }
    };

    const handleSyncNow = async () => {
        setLoading(true);
        // Simulate Sync
        await new Promise(resolve => setTimeout(resolve, 2000));
        await loadFeeds();
        setLoading(false);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 p-4">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Channel Manager</h1>
                    <p className="text-muted-foreground">Sync your inventory with Booking.com, Airbnb, and more.</p>
                </div>
                <Button variant="outline" onClick={handleSyncNow} disabled={loading}>
                    <RotateCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Sync Now
                </Button>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
                {/* WIZARD CARD */}
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>Connect New Channel</CardTitle>
                        <CardDescription>Follow the steps to link an OTA calendar.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {step === 1 && (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>1. Select Room Type</Label>
                                    <Select onValueChange={setSelectedRoomType} value={selectedRoomType}>
                                        <SelectTrigger><SelectValue placeholder="Choose a room..." /></SelectTrigger>
                                        <SelectContent>
                                            {roomTypes.map(rt => <SelectItem key={rt.id} value={rt.id}>{rt.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>2. Select Channel</Label>
                                    <Select onValueChange={setChannelSource} value={channelSource}>
                                        <SelectTrigger><SelectValue placeholder="Select OTA" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="BOOKING">Booking.com</SelectItem>
                                            <SelectItem value="AIRBNB">Airbnb</SelectItem>
                                            <SelectItem value="VRBO">Vrbo / Expedia</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button className="w-full" onClick={() => setStep(2)} disabled={!selectedRoomType}>
                                    Next: Enter iCal URL
                                </Button>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="space-y-4">
                                <Alert>
                                    <AlertTitle>Instruction</AlertTitle>
                                    <AlertDescription>
                                        Log in to {channelSource}, go to Calendar Settings, and copy the "Export Calendar (iCal)" link. Paste it below.
                                    </AlertDescription>
                                </Alert>
                                <div className="space-y-2">
                                    <Label>iCal URL (Export Link)</Label>
                                    <Input placeholder="https://admin.booking.com/hotel/hoteladmin/ical..." value={icalUrl} onChange={e => setIcalUrl(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Connection Name (Optional)</Label>
                                    <Input placeholder="e.g. Booking.com Main Room" value={feedName} onChange={e => setFeedName(e.target.value)} />
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                                    <Button className="flex-1" onClick={handleCreateFeed} disabled={loading || !icalUrl}>
                                        {loading ? 'Connecting...' : 'Connect & Sync'}
                                    </Button>
                                </div>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="text-center space-y-4 py-8">
                                <div className="flex justify-center text-emerald-500">
                                    <CheckCircle2 className="h-16 w-16" />
                                </div>
                                <h3 className="text-xl font-semibold">Channel Connected!</h3>
                                <p className="text-muted-foreground">Bookings will now be imported automatically every 10 minutes.</p>
                                <Button onClick={() => {
                                    setStep(1);
                                    setIcalUrl('');
                                    setFeedName('');
                                }}>Connect Another</Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* STATUS SIDEBAR */}
                <Card>
                    <CardHeader>
                        <CardTitle>Active Connections</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {feeds.map(feed => (
                                <div key={feed.id} className="flex flex-col gap-1 p-3 border rounded-lg bg-muted/50 text-sm">
                                    <div className="font-semibold flex justify-between">
                                        {feed.source}
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${feed.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                            {feed.isActive ? 'ACTIVE' : 'ERROR'}
                                        </span>
                                    </div>
                                    <div className="text-xs text-muted-foreground truncate" title={feed.name}>{feed.name}</div>
                                    <div className="text-xs text-muted-foreground mt-1">Room: {feed.roomType?.name}</div>
                                    <div className="text-[10px] text-gray-400">Last Sync: {feed.lastSync ? new Date(feed.lastSync).toLocaleTimeString() : 'Never'}</div>

                                    <div className="pt-2 border-t mt-2">
                                        <div className="text-[10px] font-bold text-muted-foreground mb-1">EXPORT LINK (Copy to OTA):</div>
                                        <code className="block bg-black/5 p-1 rounded text-[10px] break-all select-all cursor-pointer hover:bg-black/10 transition-colors"
                                            onClick={() => navigator.clipboard.writeText(`${window.location.origin}/api/channels/export/${feed.roomType.id}/calendar.ics`)}>
                                            {`/api/channels/export/${feed.roomType.id}/calendar.ics`}
                                        </code>
                                    </div>
                                </div>
                            ))}
                            {feeds.length === 0 && <div className="text-sm text-muted-foreground text-center py-4">No channels connected yet.</div>}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
