"use client";
import { useEffect, useState, useCallback } from 'react';
import { fetchAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { CheckCircle2, RotateCw, Trash2, AlertCircle } from 'lucide-react';

interface Hotel { id: string; name: string }
interface RoomType { id: string; name: string }
interface Feed {
    id: string;
    name: string | null;
    url: string;
    source: string;
    isActive: boolean;
    lastSync: string | null;
    roomType: { id: string; name: string; hotelId: string };
}
interface SyncLog {
    id: string;
    channel: string;
    action: string;
    status: 'SUCCESS' | 'ERROR' | string;
    details: string | null;
    timestamp: string;
}
interface SyncResult { imported: number; overbooked: number; skipped: number; error?: string }

export default function ChannelWizard() {
    const [hotels, setHotels] = useState<Hotel[]>([]);
    const [selectedHotel, setSelectedHotel] = useState<string>('');
    const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
    const [feeds, setFeeds] = useState<Feed[]>([]);
    const [logs, setLogs] = useState<SyncLog[]>([]);

    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [syncingFeed, setSyncingFeed] = useState<string | null>(null);

    const [selectedRoomType, setSelectedRoomType] = useState('');
    const [channelSource, setChannelSource] = useState('BOOKING');
    const [icalUrl, setIcalUrl] = useState('');
    const [feedName, setFeedName] = useState('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchAPI<Hotel[]>('/property/hotels')
            .then(list => {
                setHotels(list || []);
                if (list && list.length > 0) setSelectedHotel(list[0].id);
            })
            .catch(() => setHotels([]));
    }, []);

    const loadRoomTypes = useCallback(async (hotelId: string) => {
        if (!hotelId) return;
        try {
            const res = await fetchAPI<RoomType[]>(`/property/hotels/${hotelId}/room-types`);
            setRoomTypes(res || []);
        } catch {
            setRoomTypes([]);
        }
    }, []);

    const loadFeeds = useCallback(async () => {
        try {
            const all = await fetchAPI<Feed[]>('/channels/feeds');
            setFeeds((all || []).filter(f => !selectedHotel || f.roomType.hotelId === selectedHotel));
        } catch {
            setFeeds([]);
        }
    }, [selectedHotel]);

    const loadLogs = useCallback(async () => {
        try {
            const res = await fetchAPI<SyncLog[]>('/channels/logs?limit=10');
            setLogs(res || []);
        } catch {
            setLogs([]);
        }
    }, []);

    useEffect(() => {
        if (!selectedHotel) return;
        loadRoomTypes(selectedHotel);
        loadFeeds();
        loadLogs();
    }, [selectedHotel, loadRoomTypes, loadFeeds, loadLogs]);

    async function handleCreateFeed() {
        if (!selectedRoomType || !icalUrl) return;
        setSubmitting(true);
        setError(null);
        try {
            // 1) Validar URL contra el origen antes de guardar
            await fetchAPI('/channels/feeds/validate', {
                method: 'POST',
                body: JSON.stringify({ url: icalUrl })
            });
            // 2) Crear feed
            await fetchAPI('/channels/feeds', {
                method: 'POST',
                body: JSON.stringify({
                    roomTypeId: selectedRoomType,
                    url: icalUrl,
                    name: feedName || undefined,
                    source: channelSource
                })
            });
            await loadFeeds();
            setStep(3);
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Error desconocido';
            setError(msg);
        } finally {
            setSubmitting(false);
        }
    }

    async function handleSyncAll() {
        setLoading(true);
        try {
            await fetchAPI('/channels/sync', { method: 'POST' });
            await loadFeeds();
            await loadLogs();
        } finally {
            setLoading(false);
        }
    }

    async function handleSyncFeed(feedId: string) {
        setSyncingFeed(feedId);
        try {
            const res = await fetchAPI<SyncResult>(`/channels/feeds/${feedId}/sync`, { method: 'POST' });
            await loadFeeds();
            await loadLogs();
            if (res.error) {
                alert(`Error en sync: ${res.error}`);
            } else {
                alert(`Sync OK: ${res.imported} importadas, ${res.skipped} ya existentes, ${res.overbooked} sin habitación libre`);
            }
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Error desconocido';
            alert(`Error: ${msg}`);
        } finally {
            setSyncingFeed(null);
        }
    }

    async function handleDeleteFeed(feedId: string) {
        if (!confirm('¿Eliminar este canal? No se borrarán las reservas ya importadas.')) return;
        try {
            await fetchAPI(`/channels/feeds/${feedId}`, { method: 'DELETE' });
            await loadFeeds();
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Error desconocido';
            alert(`Error: ${msg}`);
        }
    }

    function resetWizard() {
        setStep(1);
        setIcalUrl('');
        setFeedName('');
        setSelectedRoomType('');
        setError(null);
    }

    function getOrigin() {
        return typeof window !== 'undefined' ? window.location.origin : '';
    }

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            <PageHeader
                eyebrow="Integraciones"
                title="Channel manager"
                description="Sincroniza tu inventario con Booking.com, Airbnb y más vía iCal."
                actions={
                    <>
                        {hotels.length > 1 && (
                            <Select value={selectedHotel} onValueChange={setSelectedHotel}>
                                <SelectTrigger className="w-56"><SelectValue placeholder="Hotel…" /></SelectTrigger>
                                <SelectContent>
                                    {hotels.map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        )}
                        <Button variant="outline" onClick={handleSyncAll} disabled={loading}>
                            <RotateCw className={loading ? 'animate-spin size-4' : 'size-4'} />
                            Sincronizar todo
                        </Button>
                    </>
                }
            />

            {hotels.length === 0 && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>No hay hoteles</AlertTitle>
                    <AlertDescription>Crea un hotel primero en /admin/hotels.</AlertDescription>
                </Alert>
            )}

            <div className="grid md:grid-cols-3 gap-6">
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>Conectar nuevo canal</CardTitle>
                        <CardDescription>Pasos para enlazar un calendario iCal de una OTA.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {step === 1 && (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>1. Tipo de habitación</Label>
                                    <Select onValueChange={setSelectedRoomType} value={selectedRoomType}>
                                        <SelectTrigger><SelectValue placeholder="Elige un tipo..." /></SelectTrigger>
                                        <SelectContent>
                                            {roomTypes.length === 0 && <div className="px-2 py-1 text-xs text-muted-foreground">No hay tipos de habitación en este hotel</div>}
                                            {roomTypes.map(rt => <SelectItem key={rt.id} value={rt.id}>{rt.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>2. Canal</Label>
                                    <Select onValueChange={setChannelSource} value={channelSource}>
                                        <SelectTrigger><SelectValue placeholder="Selecciona OTA" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="BOOKING">Booking.com</SelectItem>
                                            <SelectItem value="AIRBNB">Airbnb</SelectItem>
                                            <SelectItem value="VRBO">Vrbo / Expedia</SelectItem>
                                            <SelectItem value="OTHER">Otro (iCal)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button className="w-full" onClick={() => setStep(2)} disabled={!selectedRoomType}>
                                    Siguiente: introducir URL iCal
                                </Button>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="space-y-4">
                                <Alert>
                                    <AlertTitle>Instrucciones</AlertTitle>
                                    <AlertDescription>
                                        En {channelSource}, ve a configuración del calendario y copia el enlace de «Exportar calendario (iCal)». Pégalo abajo.
                                    </AlertDescription>
                                </Alert>
                                <div className="space-y-2">
                                    <Label>URL iCal (Export Link)</Label>
                                    <Input
                                        placeholder="https://admin.booking.com/hotel/hoteladmin/ical..."
                                        value={icalUrl}
                                        onChange={e => setIcalUrl(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Nombre de la conexión (opcional)</Label>
                                    <Input
                                        placeholder="p. ej. Booking.com — Doble Deluxe"
                                        value={feedName}
                                        onChange={e => setFeedName(e.target.value)}
                                    />
                                </div>
                                {error && (
                                    <Alert variant="destructive">
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertDescription>{error}</AlertDescription>
                                    </Alert>
                                )}
                                <div className="flex gap-2">
                                    <Button variant="outline" onClick={() => setStep(1)}>Atrás</Button>
                                    <Button className="flex-1" onClick={handleCreateFeed} disabled={submitting || !icalUrl}>
                                        {submitting ? 'Validando y conectando...' : 'Conectar y sincronizar'}
                                    </Button>
                                </div>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="text-center space-y-4 py-8">
                                <div className="mx-auto grid place-items-center size-14 rounded-full bg-success/10 text-success">
                                    <CheckCircle2 className="size-7" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="font-display text-xl font-medium tracking-tight">¡Canal conectado!</h3>
                                    <p className="text-sm text-muted-foreground">Las reservas se importarán automáticamente cada 10 minutos.</p>
                                </div>
                                <Button onClick={resetWizard}>Conectar otro</Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Conexiones activas</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {feeds.map(feed => (
                                <div key={feed.id} className="flex flex-col gap-1 p-3 border border-border rounded-md bg-muted/30 text-sm">
                                    <div className="flex justify-between items-center gap-2">
                                        <span className="font-medium">{feed.source}</span>
                                        <StatusBadge tone={feed.isActive ? 'success' : 'neutral'} className="text-[10px]">
                                            {feed.isActive ? 'Activo' : 'Inactivo'}
                                        </StatusBadge>
                                    </div>
                                    <div className="text-xs text-muted-foreground truncate" title={feed.name || feed.url}>
                                        {feed.name || feed.url}
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1">Habitación: {feed.roomType?.name}</div>
                                    <div className="text-[11px] text-muted-foreground/80">
                                        Último sync: {feed.lastSync ? new Date(feed.lastSync).toLocaleString() : 'Nunca'}
                                    </div>

                                    <div className="flex gap-1 pt-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="flex-1 h-7 text-[11px]"
                                            onClick={() => handleSyncFeed(feed.id)}
                                            disabled={syncingFeed === feed.id}
                                        >
                                            <RotateCw className={`size-3 ${syncingFeed === feed.id ? 'animate-spin' : ''}`} />
                                            Sync
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                            onClick={() => handleDeleteFeed(feed.id)}
                                            aria-label="Eliminar"
                                        >
                                            <Trash2 className="size-3" />
                                        </Button>
                                    </div>

                                    <div className="pt-2 border-t border-border mt-2">
                                        <div className="text-eyebrow mb-1">Exportar iCal (pega en la OTA)</div>
                                        <code
                                            className="block bg-card border border-border p-1.5 rounded text-[11px] break-all select-all cursor-pointer hover:bg-accent/40 transition-colors font-mono"
                                            onClick={() => navigator.clipboard.writeText(`${getOrigin()}/api/channels/export/${feed.roomType.id}/calendar.ics`)}
                                        >
                                            {`/api/channels/export/${feed.roomType.id}/calendar.ics`}
                                        </code>
                                    </div>
                                </div>
                            ))}
                            {feeds.length === 0 && <div className="text-sm text-muted-foreground text-center py-6 italic">Aún no hay canales conectados.</div>}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Historial reciente de sincronización</CardTitle>
                    <CardDescription>Últimas 10 ejecuciones del cron y syncs manuales.</CardDescription>
                </CardHeader>
                <CardContent>
                    {logs.length === 0 ? (
                        <div className="text-sm text-muted-foreground">Sin actividad reciente.</div>
                    ) : (
                        <div className="space-y-0.5 text-xs font-mono">
                            {logs.map(l => (
                                <div key={l.id} className="flex items-center gap-2 py-1.5 border-b border-border/60 last:border-0">
                                    <StatusBadge tone={l.status === 'SUCCESS' ? 'success' : 'danger'} className="text-[10px]">
                                        {l.status}
                                    </StatusBadge>
                                    <span className="text-muted-foreground">{new Date(l.timestamp).toLocaleString()}</span>
                                    <span className="font-semibold">{l.channel}</span>
                                    <span>{l.action}</span>
                                    <span className="truncate flex-1 text-muted-foreground">{l.details}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
