"use client";
import { useState } from "react";
import {
    Building2,
    Calendar,
    CreditCard,
    Inbox,
    PartyPopper,
    Plus,
    Settings,
    Star,
    Utensils,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { MetricCard } from "@/components/ui/metric-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { StarRating } from "@/components/ui/star-rating";

const SECTIONS = [
    { id: "colors", label: "Colores" },
    { id: "typography", label: "Tipografía" },
    { id: "buttons", label: "Botones" },
    { id: "forms", label: "Formularios" },
    { id: "badges", label: "Status Badges" },
    { id: "cards", label: "Cards" },
    { id: "metrics", label: "Metric Cards" },
    { id: "states", label: "Estados" },
    { id: "stars", label: "Star Rating" },
    { id: "headers", label: "Page Headers" },
];

export default function StyleguidePage() {
    const [rating, setRating] = useState(3);
    const [switchOn, setSwitchOn] = useState(true);
    const [checked, setChecked] = useState(true);

    return (
        <div className="space-y-10">
            <PageHeader
                eyebrow="Sistema de diseño"
                title="Styleguide"
                description="Catálogo vivo de tokens y componentes del motor de reservas. Úsalo como referencia para cualquier feature futura."
            />

            {/* Quick TOC */}
            <Card>
                <CardContent>
                    <div className="flex flex-wrap gap-2">
                        {SECTIONS.map(s => (
                            <a
                                key={s.id}
                                href={`#${s.id}`}
                                className="inline-flex items-center text-xs font-medium px-3 h-8 rounded-md border border-border bg-card hover:bg-accent transition-colors"
                            >
                                {s.label}
                            </a>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* ── COLORES ── */}
            <Section id="colors" title="Colores" description="Paleta semántica basada en tokens. Cualquier ajuste se hace en app/globals.css y se propaga.">
                <SubSection title="Tonos principales">
                    <Swatches
                        items={[
                            { name: "background", cls: "bg-background border" },
                            { name: "foreground", cls: "bg-foreground" },
                            { name: "card", cls: "bg-card border" },
                            { name: "muted", cls: "bg-muted" },
                            { name: "accent", cls: "bg-accent" },
                            { name: "border", cls: "bg-border" },
                        ]}
                    />
                </SubSection>

                <SubSection title="Primary (gold #C59D5F)">
                    <Swatches
                        items={[
                            { name: "primary", cls: "bg-primary" },
                            { name: "primary/80", cls: "bg-primary/80" },
                            { name: "primary/50", cls: "bg-primary/50" },
                            { name: "primary/20", cls: "bg-primary/20" },
                            { name: "primary/10", cls: "bg-primary/10" },
                            { name: "primary/5", cls: "bg-primary/5" },
                        ]}
                    />
                </SubSection>

                <SubSection title="Estados semánticos">
                    <Swatches
                        items={[
                            { name: "success", cls: "bg-success" },
                            { name: "success/10", cls: "bg-success/10" },
                            { name: "warning", cls: "bg-warning" },
                            { name: "warning/15", cls: "bg-warning/15" },
                            { name: "destructive", cls: "bg-destructive" },
                            { name: "destructive/10", cls: "bg-destructive/10" },
                            { name: "info", cls: "bg-info" },
                            { name: "info/10", cls: "bg-info/10" },
                        ]}
                    />
                </SubSection>
            </Section>

            {/* ── TIPOGRAFÍA ── */}
            <Section id="typography" title="Tipografía" description="Fraunces (display, titulares) + Geist Sans (UI y cuerpo). El helper .text-eyebrow es la regla universal para overlines y labels.">
                <Card>
                    <CardContent className="space-y-6">
                        <div className="space-y-1">
                            <p className="text-eyebrow">Display · Fraunces</p>
                            <h1 className="font-display text-5xl font-medium tracking-tight">
                                Soto del Prior
                            </h1>
                            <code className="text-[11px] text-muted-foreground font-mono">.font-display text-5xl font-medium tracking-tight</code>
                        </div>
                        <div className="space-y-1">
                            <h2 className="font-display text-3xl font-medium tracking-tight">
                                Boutique rural elegance
                            </h2>
                            <code className="text-[11px] text-muted-foreground font-mono">.font-display text-3xl font-medium tracking-tight</code>
                        </div>
                        <div className="space-y-1">
                            <h3 className="font-display text-xl font-medium tracking-tight">
                                Titular de sección
                            </h3>
                            <code className="text-[11px] text-muted-foreground font-mono">.font-display text-xl font-medium tracking-tight</code>
                        </div>
                        <div className="space-y-1">
                            <p className="text-base">
                                Texto cuerpo en Geist Sans. Aenean lacinia bibendum nulla sed consectetur.
                                Aliquam erat volutpat. Suspendisse potenti, vivamus magna justo.
                            </p>
                            <code className="text-[11px] text-muted-foreground font-mono">text-base</code>
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">
                                Descripción / texto secundario.
                            </p>
                            <code className="text-[11px] text-muted-foreground font-mono">text-sm text-muted-foreground</code>
                        </div>
                        <div className="space-y-1">
                            <p className="text-eyebrow">Eyebrow / overline</p>
                            <code className="text-[11px] text-muted-foreground font-mono">.text-eyebrow</code>
                        </div>
                    </CardContent>
                </Card>
            </Section>

            {/* ── BOTONES ── */}
            <Section id="buttons" title="Botones" description="Variants × tamaños. Para acciones primarias usa default; tonal para CTAs secundarios; outline para acciones neutras.">
                <SubSection title="Variants">
                    <div className="flex flex-wrap items-center gap-2">
                        <Button>Default</Button>
                        <Button variant="tonal">Tonal</Button>
                        <Button variant="outline">Outline</Button>
                        <Button variant="secondary">Secondary</Button>
                        <Button variant="ghost">Ghost</Button>
                        <Button variant="link">Link</Button>
                        <Button variant="success">Success</Button>
                        <Button variant="warning">Warning</Button>
                        <Button variant="destructive">Destructive</Button>
                    </div>
                </SubSection>
                <SubSection title="Tamaños">
                    <div className="flex flex-wrap items-center gap-2">
                        <Button size="sm">Small</Button>
                        <Button>Default</Button>
                        <Button size="lg">Large</Button>
                        <Button size="xl">Extra large</Button>
                    </div>
                </SubSection>
                <SubSection title="Con iconos">
                    <div className="flex flex-wrap items-center gap-2">
                        <Button><Plus className="size-4" /> Crear</Button>
                        <Button variant="tonal"><Calendar className="size-4" /> Programar</Button>
                        <Button variant="outline"><Settings className="size-4" /> Ajustes</Button>
                        <Button size="icon-sm" aria-label="Plus"><Plus className="size-4" /></Button>
                        <Button size="icon" aria-label="Plus"><Plus className="size-4" /></Button>
                        <Button size="icon-lg" aria-label="Plus"><Plus className="size-5" /></Button>
                    </div>
                </SubSection>
                <SubSection title="Estados">
                    <div className="flex flex-wrap items-center gap-2">
                        <Button disabled>Disabled</Button>
                        <Button variant="outline" disabled>Disabled outline</Button>
                        <Button variant="tonal" disabled>Disabled tonal</Button>
                    </div>
                </SubSection>
            </Section>

            {/* ── FORMS ── */}
            <Section id="forms" title="Formularios" description="Inputs, selects, checkbox, switch, textarea. Patrón: Label con .text-eyebrow + control con className='h-10'.">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-display text-base font-medium tracking-tight">Inputs</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="sg-input" className="text-eyebrow">Input</Label>
                                <Input id="sg-input" placeholder="placeholder" className="h-10" />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="sg-input-d" className="text-eyebrow">Disabled</Label>
                                <Input id="sg-input-d" placeholder="placeholder" className="h-10" disabled />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="sg-textarea" className="text-eyebrow">Textarea</Label>
                                <Textarea id="sg-textarea" rows={3} className="resize-none" placeholder="placeholder" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="font-display text-base font-medium tracking-tight">Selects & Toggles</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="sg-select" className="text-eyebrow">Select</Label>
                                <Select defaultValue="confirmed">
                                    <SelectTrigger id="sg-select" className="w-full h-10">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="confirmed">Confirmada</SelectItem>
                                        <SelectItem value="pending">Pendiente</SelectItem>
                                        <SelectItem value="cancelled">Cancelada</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-center gap-3">
                                <Checkbox
                                    id="sg-check"
                                    checked={checked}
                                    onCheckedChange={(v) => setChecked(!!v)}
                                />
                                <Label htmlFor="sg-check" className="text-sm font-normal cursor-pointer">
                                    Acepto los términos
                                </Label>
                            </div>
                            <div className="flex items-center gap-3">
                                <Switch
                                    id="sg-switch"
                                    checked={switchOn}
                                    onCheckedChange={setSwitchOn}
                                />
                                <Label htmlFor="sg-switch" className="text-sm font-normal cursor-pointer">
                                    Notificaciones activadas
                                </Label>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </Section>

            {/* ── STATUS BADGES ── */}
            <Section id="badges" title="Status Badges" description="Para estados (confirmada/pendiente/cancelada) y categorías. Usa siempre StatusBadge antes que inventar pills.">
                <Card>
                    <CardContent>
                        <div className="flex flex-wrap items-center gap-2">
                            <StatusBadge tone="success">Confirmada</StatusBadge>
                            <StatusBadge tone="warning">Pendiente</StatusBadge>
                            <StatusBadge tone="danger">Cancelada</StatusBadge>
                            <StatusBadge tone="info">Sincronizada</StatusBadge>
                            <StatusBadge tone="accent">Vinculado</StatusBadge>
                            <StatusBadge tone="neutral">Borrador</StatusBadge>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-3">
                            <StatusBadge tone="success" dot={false}>Sin punto</StatusBadge>
                            <StatusBadge tone="warning" dot={false}>Sin punto</StatusBadge>
                            <StatusBadge tone="danger" dot={false}>Sin punto</StatusBadge>
                        </div>
                    </CardContent>
                </Card>
            </Section>

            {/* ── CARDS ── */}
            <Section id="cards" title="Cards" description="Card es la base de todo bloque de contenido. Nunca inventes divs `bg-white p-6 rounded-2xl shadow-sm border-zinc-100` — usa Card.">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-display text-base font-medium tracking-tight">Card simple</CardTitle>
                            <CardDescription>Con título y descripción.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">
                                Contenido de la card. El padding viene del CardContent, no añadas p-6 manual.
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
                            <div className="flex items-center gap-3 min-w-0">
                                <span className="grid place-items-center size-10 rounded-md bg-primary/10 text-primary shrink-0">
                                    <Building2 className="size-5" />
                                </span>
                                <div className="min-w-0">
                                    <h3 className="font-display text-base font-medium tracking-tight truncate">Hotel Soto</h3>
                                    <p className="text-[11px] text-muted-foreground font-mono mt-0.5">#abc12345</p>
                                </div>
                            </div>
                            <StatusBadge tone="success">Activo</StatusBadge>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">
                                Patrón típico: icon-chip + título + status badge en la cabecera.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </Section>

            {/* ── METRIC CARDS ── */}
            <Section id="metrics" title="Metric Cards" description="KPIs del dashboard. Soportan tendencia (change), highlight (resaltar entidad vinculada) e icono.">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <MetricCard
                        label="Ingresos totales"
                        value="€12 480"
                        hint="vs mes pasado"
                        change={12}
                        icon={CreditCard}
                    />
                    <MetricCard
                        label="Ocupación"
                        value="68%"
                        hint="vs mes pasado"
                        change={-4}
                        icon={Building2}
                    />
                    <MetricCard
                        label="Cubiertos · vinculado"
                        value="142"
                        hint="última hora"
                        change={8}
                        icon={Utensils}
                        highlight
                    />
                    <MetricCard
                        label="Valoración"
                        value="4.7 / 5"
                        hint="38 opiniones"
                        icon={Star}
                    />
                </div>
            </Section>

            {/* ── ESTADOS ── */}
            <Section id="states" title="Estados (loading / empty)" description="Skeletons mientras se carga, EmptyState cuando no hay datos. Nunca uses 'Cargando…' suelto.">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-display text-base font-medium tracking-tight">Skeleton</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex items-center gap-3">
                                <Skeleton className="size-10 rounded-md" />
                                <div className="space-y-2 flex-1">
                                    <Skeleton className="h-4 w-2/3" />
                                    <Skeleton className="h-3 w-1/3" />
                                </div>
                            </div>
                            <Skeleton className="h-16 w-full" />
                            <Skeleton className="h-3 w-1/2" />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent>
                            <EmptyState
                                icon={Inbox}
                                title="Sin reservas recientes"
                                description="Las nuevas reservas aparecerán aquí en cuanto se confirmen."
                                action={<Button size="sm"><Plus className="size-4" /> Nueva reserva</Button>}
                            />
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardContent>
                        <EmptyState
                            icon={PartyPopper}
                            tone="danger"
                            title="No se pudo cargar"
                            description="Comprueba tu conexión y vuelve a intentarlo."
                        />
                    </CardContent>
                </Card>
            </Section>

            {/* ── STAR RATING ── */}
            <Section id="stars" title="Star Rating" description="Compartido entre páginas de review y panel admin. Interactivo o read-only.">
                <Card>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-4">
                            <Label className="text-eyebrow w-24">Interactivo</Label>
                            <StarRating value={rating} onChange={setRating} />
                            <span className="text-sm text-muted-foreground tabular-nums">{rating} / 5</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <Label className="text-eyebrow w-24">Read-only sm</Label>
                            <StarRating value={4} readOnly size="sm" />
                        </div>
                        <div className="flex items-center gap-4">
                            <Label className="text-eyebrow w-24">Read-only lg</Label>
                            <StarRating value={5} readOnly size="lg" />
                        </div>
                    </CardContent>
                </Card>
            </Section>

            {/* ── PAGE HEADERS ── */}
            <Section id="headers" title="Page Headers" description="Patrón uniforme para todas las páginas admin. Sustituye los `<h1 className='text-2xl font-bold'>` sueltos.">
                <Card>
                    <CardContent>
                        <PageHeader
                            eyebrow="Sección"
                            title="Título de la página"
                            description="Frase corta describiendo qué hace esta página."
                        />
                    </CardContent>
                </Card>
                <Card>
                    <CardContent>
                        <PageHeader
                            eyebrow="Programación"
                            title="Gestión de eventos"
                            description="Crea y gestiona eventos puntuales para tus establecimientos."
                            actions={
                                <>
                                    <Button variant="outline" size="sm"><Calendar className="size-4" /> Calendario</Button>
                                    <Button><Plus className="size-4" /> Nuevo evento</Button>
                                </>
                            }
                        />
                    </CardContent>
                </Card>
            </Section>

            {/* Footer */}
            <Card>
                <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm text-muted-foreground">
                    <p>
                        ¿Algo se ve raro o falta un patrón? Edita{" "}
                        <code className="font-mono bg-muted px-1 py-0.5 rounded text-foreground text-xs">app/globals.css</code>{" "}
                        o{" "}
                        <code className="font-mono bg-muted px-1 py-0.5 rounded text-foreground text-xs">components/ui/</code>.
                    </p>
                    <p className="text-[11px]">Soto del Prior · Design system</p>
                </CardContent>
            </Card>
        </div>
    );
}

/* ============================================================
   Layout helpers
   ============================================================ */

function Section({
    id,
    title,
    description,
    children,
}: {
    id: string;
    title: string;
    description?: string;
    children: React.ReactNode;
}) {
    return (
        <section id={id} className="space-y-4 scroll-mt-24">
            <header className="space-y-1 pb-2 border-b border-border/60">
                <p className="text-eyebrow">{title}</p>
                <h2 className="font-display text-2xl font-medium tracking-tight">{title}</h2>
                {description && <p className="text-sm text-muted-foreground max-w-3xl">{description}</p>}
            </header>
            <div className="space-y-4">{children}</div>
        </section>
    );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="space-y-3">
            <p className="text-eyebrow">{title}</p>
            <Card>
                <CardContent>{children}</CardContent>
            </Card>
        </div>
    );
}

function Swatches({ items }: { items: { name: string; cls: string }[] }) {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {items.map(item => (
                <div key={item.name} className="space-y-1.5">
                    <div className={`${item.cls} h-14 rounded-md border border-border/40`} />
                    <code className="text-[11px] font-mono text-muted-foreground block">{item.name}</code>
                </div>
            ))}
        </div>
    );
}
