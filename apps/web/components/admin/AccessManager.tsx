"use client";
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Users, Mail, ShieldCheck, Trash2, Settings2, CheckCircle2, Lock, Pencil, X, Save, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchAPIAdmin } from '@/lib/api-admin';

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
                fetchAPIAdmin<AuthorizedUser[]>(`/restaurant/${contextId}/users`),
                fetchAPIAdmin<AccessProfile[]>(`/restaurant/${contextId}/access-profiles`).catch(() => [] as AccessProfile[])
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
            await fetchAPIAdmin(`/restaurant/${contextId}/users`, {
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
            await fetchAPIAdmin(`/restaurant/${contextId}/users/${userId}`, {
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
                await fetchAPIAdmin(`/restaurant/access-profiles/${editingProfile.id}`, {
                    method: 'PATCH',
                    body: JSON.stringify({
                        name: editorName.trim(),
                        baseRole: editorBaseRole,
                        permissions: editorPermissions
                    })
                });
            } else {
                await fetchAPIAdmin(`/restaurant/${contextId}/access-profiles`, {
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
            await fetchAPIAdmin(`/restaurant/access-profiles/${profile.id}`, {
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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
                <div className="flex flex-col gap-1">
                    <h3 className="font-display text-xl font-medium tracking-tight flex items-center gap-2">
                        <ShieldCheck className="size-5 text-primary" />
                        Control de Accesos y Roles
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        Controla quién puede operar en este {contextType === 'hotel' ? 'hotel' : 'restaurante'}.
                    </p>
                </div>
                <div className="flex bg-muted p-1 rounded-md self-start">
                    <button
                        onClick={() => setIsManagingProfiles(false)}
                        className={cn(
                            "px-4 py-1.5 text-xs font-semibold rounded-md transition-all",
                            !isManagingProfiles ? "bg-card shadow-xs text-foreground" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        Autorizar Personal
                    </button>
                    <button
                        onClick={() => setIsManagingProfiles(true)}
                        className={cn(
                            "px-4 py-1.5 text-xs font-semibold rounded-md transition-all",
                            isManagingProfiles ? "bg-card shadow-xs text-foreground" : "text-muted-foreground hover:text-foreground"
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
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-display text-base font-medium tracking-tight">Nuevo Acceso Directo</CardTitle>
                                <CardDescription>Invita a un empleado y asígnale un perfil de permisos.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-eyebrow">Correo Electrónico</Label>
                                            <div className="relative">
                                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                                                <Input
                                                    type="email"
                                                    className="h-10 pl-10"
                                                    placeholder="ej: nombre@sotodelprior.com"
                                                    value={email}
                                                    onChange={e => setEmail(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-eyebrow">Contraseña de Acceso</Label>
                                            <div className="relative">
                                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                                                <Input
                                                    type="password"
                                                    className="h-10 pl-10"
                                                    placeholder="Contraseña temporal"
                                                    value={password}
                                                    onChange={e => setPassword(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <Label className="text-eyebrow">Seleccionar Perfil Rápido</Label>
                                        {profiles.length === 0 ? (
                                            <p className="text-xs text-muted-foreground italic">No hay perfiles definidos. Crea uno en la pestaña «Configurar perfiles».</p>
                                        ) : (
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                {profiles.map(profile => (
                                                    <button
                                                        key={profile.id}
                                                        onClick={() => handleProfileChange(profile.id)}
                                                        className={cn(
                                                            "flex flex-col items-center justify-center p-3 rounded-md border transition-all text-center gap-1",
                                                            selectedProfileId === profile.id
                                                                ? "border-primary bg-primary/10 text-primary"
                                                                : "border-border hover:border-border/60 hover:bg-muted/30"
                                                        )}
                                                    >
                                                        <span className="text-xs font-semibold">{profile.name}</span>
                                                        <span className="text-[10px] text-muted-foreground">{permsToArray(profile.permissions).length} permisos</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-4 pt-4 border-t border-border">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-eyebrow flex items-center gap-2">
                                            <Lock className="size-3" /> Revisar Permisos Específicos
                                        </Label>
                                        <StatusBadge tone="warning" dot={false} className="text-[10px]">Personalizable</StatusBadge>
                                    </div>
                                    <div className="grid gap-3">
                                        {AVAILABLE_PERMISSIONS.map(perm => (
                                            <label
                                                key={perm.id}
                                                className={cn(
                                                    "flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-all hover:bg-muted/30",
                                                    customPermissions.includes(perm.id) ? "border-success/30 bg-success/10" : "border-border opacity-60"
                                                )}
                                            >
                                                <Checkbox
                                                    checked={customPermissions.includes(perm.id)}
                                                    onCheckedChange={() => togglePermission(perm.id)}
                                                />
                                                <div className="flex-1">
                                                    <p className="text-xs font-semibold text-foreground">{perm.label}</p>
                                                    <p className="text-[10px] text-muted-foreground">{perm.description}</p>
                                                </div>
                                                {customPermissions.includes(perm.id) && <CheckCircle2 className="size-4 text-success" />}
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <Button
                                    onClick={handleGrantAccess}
                                    className="w-full gap-2"
                                    size="lg"
                                    disabled={!email || !password || saving || profiles.length === 0}
                                >
                                    <ShieldCheck className="size-5" /> {saving ? 'Procesando...' : 'Conceder Acceso al Personal'}
                                </Button>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Columna Derecha: Lista de usuarios actuales */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-medium flex items-center gap-2 px-1">
                            <Users className="size-4 text-muted-foreground" /> Personal Autorizado
                        </h4>
                        <Card className="overflow-hidden">
                            <div className="divide-y divide-border/60">
                                {loading ? (
                                    <div className="p-8 text-center text-sm text-muted-foreground">Cargando personal...</div>
                                ) : users.length === 0 ? (
                                    <EmptyState
                                        icon={Users}
                                        title="Sin empleados activos"
                                        description="Aún no has autorizado a nadie para este centro."
                                    />
                                ) : (
                                    users.map(user => (
                                        <div key={user.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="size-8 bg-primary/10 rounded-full flex items-center justify-center text-primary text-xs font-semibold">
                                                    {user.email[0].toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-xs font-semibold">{user.email}</p>
                                                    <p className="text-[10px] text-muted-foreground">{user.role}</p>
                                                </div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                aria-label="Eliminar acceso"
                                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                onClick={() => handleRemoveAccess(user.id)}
                                            >
                                                <Trash2 className="size-3.5" />
                                            </Button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </Card>

                        <Card className="bg-warning/10 border-warning/30">
                            <CardContent className="p-4 flex gap-3">
                                <span className="grid place-items-center size-9 rounded-md bg-warning/20 text-warning-foreground h-fit">
                                    <Settings2 className="size-4" />
                                </span>
                                <div className="space-y-1">
                                    <p className="text-xs font-semibold text-warning-foreground">Seguridad TPV</p>
                                    <p className="text-[11px] text-muted-foreground">Los empleados autorizados podrán logearse usando su correo corporativo en la interfaz de servicio.</p>
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
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle className="font-display text-base font-medium tracking-tight">{editingProfile.id ? 'Editar Perfil' : 'Nuevo Perfil'}</CardTitle>
                                    <CardDescription>Define el rol base y los permisos asociados.</CardDescription>
                                </div>
                                <Button variant="ghost" size="icon-sm" aria-label="Cerrar editor" onClick={closeEditor}>
                                    <X className="size-4" />
                                </Button>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-eyebrow">Nombre del Perfil</Label>
                                        <Input
                                            type="text"
                                            className="h-10"
                                            placeholder="ej: Auxiliar, Limpieza, Recepción..."
                                            value={editorName}
                                            onChange={e => setEditorName(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-eyebrow">Rol Base del Sistema</Label>
                                        <Select value={editorBaseRole} onValueChange={setEditorBaseRole}>
                                            <SelectTrigger className="w-full h-10">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {BASE_ROLES.map(r => (
                                                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <Label className="text-eyebrow flex items-center gap-2">
                                        <Lock className="size-3" /> Permisos del Perfil
                                    </Label>
                                    <div className="grid gap-2">
                                        {AVAILABLE_PERMISSIONS.map(perm => (
                                            <label
                                                key={perm.id}
                                                className={cn(
                                                    "flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-all hover:bg-muted/30",
                                                    editorPermissions.includes(perm.id) ? "border-success/30 bg-success/10" : "border-border opacity-60"
                                                )}
                                            >
                                                <Checkbox
                                                    checked={editorPermissions.includes(perm.id)}
                                                    onCheckedChange={() => toggleEditorPermission(perm.id)}
                                                />
                                                <div className="flex-1">
                                                    <p className="text-xs font-semibold text-foreground">{perm.label}</p>
                                                    <p className="text-[10px] text-muted-foreground">{perm.description}</p>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex justify-end gap-2 pt-4 border-t border-border">
                                    <Button variant="outline" onClick={closeEditor} disabled={savingProfile}>Cancelar</Button>
                                    <Button onClick={handleSaveProfile} className="gap-2" disabled={savingProfile}>
                                        <Save className="size-4" />
                                        {savingProfile ? 'Guardando...' : 'Guardar Perfil'}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card className="border-dashed">
                            <CardContent className="p-12 text-center space-y-4">
                                <span className="grid place-items-center size-16 rounded-full bg-primary/10 text-primary mx-auto">
                                    <Settings2 className="size-7" />
                                </span>
                                <div className="space-y-2 max-w-sm mx-auto">
                                    <h4 className="font-display text-lg font-medium tracking-tight">Editor de Perfiles Operativos</h4>
                                    <p className="text-sm text-muted-foreground">Crea plantillas de acceso (ej: Auxiliar, Limpieza, Recepción) para asignarlas rápidamente sin marcar cada permiso a mano.</p>
                                </div>
                                <Button variant="outline" className="gap-2" onClick={openNewProfile}>
                                    <Plus className="size-4" /> Crear Nuevo Perfil
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {profiles.map(p => (
                            <div key={p.id} className="p-4 rounded-md border border-border bg-card flex flex-col gap-3 group hover:border-primary/30 transition-colors">
                                <div className="flex justify-between items-start gap-2">
                                    <div>
                                        <p className="font-medium text-sm">{p.name}</p>
                                        <span className="text-[10px] text-muted-foreground font-mono">{p.baseRole}</span>
                                    </div>
                                    {p.system ? (
                                        <StatusBadge tone="neutral" dot={false} className="text-[9px] py-0">Sistema</StatusBadge>
                                    ) : (
                                        <StatusBadge tone="accent" dot={false} className="text-[9px] py-0">Personalizado</StatusBadge>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-1 min-h-[24px]">
                                    {permsToArray(p.permissions).length === 0 ? (
                                        <span className="text-[10px] text-muted-foreground italic">Sin permisos asignados</span>
                                    ) : (
                                        permsToArray(p.permissions).map(perm => (
                                            <span key={perm} className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">
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
                                            className="flex-1 text-[10px] uppercase tracking-wide font-semibold text-muted-foreground hover:text-primary gap-1"
                                            onClick={() => openEditProfile(p)}
                                        >
                                            <Pencil className="size-3" /> Editar
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-[10px] uppercase tracking-wide font-semibold text-destructive hover:text-destructive hover:bg-destructive/10 gap-1"
                                            onClick={() => handleDeleteProfile(p)}
                                        >
                                            <Trash2 className="size-3" />
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
