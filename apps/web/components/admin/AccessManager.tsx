"use client";
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Users, Mail, ShieldCheck, Trash2, Settings2, CheckCircle2, Lock, Pencil, X, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchAPI } from '@/lib/api';

// Definición de permisos disponibles sincronizados con el Menú Principal
const AVAILABLE_PERMISSIONS = [
    { id: 'view_dashboard', label: 'Dashboard', description: 'Acceso al panel de control y resumen' },
    { id: 'view_calendar', label: 'Calendario y Reservas', description: 'Permite ver y gestionar el listado y calendario' },
    { id: 'view_occupancy', label: 'Planning de Ocupación', description: 'Acceso al plano de sala y gestión de mesas' },
    { id: 'manage_restaurant', label: 'Restaurante', description: 'Acceso a la configuración y gestión del restaurante' },
    { id: 'manage_hotels', label: 'Hoteles', description: 'Acceso a la gestión de inventario y tarifas de hotel' },
    { id: 'manage_events', label: 'Eventos', description: 'Acceso a la creación y gestión de eventos' },
];

const BASE_ROLES = [
    { value: 'STAFF', label: 'Personal Operativo' },
    { value: 'MANAGER', label: 'Gerencia' },
    { value: 'RECEPTIONIST', label: 'Recepción' },
    { value: 'ADMIN', label: 'Administrador' },
];

// Perfiles del sistema (siempre disponibles, no editables)
const SYSTEM_PROFILES = [
    { id: 'sys-staff', name: 'Personal Operativo', baseRole: 'STAFF', permissions: 'view_dashboard,view_calendar,view_occupancy', system: true },
    { id: 'sys-manager', name: 'Gerencia / Propietario', baseRole: 'MANAGER', permissions: 'view_dashboard,view_calendar,view_occupancy,manage_restaurant,manage_hotels,manage_events', system: true },
];

type AccessProfile = {
    id: string;
    name: string;
    baseRole: string;
    permissions: string | null;
    system?: boolean;
};

interface AuthorizedUser {
    id: string;
    email: string;
    name?: string | null;
    role: string;
    permissions?: string | null;
}

function permsToArray(p: string | null | undefined): string[] {
    return (p || '').split(',').map(s => s.trim()).filter(Boolean);
}

export default function AccessManager({ contextId, contextType }: { contextId: string, contextType: string }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [profiles, setProfiles] = useState<AccessProfile[]>(SYSTEM_PROFILES);
    const [selectedProfileId, setSelectedProfileId] = useState<string>(SYSTEM_PROFILES[0].id);
    const [customPermissions, setCustomPermissions] = useState<string[]>(permsToArray(SYSTEM_PROFILES[0].permissions));
    const [isManagingProfiles, setIsManagingProfiles] = useState(false);

    const [users, setUsers] = useState<AuthorizedUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Editor de perfiles
    const [editingProfile, setEditingProfile] = useState<AccessProfile | null>(null);
    const [editorName, setEditorName] = useState('');
    const [editorBaseRole, setEditorBaseRole] = useState<string>('STAFF');
    const [editorPermissions, setEditorPermissions] = useState<string[]>([]);
    const [savingProfile, setSavingProfile] = useState(false);

    useEffect(() => {
        loadAll();
    }, [contextId]);

    async function loadAll() {
        setLoading(true);
        try {
            const [usersData, profilesData] = await Promise.all([
                fetchAPI<AuthorizedUser[]>(`/restaurant/${contextId}/users`),
                fetchAPI<AccessProfile[]>(`/restaurant/${contextId}/access-profiles`).catch(() => [] as AccessProfile[])
            ]);
            setUsers(Array.isArray(usersData) ? usersData : []);
            const dbProfiles: AccessProfile[] = Array.isArray(profilesData) ? profilesData : [];
            setProfiles([...SYSTEM_PROFILES, ...dbProfiles]);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    const handleProfileChange = (profileId: string) => {
        setSelectedProfileId(profileId);
        const profile = profiles.find(p => p.id === profileId);
        if (profile) {
            setCustomPermissions(permsToArray(profile.permissions));
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
        if (!email || !password) {
            alert('Correo y contraseña son obligatorios');
            return;
        }
        const profile = profiles.find(p => p.id === selectedProfileId);
        if (!profile) {
            alert('Selecciona un perfil');
            return;
        }
        setSaving(true);
        try {
            await fetchAPI(`/restaurant/${contextId}/users`, {
                method: 'POST',
                body: JSON.stringify({
                    email,
                    password,
                    role: profile.baseRole,
                    permissions: customPermissions
                })
            });
            setEmail('');
            setPassword('');
            alert('Empleado autorizado con éxito');
            loadAll();
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
            loadAll();
        } catch (e) {
            console.error(e);
            alert('Error al eliminar acceso');
        }
    };

    // --- Profile editor handlers ---
    const openNewProfile = () => {
        setEditingProfile({ id: '', name: '', baseRole: 'STAFF', permissions: '' });
        setEditorName('');
        setEditorBaseRole('STAFF');
        setEditorPermissions([]);
    };

    const openEditProfile = (profile: AccessProfile) => {
        if (profile.system) return;
        setEditingProfile(profile);
        setEditorName(profile.name);
        setEditorBaseRole(profile.baseRole);
        setEditorPermissions(permsToArray(profile.permissions));
    };

    const closeEditor = () => {
        setEditingProfile(null);
        setEditorName('');
        setEditorBaseRole('STAFF');
        setEditorPermissions([]);
    };

    const toggleEditorPermission = (permId: string) => {
        setEditorPermissions(prev =>
            prev.includes(permId)
                ? prev.filter(p => p !== permId)
                : [...prev, permId]
        );
    };

    const handleSaveProfile = async () => {
        if (!editingProfile) return;
        if (!editorName.trim()) {
            alert('Indica un nombre para el perfil');
            return;
        }
        setSavingProfile(true);
        try {
            if (editingProfile.id) {
                await fetchAPI(`/restaurant/access-profiles/${editingProfile.id}`, {
                    method: 'PATCH',
                    body: JSON.stringify({
                        name: editorName.trim(),
                        baseRole: editorBaseRole,
                        permissions: editorPermissions
                    })
                });
            } else {
                await fetchAPI(`/restaurant/${contextId}/access-profiles`, {
                    method: 'POST',
                    body: JSON.stringify({
                        name: editorName.trim(),
                        baseRole: editorBaseRole,
                        permissions: editorPermissions
                    })
                });
            }
            closeEditor();
            loadAll();
        } catch (e) {
            console.error(e);
            alert('Error al guardar el perfil');
        } finally {
            setSavingProfile(false);
        }
    };

    const handleDeleteProfile = async (profile: AccessProfile) => {
        if (profile.system) return;
        if (!window.confirm(`¿Eliminar el perfil "${profile.name}"?`)) return;
        try {
            await fetchAPI(`/restaurant/access-profiles/${profile.id}`, {
                method: 'DELETE'
            });
            if (selectedProfileId === profile.id) {
                setSelectedProfileId(SYSTEM_PROFILES[0].id);
                setCustomPermissions(permsToArray(SYSTEM_PROFILES[0].permissions));
            }
            loadAll();
        } catch (e) {
            console.error(e);
            alert('Error al eliminar el perfil');
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
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                        <div className="space-y-2">
                                            <Label className="text-xs uppercase font-bold text-zinc-500">Contraseña de Acceso</Label>
                                            <div className="relative">
                                                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    type="password"
                                                    className="w-full h-11 pl-10 bg-white dark:bg-zinc-950 border-gray-200 dark:border-zinc-800"
                                                    placeholder="Contraseña temporal"
                                                    value={password}
                                                    onChange={e => setPassword(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <Label className="text-xs uppercase font-bold text-zinc-500">Seleccionar Perfil Rápido</Label>
                                        {profiles.length === 0 ? (
                                            <p className="text-xs text-muted-foreground italic">No hay perfiles definidos. Crea uno en la pestaña "Configurar Perfiles".</p>
                                        ) : (
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                {profiles.map(profile => (
                                                    <button
                                                        key={profile.id}
                                                        onClick={() => handleProfileChange(profile.id)}
                                                        className={cn(
                                                            "flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all text-center gap-1",
                                                            selectedProfileId === profile.id
                                                                ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400"
                                                                : "border-gray-100 dark:border-zinc-800 hover:border-gray-300 dark:hover:border-zinc-600"
                                                        )}
                                                    >
                                                        <span className="text-xs font-bold">{profile.name}</span>
                                                        <span className="text-[10px] text-muted-foreground">{permsToArray(profile.permissions).length} permisos</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
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
                                    disabled={!email || !password || saving || profiles.length === 0}
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
                    {editingProfile ? (
                        <Card>
                            <CardHeader className="border-b dark:border-zinc-700 flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle className="text-base">{editingProfile.id ? 'Editar Perfil' : 'Nuevo Perfil'}</CardTitle>
                                    <CardDescription>Define el rol base y los permisos asociados.</CardDescription>
                                </div>
                                <Button variant="ghost" size="icon" onClick={closeEditor}>
                                    <X className="w-4 h-4" />
                                </Button>
                            </CardHeader>
                            <CardContent className="p-6 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs uppercase font-bold text-zinc-500">Nombre del Perfil</Label>
                                        <Input
                                            type="text"
                                            className="h-11"
                                            placeholder="ej: Auxiliar, Limpieza, Recepción..."
                                            value={editorName}
                                            onChange={e => setEditorName(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs uppercase font-bold text-zinc-500">Rol Base del Sistema</Label>
                                        <select
                                            className="w-full h-11 rounded-md border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 text-sm"
                                            value={editorBaseRole}
                                            onChange={e => setEditorBaseRole(e.target.value)}
                                        >
                                            {BASE_ROLES.map(r => (
                                                <option key={r.value} value={r.value}>{r.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <Label className="text-xs uppercase font-bold text-zinc-500 flex items-center gap-2">
                                        <Lock className="w-3 h-3" /> Permisos del Perfil
                                    </Label>
                                    <div className="grid gap-2">
                                        {AVAILABLE_PERMISSIONS.map(perm => (
                                            <label
                                                key={perm.id}
                                                className={cn(
                                                    "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all hover:bg-gray-50 dark:hover:bg-zinc-800/50",
                                                    editorPermissions.includes(perm.id) ? "border-green-100 bg-green-50/30 dark:bg-green-900/10" : "border-gray-100 dark:border-zinc-800 opacity-60"
                                                )}
                                            >
                                                <input
                                                    type="checkbox"
                                                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                    checked={editorPermissions.includes(perm.id)}
                                                    onChange={() => toggleEditorPermission(perm.id)}
                                                />
                                                <div className="flex-1">
                                                    <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{perm.label}</p>
                                                    <p className="text-[10px] text-muted-foreground">{perm.description}</p>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex justify-end gap-2 pt-4 border-t dark:border-zinc-700">
                                    <Button variant="outline" onClick={closeEditor} disabled={savingProfile}>Cancelar</Button>
                                    <Button onClick={handleSaveProfile} className="bg-indigo-600 hover:bg-indigo-700 gap-2" disabled={savingProfile}>
                                        <Save className="w-4 h-4" />
                                        {savingProfile ? 'Guardando...' : 'Guardar Perfil'}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card className="border-dashed border-2">
                            <CardContent className="p-12 text-center space-y-4">
                                <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto">
                                    <Settings2 className="w-8 h-8 text-indigo-600" />
                                </div>
                                <div className="space-y-2 max-w-sm mx-auto">
                                    <h4 className="font-bold text-lg">Editor de Perfiles Operativos</h4>
                                    <p className="text-sm text-muted-foreground">Crea plantillas de acceso (ej: Auxiliar, Limpieza, Recepción) para asignarlas rápidamente sin marcar cada permiso a mano.</p>
                                </div>
                                <Button variant="outline" className="gap-2" onClick={openNewProfile}>
                                    <Plus className="w-4 h-4" /> Crear Nuevo Perfil
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {profiles.map(p => (
                            <div key={p.id} className="p-4 rounded-xl border bg-white dark:bg-zinc-900 flex flex-col gap-3 group hover:border-indigo-200 dark:hover:border-indigo-900 transition-colors">
                                <div className="flex justify-between items-start gap-2">
                                    <div>
                                        <p className="font-bold text-sm">{p.name}</p>
                                        <span className="text-[10px] text-muted-foreground font-mono">{p.baseRole}</span>
                                    </div>
                                    {p.system ? (
                                        <span className="text-[9px] bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full font-bold uppercase text-zinc-500">Sistema</span>
                                    ) : (
                                        <span className="text-[9px] bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 px-2 py-0.5 rounded-full font-bold uppercase">Personalizado</span>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-1 min-h-[24px]">
                                    {permsToArray(p.permissions).length === 0 ? (
                                        <span className="text-[10px] text-muted-foreground italic">Sin permisos asignados</span>
                                    ) : (
                                        permsToArray(p.permissions).map(perm => (
                                            <span key={perm} className="text-[9px] bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 px-1.5 py-0.5 rounded">
                                                {AVAILABLE_PERMISSIONS.find(ap => ap.id === perm)?.label || perm}
                                            </span>
                                        ))
                                    )}
                                </div>
                                {!p.system && (
                                    <div className="flex gap-2 mt-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="flex-1 text-[10px] uppercase font-bold text-muted-foreground hover:text-indigo-600 gap-1"
                                            onClick={() => openEditProfile(p)}
                                        >
                                            <Pencil className="w-3 h-3" /> Editar
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-[10px] uppercase font-bold text-red-500 hover:text-red-700 hover:bg-red-50 gap-1"
                                            onClick={() => handleDeleteProfile(p)}
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </Button>
                                    </div>
                                )}
                                {p.system && (
                                    <p className="text-[10px] text-muted-foreground italic mt-2">Perfil del sistema, no editable.</p>
                                )}
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
