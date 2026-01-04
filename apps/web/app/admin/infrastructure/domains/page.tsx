"use client";

import { useState } from 'react';
import { Search, Plus, MoreVertical, Lock, ShieldAlert, RefreshCw, Settings, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';

// Dummy Data matching user domains
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
        <div className="p-6 space-y-6 bg-gray-50 min-h-screen">

            {/* Header */}
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold font-oswald text-[#0A0A0A]">Dominios</h1>
                <Button className="bg-[#1e40af] hover:bg-[#1e3a8a] text-white flex gap-2">
                    <Plus className="w-4 h-4" /> Añadir nuevo dominio
                </Button>
            </div>

            {/* Toolbar */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex justify-between items-center">
                <div className="relative w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                        placeholder="Buscar por dominio..."
                        className="pl-9 bg-white"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Button variant="ghost" size="icon">
                    <Settings className="w-4 h-4" />
                </Button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase font-medium">
                        <tr>
                            <th className="p-4 w-10 text-center"><Checkbox /></th>
                            <th className="p-4 text-left">Dominios</th>
                            <th className="p-4 text-left">Propietario</th>
                            <th className="p-4 text-left">Sitio</th>
                            <th className="p-4 text-left">SSL</th>
                            <th className="p-4 text-left">Caduca/Se Renueva el</th>
                            <th className="p-4 text-left">Estado</th>
                            <th className="p-4 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filtered.map((domain) => (
                            <tr key={domain.id} className="hover:bg-gray-50 group transition-colors">
                                <td className="p-4 text-center"><Checkbox /></td>
                                <td className="p-4 font-medium text-[#0A0A0A]">{domain.domain}</td>
                                <td className="p-4 text-gray-600">{domain.owner}</td>
                                <td className="p-4 text-gray-600">-</td>
                                <td className="p-4">
                                    {domain.ssl ? (
                                        <div className="flex items-center gap-1.5 text-green-600 font-medium text-xs">
                                            <Lock className="w-3.5 h-3.5" /> Activo
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1.5 text-orange-500 font-medium text-xs">
                                            <Lock className="w-3.5 h-3.5" /> Desactivado
                                        </div>
                                    )}
                                </td>
                                <td className="p-4 text-gray-500">
                                    {domain.status === 'Desactivado' ? (
                                        <span className="flex items-center gap-2 text-orange-600">
                                            <ShieldAlert className="w-4 h-4" /> {domain.expiry} caducado
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-2">
                                            <RefreshCw className="w-3 h-3 text-gray-400" /> Se renovará el {domain.expiry}
                                        </span>
                                    )}
                                </td>
                                <td className="p-4">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${domain.status === 'Activo' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                                        }`}>
                                        {domain.status}
                                    </span>
                                </td>
                                <td className="p-4 text-right">
                                    <div className="flex items-center justify-end gap-2 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button className="hover:text-black">Ver ajustes</button>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem>Ver ajustes</DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem>Gestionar DNS</DropdownMenuItem>
                                                <DropdownMenuItem>Gestionar información de contacto</DropdownMenuItem>
                                                <DropdownMenuItem>Renovar ahora</DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem>Gestionar las renovaciones automáticas</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
