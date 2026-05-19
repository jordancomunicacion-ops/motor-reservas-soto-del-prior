"use client";

import { useState } from 'react';
import { Search, Plus, MoreVertical, Lock, ShieldAlert, RefreshCw, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';

const initialDomains = [
    { id: '1', domain: 'jordazola.com', owner: 'Soto del prior', ssl: true, expiry: '29 jul 2026', status: 'Activo' },
    { id: '2', domain: 'montagusandwich.com', owner: 'Soto del prior', ssl: true, expiry: '26 mar 2026', status: 'Activo' },
    { id: '3', domain: 'oteyzerena.com', owner: 'Soto del prior', ssl: false, expiry: '25 ago 2025', status: 'Desactivado' },
    { id: '4', domain: 'sotodelprior.com', owner: 'Soto del prior', ssl: true, expiry: '17 mar 2026', status: 'Activo' },
];

export default function DomainsPage() {
    const [domains] = useState(initialDomains);
    const [searchTerm, setSearchTerm] = useState('');

    const filtered = domains.filter(d => d.domain.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="space-y-8">
            <PageHeader
                eyebrow="Infraestructura"
                title="Dominios"
                description="Gestiona los dominios asociados a tus propiedades."
                actions={
                    <Button>
                        <Plus className="size-4" /> Añadir dominio
                    </Button>
                }
            />

            <Card className="p-4 flex justify-between items-center gap-3 py-3">
                <div className="relative w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                    <Input
                        placeholder="Buscar por dominio…"
                        className="pl-9 h-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Button variant="ghost" size="icon-sm" aria-label="Ajustes">
                    <Settings className="size-4" />
                </Button>
            </Card>

            <Card className="overflow-hidden p-0 gap-0">
                <table className="w-full text-sm">
                    <thead className="bg-muted/40 border-b border-border">
                        <tr className="text-eyebrow text-muted-foreground">
                            <th className="p-3 w-10 text-center"><Checkbox /></th>
                            <th className="p-3 text-left font-medium">Dominio</th>
                            <th className="p-3 text-left font-medium">Propietario</th>
                            <th className="p-3 text-left font-medium">Sitio</th>
                            <th className="p-3 text-left font-medium">SSL</th>
                            <th className="p-3 text-left font-medium">Caduca / renueva</th>
                            <th className="p-3 text-left font-medium">Estado</th>
                            <th className="p-3 text-right font-medium">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                        {filtered.map((domain) => (
                            <tr key={domain.id} className="hover:bg-accent/40 group transition-colors">
                                <td className="p-3 text-center"><Checkbox /></td>
                                <td className="p-3 font-medium text-foreground">{domain.domain}</td>
                                <td className="p-3 text-muted-foreground">{domain.owner}</td>
                                <td className="p-3 text-muted-foreground">—</td>
                                <td className="p-3">
                                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${domain.ssl ? 'text-success' : 'text-warning-foreground'}`}>
                                        <Lock className="size-3.5" /> {domain.ssl ? 'Activo' : 'Desactivado'}
                                    </span>
                                </td>
                                <td className="p-3 text-muted-foreground text-xs">
                                    {domain.status === 'Desactivado' ? (
                                        <span className="inline-flex items-center gap-1.5 text-destructive">
                                            <ShieldAlert className="size-3.5" /> {domain.expiry} caducado
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1.5">
                                            <RefreshCw className="size-3" /> Se renovará el {domain.expiry}
                                        </span>
                                    )}
                                </td>
                                <td className="p-3">
                                    <StatusBadge tone={domain.status === 'Activo' ? 'success' : 'warning'}>
                                        {domain.status}
                                    </StatusBadge>
                                </td>
                                <td className="p-3 text-right">
                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon-sm" aria-label="Más">
                                                    <MoreVertical className="size-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem>Ver ajustes</DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem>Gestionar DNS</DropdownMenuItem>
                                                <DropdownMenuItem>Gestionar contacto</DropdownMenuItem>
                                                <DropdownMenuItem>Renovar ahora</DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem>Renovaciones automáticas</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Card>
        </div>
    );
}
