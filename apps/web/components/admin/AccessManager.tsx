"use client";
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Users, Mail, ShieldCheck, Trash2, Settings2, CheckCircle2, ChevronRight, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchAPI } from '@/lib/api';
import { useEffect } from 'react';

// Definición de permisos disponibles sincronizados con el Menú Principal
const AVAILABLE_PERMISSIONS = [
    { id: 'view_dashboard', label: 'Dashboard', description: 'Acceso al panel de control y resumen' },
    { id: 'view_calendar', label: 'Calendario y Reservas', description: 'Permite ver y gestionar el listado y calendario' },
    { id: 'view_occupancy', label: 'Planning de Ocupación', description: 'Acceso al plano de sala y gestión de mesas' },
    { id: 'manage_restaurant', label: 'Restaurante', description: 'Acceso a la configuración y gestión del restaurante' },
    { id: 'manage_hotels', label: 'Hoteles', description: 'Acceso a la gestión de inventario y tarifas de hotel' },
    { id: 'manage_events', label: 'Eventos', description: 'Acceso a la creación y gestión de eventos' },
];

// Perfiles predefinidos (Templates)
const DEFAULT_PROFILES = [
    { id: 'STAFF', name: 'Personal Operativo', permissions: ['view_dashboard', 'view_calendar', 'view_occupancy'] },
    { id: 'MANAGER', name: 'Gerencia / Propietario', permissions: ['view_dashboard', 'view_calendar', 'view_occupancy', 'manage_restaurant', 'manage_hotels', 'manage_events'] },
];

export default function AccessManager({ contextId, contextType }: { contextId: string, contextType: string }) {
    const [email, setEmail] = useState('');
    const [selectedProfile, setSelectedProfile] = useState('STAFF');
    const [customPermissions, setCustomPermissions] = useState<string[]>(DEFAULT_PROFILES[0].permissions);
    const [isManagingProfiles, setIsManagingProfiles] = useState(false);
    
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadUsers();
    }, [contextId]);

    async function loadUsers() {
        setLoading(true);
        try {
            const data = await fetchAPI(`/restaurant/${contextId}/users`);
            setUsers(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    const handleProfileChange = (profileId: string) => {
        setSelectedProfile(profileId);
        const profile = DEFAULT_PROFILES.find(p => p.id === profileId);
        if (profile) {
            setCustomPermissions(profile.permissions);
        }
    };

    const togglePermission = (permId: string) => {
        setCustomPermissions(prev => 
            prev.includes(permId) 
                ? prev.filter(p => p !== permId) 
                : [...prev, permId]
        );
    };

    const handleGrantAccess = async () => {
        if (!email) return;
        setSaving(true);
        try {
            await fetchAPI(`/restaurant/${contextId}/users`, {
                method: 'POST',
                body: JSON.stringify({ email, permissions: customPermissions })
            });
            setEmail('');
            alert('Empleado autorizado con éxito');
            loadUsers();
        } catch (e) {
            console.error(e);
            alert('Error al autorizar empleado');
        } finally {
            setSaving(false);
        }
    };

    const handleRemoveAccess = async (userId: string) => {
        if (!window.confirm('¿Eliminar acceso de este empleado?')) return;
        try {
            await fetchAPI(`/restaurant/${contextId}/users/${userId}`, {
                method: 'DELETE'
            });
            loadUsers();
        } catch (e) {
            console.error(e);
            alert('Error al eliminar acceso');
        }
    };

    return (
        <div className="space-y-8">
            {/* Cabecera y Selector de Modo */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6 dark:border-zinc-700">
                <div className="flex flex-col gap-1">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                        <ShieldCheck className="w-6 h-6 text-indigo-600" />
                        Control de Accesos y Roles
                    </h3>
                    <p className="text-sm text-muted-foreground italic">
                        Controla quién puede operar en este {contextType === 'hotel' ? 'hotel' : 'restaurante'}.
                    </p>
                </div>
                <div className="flex bg-gray-100 dark:bg-zinc-800 p-1 rounded-lg self-start">
                    <button 
                        onClick={() => setIsManagingProfiles(false)}
                        className={cn(
                            "px-4 py-1.5 text-xs font-bold rounded-md transition-all",
                            !isManagingProfiles ? "bg-white dark:bg-zinc-700 shadow-sm text-black dark:text-white" : "text-gray-500 hover:text-black dark:hover:text-white"
                        )}
                    >
                        Autorizar Personal
                    </button>
                    <button 
                        onClick={() => setIsManagingProfiles(true)}
                        className={cn(
                            "px-4 py-1.5 text-xs font-bold rounded-md transition-all",
                            isManagingProfiles ? "bg-white dark:bg-zinc-700 shadow-sm text-black dark:text-white" : "text-gray-500 hover:text-black dark:hover:text-white"
                        )}
                    >
                        Configurar Perfiles
                    </button>
                </div>
            </div>

            {!isManagingProfiles ? (
                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Columna Izquierda: Formulario de Invitación */}
                    <div className="lg:col-span-2 space-y-6">
                        <Card className="border-none shadow-md overflow-hidden bg-gradient-to-br from-white to-gray-50 dark:from-zinc-900 dark:to-zinc-900">
                            <CardHeader className="border-b dark:border-zinc-700 bg-white/50 dark:bg-black/20">
                                <CardTitle className="text-base">Nuevo Acceso Directo</CardTitle>
                                <CardDescription>Invita a un empleado y asígnale un perfil de permisos.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-6 space-y-6">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs uppercase font-bold text-zinc-500">Correo Electrónico</Label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                            <Input 
                                                type="email" 
                                                className="w-full h-11 pl-10 bg-white dark:bg-zinc-950 border-gray-200 dark:border-zinc-800"
                                                placeholder="ej: nombre@sotodelprior.com"
                                                value={email}
                                                onChange={e => setEmail(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <Label className="text-xs uppercase font-bold text-zinc-500">Seleccionar Perfil Rápido</Label>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                            {DEFAULT_PROFILES.map(profile => (
                                                <button
                                                    key={profile.id}
                                                    onClick={() => handleProfileChange(profile.id)}
                                                    className={cn(
                                                        "flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all text-center gap-1",
                                                        selectedProfile === profile.id 
                                                            ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400" 
                                                            : "border-gray-100 dark:border-zinc-800 hover:border-gray-300 dark:hover:border-zinc-600"
                                                    )}
                                                >
                                                    <span className="text-xs font-bold">{profile.name}</span>
                                                    <span className="text-[10px] text-muted-foreground">{profile.permissions.length} permisos</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4 pt-4 border-t dark:border-zinc-700">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs uppercase font-bold text-zinc-500 flex items-center gap-2">
                                            <Lock className="w-3 h-3" /> Revisar Permisos Específicos
                                        </Label>
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold uppercase">Personalizable</span>
                                    </div>
                                    <div className="grid gap-3">
                                        {AVAILABLE_PERMISSIONS.map(perm => (
                                            <label 
                                                key={perm.id} 
                                                className={cn(
                                                    "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all hover:bg-gray-50 dark:hover:bg-zinc-800/50",
                                                    customPermissions.includes(perm.id) ? "border-green-100 bg-green-50/30 dark:bg-green-900/10" : "border-gray-100 dark:border-zinc-800 opacity-60"
                                                )}
                                            >
                                                <input 
                                                    type="checkbox" 
                                                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                    checked={customPermissions.includes(perm.id)}
                                                    onChange={() => togglePermission(perm.id)}
                                                />
                                                <div className="flex-1">
                                                    <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{perm.label}</p>
                                                    <p className="text-[10px] text-muted-foreground">{perm.description}</p>
                                                </div>
                                                {customPermissions.includes(perm.id) && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <Button 
                                    onClick={handleGrantAccess} 
                                    className="w-full h-12 gap-2 text-sm font-bold bg-indigo-600 hover:bg-indigo-700"
                                    disabled={!email || saving}
                                >
                                    <ShieldCheck className="w-5 h-5" /> {saving ? 'Procesando...' : 'Conceder Acceso al Personal'}
                                </Button>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Columna Derecha: Lista de usuarios actuales */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-bold flex items-center gap-2 px-1">
                            <Users className="w-4 h-4 text-zinc-500" /> Personal Autorizado
                        </h4>
                        <div className="bg-white dark:bg-zinc-900 border rounded-2xl overflow-hidden shadow-sm">
                                {loading ? (
                                    <div className="p-8 text-center text-sm text-muted-foreground italic">Cargando personal...</div>
                                ) : users.length === 0 ? (
                                    <div className="p-8 text-center space-y-2">
                                        <div className="w-12 h-12 bg-gray-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Users className="w-6 h-6 text-gray-400" />
                                        </div>
                                        <p className="text-sm font-medium text-zinc-500">Sin empleados activos</p>
                                        <p className="text-[11px] text-muted-foreground italic">Aún no has autorizado a nadie para este centro.</p>
                                    </div>
                                ) : (
                                    users.map(user => (
                                        <div key={user.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-zinc-800/30 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center text-indigo-600 text-xs font-bold">
                                                    {user.email[0].toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold">{user.email}</p>
                                                    <p className="text-[10px] text-muted-foreground">{user.role}</p>
                                                </div>
                                            </div>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                onClick={() => handleRemoveAccess(user.id)}
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    ))
                                )}
                        </div>
                        
                        <Card className="bg-amber-50/50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/30">
                            <CardContent className="p-4 flex gap-3">
                                <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-lg h-fit text-amber-600">
                                    <Settings2 className="w-4 h-4" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-bold text-amber-900 dark:text-amber-200">Seguridad TPV</p>
                                    <p className="text-[10px] text-amber-700 dark:text-amber-400">Los empleados autorizados podrán logearse usando su correo corporativo en la interfaz de servicio.</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            ) : (
                /* MODO GESTIÓN DE PERFILES */
                <div className="space-y-6">
                    <Card className="border-dashed border-2">
                        <CardContent className="p-12 text-center space-y-4">
                            <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto">
                                <Settings2 className="w-8 h-8 text-indigo-600" />
                            </div>
                            <div className="space-y-2 max-w-sm mx-auto">
                                <h4 className="font-bold text-lg">Editor de Perfiles Operativos</h4>
                                <p className="text-sm text-muted-foreground">Aquí podrás crear plantillas de acceso (ej: Auxiliar, Limpieza) para asignarlas rápidamente sin tener que marcar cada permiso a mano.</p>
                            </div>
                            <Button variant="outline" className="gap-2">
                                <Plus className="w-4 h-4" /> Crear Nuevo Perfil
                            </Button>
                        </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {DEFAULT_PROFILES.map(p => (
                            <div key={p.id} className="p-4 rounded-xl border bg-white dark:bg-zinc-900 flex flex-col gap-3 group hover:border-indigo-200 dark:hover:border-indigo-900 transition-colors">
                                <div className="flex justify-between items-start">
                                    <p className="font-bold text-sm">{p.name}</p>
                                    <span className="text-[10px] bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full font-mono">{p.id}</span>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                    {p.permissions.map(perm => (
                                        <span key={perm} className="text-[9px] bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 px-1.5 py-0.5 rounded">
                                            {AVAILABLE_PERMISSIONS.find(ap => ap.id === perm)?.label}
                                        </span>
                                    ))}
                                </div>
                                <Button variant="ghost" size="sm" className="w-full mt-2 text-[10px] uppercase font-bold text-muted-foreground group-hover:text-indigo-600">
                                    Editar Permisos del Perfil <ChevronRight className="w-3 h-3 ml-1" />
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function Plus({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M5 12h14"/><path d="M12 5v14"/></svg>
    );
}

