"use client";
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Mail, BellRing, CheckCircle2, ShieldCheck, AlertTriangle, Pencil, Trash2 } from 'lucide-react';

export type MailConfigGraph = {
    tenantId?: string;
    clientId?: string;
    senderEmail?: string;
    clientSecret?: string | null;
    clientSecretConfigured?: boolean;
};

export type MailConfigValue = {
    host?: string;
    port?: string | number;
    user?: string;
    pass?: string | null;
    from?: string;
    notificationsEnabled?: boolean;
    passConfigured?: boolean;
    graph?: MailConfigGraph;
};

interface Props {
    mailConfig: MailConfigValue;
    onChange: (next: MailConfigValue) => void;
}

function domainOf(email?: string): string {
    if (!email) return '';
    const at = email.indexOf('@');
    return at >= 0 ? email.slice(at + 1).toLowerCase() : '';
}

export function MailConfigSection({ mailConfig, onChange }: Props) {
    const cfg = mailConfig || {};
    const graph: MailConfigGraph = cfg.graph || {};

    const [pwEdit, setPwEdit] = useState(false);
    const [secretEdit, setSecretEdit] = useState(false);

    const update = (patch: Partial<MailConfigValue>) => onChange({ ...cfg, ...patch });
    const updateGraph = (patch: Partial<MailConfigGraph>) => onChange({ ...cfg, graph: { ...graph, ...patch } });

    const graphReady = !!(graph.tenantId && graph.clientId && graph.senderEmail && graph.clientSecretConfigured);
    const graphPartial = !graphReady && !!(graph.tenantId || graph.clientId || graph.senderEmail || graph.clientSecretConfigured);
    const smtpHasUser = !!cfg.user;
    const userDomain = domainOf(cfg.user);
    const fromDomain = domainOf(cfg.from);
    const domainMismatch = !!cfg.from && !!cfg.user && userDomain !== fromDomain;

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600">
                        <Mail className="w-5 h-5" />
                    </div>
                    <div>
                        <CardTitle>Configuración del Servidor de Envío</CardTitle>
                        <CardDescription>Define cómo se envían las notificaciones de este restaurante/hotel.</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Toggle global */}
                <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500 text-white rounded-full">
                            <BellRing className="w-4 h-4" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold">Notificaciones por Email</p>
                            <p className="text-xs text-muted-foreground italic">Activa o desactiva el envío de correos automáticos.</p>
                        </div>
                    </div>
                    <Switch
                        checked={cfg.notificationsEnabled !== false}
                        onCheckedChange={(checked) => update({ notificationsEnabled: checked })}
                    />
                </div>

                {/* Banner del transporte activo */}
                {graphReady && (
                    <Alert className="border-emerald-200 bg-emerald-50 dark:bg-emerald-900/10 dark:border-emerald-900/30">
                        <ShieldCheck className="h-4 w-4 text-emerald-600" />
                        <AlertTitle className="text-emerald-800 dark:text-emerald-200">
                            Microsoft Graph activo
                        </AlertTitle>
                        <AlertDescription className="text-emerald-700 dark:text-emerald-300">
                            Los emails se envían vía Microsoft Graph desde <strong>{graph.senderEmail}</strong>. Los datos SMTP de abajo solo se usarían como <em>fallback</em> si Graph fallara.
                        </AlertDescription>
                    </Alert>
                )}
                {!graphReady && graphPartial && (
                    <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-900/30">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <AlertTitle className="text-amber-800 dark:text-amber-200">Microsoft Graph incompleto</AlertTitle>
                        <AlertDescription className="text-amber-700 dark:text-amber-300">
                            Faltan datos para activar Graph. Mientras tanto se usará SMTP si está configurado, o no se enviará nada.
                        </AlertDescription>
                    </Alert>
                )}
                {!graphReady && !graphPartial && smtpHasUser && (
                    <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-900/10 dark:border-blue-900/30">
                        <Mail className="h-4 w-4 text-blue-600" />
                        <AlertTitle className="text-blue-800 dark:text-blue-200">Envío vía SMTP</AlertTitle>
                        <AlertDescription className="text-blue-700 dark:text-blue-300">
                            Los emails se envían con el SMTP de abajo. Si quieres usar Microsoft Graph, rellena el bloque "Microsoft Graph".
                        </AlertDescription>
                    </Alert>
                )}

                {/* Microsoft Graph */}
                <div className="rounded-xl border p-4 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-emerald-600" />
                            <h4 className="text-sm font-semibold">Microsoft Graph (recomendado)</h4>
                            {graphReady && (
                                <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 border-emerald-200">
                                    Activo
                                </Badge>
                            )}
                        </div>
                        <p className="text-[11px] text-muted-foreground italic">Preferido sobre SMTP cuando está configurado.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Tenant ID</Label>
                            <Input
                                value={graph.tenantId || ''}
                                onChange={(e) => updateGraph({ tenantId: e.target.value })}
                                placeholder="00000000-0000-0000-0000-000000000000"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Client ID</Label>
                            <Input
                                value={graph.clientId || ''}
                                onChange={(e) => updateGraph({ clientId: e.target.value })}
                                placeholder="00000000-0000-0000-0000-000000000000"
                            />
                        </div>
                        <div className="md:col-span-2 space-y-2">
                            <Label>Sender Email (buzón que envía)</Label>
                            <Input
                                value={graph.senderEmail || ''}
                                onChange={(e) => updateGraph({ senderEmail: e.target.value })}
                                placeholder="info@tudominio.com"
                            />
                            <p className="text-[10px] text-muted-foreground">
                                Debe ser un buzón real del tenant con permiso <code>Mail.Send</code>.
                            </p>
                        </div>
                        <div className="md:col-span-2 space-y-2">
                            <Label>Client Secret</Label>
                            {graph.clientSecretConfigured && !secretEdit && graph.clientSecret !== null ? (
                                <div className="flex flex-wrap items-center gap-2">
                                    <Badge variant="secondary" className="gap-1 bg-emerald-100 text-emerald-700 border-emerald-200">
                                        <CheckCircle2 className="w-3 h-3" /> Configurado
                                    </Badge>
                                    <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => setSecretEdit(true)}>
                                        <Pencil className="w-3 h-3" /> Cambiar
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="gap-1 text-red-600 hover:bg-red-50"
                                        onClick={() => {
                                            if (window.confirm('¿Borrar el Client Secret de Microsoft Graph guardado? Graph dejará de enviar hasta que metas uno nuevo.')) {
                                                updateGraph({ clientSecret: null });
                                            }
                                        }}
                                    >
                                        <Trash2 className="w-3 h-3" /> Borrar
                                    </Button>
                                </div>
                            ) : graph.clientSecret === null ? (
                                <div className="flex flex-wrap items-center gap-2">
                                    <Badge variant="destructive" className="gap-1">Pendiente de borrar al guardar</Badge>
                                    <Button type="button" variant="ghost" size="sm" onClick={() => updateGraph({ clientSecret: undefined })}>
                                        Deshacer
                                    </Button>
                                </div>
                            ) : (
                                <Input
                                    type="password"
                                    autoComplete="new-password"
                                    value={typeof graph.clientSecret === 'string' ? graph.clientSecret : ''}
                                    onChange={(e) => updateGraph({ clientSecret: e.target.value })}
                                    placeholder={graph.clientSecretConfigured ? 'Escribe para reemplazar el actual…' : 'Pega el secret de Azure'}
                                />
                            )}
                        </div>
                    </div>
                </div>

                {/* SMTP */}
                <div className="rounded-xl border p-4 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-slate-500" />
                            <h4 className="text-sm font-semibold">SMTP {graphReady && <span className="text-xs font-normal text-muted-foreground">(fallback)</span>}</h4>
                        </div>
                        {(cfg.host || cfg.user || cfg.from || cfg.passConfigured) && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="gap-1 text-red-600 hover:bg-red-50"
                                onClick={() => {
                                    if (window.confirm('¿Borrar todas las credenciales SMTP guardadas (host, puerto, usuario, contraseña y remitente)?')) {
                                        update({ host: '', port: '', user: '', from: '', pass: null });
                                    }
                                }}
                            >
                                <Trash2 className="w-3 h-3" /> Borrar credenciales SMTP
                            </Button>
                        )}
                    </div>

                    {domainMismatch && (
                        <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-900/30">
                            <AlertTriangle className="h-4 w-4 text-amber-600" />
                            <AlertTitle className="text-amber-800 dark:text-amber-200">Posible fallo de SPF/DMARC</AlertTitle>
                            <AlertDescription className="text-amber-700 dark:text-amber-300">
                                El usuario SMTP (<code>{userDomain || '—'}</code>) y el remitente (<code>{fromDomain || '—'}</code>) están en dominios distintos. La mayoría de proveedores rechazarán estos emails. Usa una cuenta del mismo dominio que el remitente, o cambia a Microsoft Graph.
                            </AlertDescription>
                        </Alert>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Servidor SMTP</Label>
                            <Input
                                value={cfg.host || ''}
                                onChange={(e) => update({ host: e.target.value })}
                                placeholder="smtp.office365.com"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Puerto</Label>
                            <Input
                                value={cfg.port?.toString() || ''}
                                onChange={(e) => update({ port: e.target.value })}
                                placeholder="587"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Usuario / Email</Label>
                            <Input
                                value={cfg.user || ''}
                                onChange={(e) => update({ user: e.target.value })}
                                placeholder="usuario@ejemplo.com"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Contraseña (o Contraseña de Aplicación)</Label>
                            {cfg.passConfigured && !pwEdit && cfg.pass !== null ? (
                                <div className="flex flex-wrap items-center gap-2 pt-1">
                                    <Badge variant="secondary" className="gap-1 bg-emerald-100 text-emerald-700 border-emerald-200">
                                        <CheckCircle2 className="w-3 h-3" /> Configurada
                                    </Badge>
                                    <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => setPwEdit(true)}>
                                        <Pencil className="w-3 h-3" /> Cambiar
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="gap-1 text-red-600 hover:bg-red-50"
                                        onClick={() => {
                                            if (window.confirm('¿Borrar la contraseña SMTP guardada?')) {
                                                update({ pass: null });
                                            }
                                        }}
                                    >
                                        <Trash2 className="w-3 h-3" /> Borrar
                                    </Button>
                                </div>
                            ) : cfg.pass === null ? (
                                <div className="flex flex-wrap items-center gap-2 pt-1">
                                    <Badge variant="destructive">Pendiente de borrar al guardar</Badge>
                                    <Button type="button" variant="ghost" size="sm" onClick={() => update({ pass: undefined })}>
                                        Deshacer
                                    </Button>
                                </div>
                            ) : (
                                <Input
                                    type="password"
                                    autoComplete="new-password"
                                    value={typeof cfg.pass === 'string' ? cfg.pass : ''}
                                    onChange={(e) => update({ pass: e.target.value })}
                                    placeholder={cfg.passConfigured ? 'Escribe para reemplazar la actual…' : 'Contraseña SMTP'}
                                />
                            )}
                        </div>
                        <div className="md:col-span-2 space-y-2">
                            <Label>Email remitente (aparecerá como el 'De:')</Label>
                            <Input
                                value={cfg.from || ''}
                                onChange={(e) => update({ from: e.target.value })}
                                placeholder="reservas@tudominio.com"
                            />
                            <p className="text-[10px] text-muted-foreground">
                                Si se deja vacío, se usará el usuario/email de arriba. Debe estar en el mismo dominio que el usuario SMTP.
                            </p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
