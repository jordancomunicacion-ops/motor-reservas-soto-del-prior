# Tema visual del widget — Montagu Original

Valores a pegar en **Admin → Restaurantes → Montagu → Configuración → "Diseño del Widget"**.

Restaurante ID en producción: `dc48599b-85d3-40e0-9732-c3c3a241c606`
(En local el ID es distinto: `edee3086-71d8-43d4-938d-f6baf643ace4`.)

Branding base extraído de https://montaguoriginals.com (variables `:root` del bundle CSS):

- `--primary-gold: #D4AF37`
- `--accent-green: #004D33`
- `--bg-color: #021a11`
- `--font-header: "Outfit", sans-serif`
- `--font-body: "Inter", sans-serif`
- `--font-serif: "Playfair Display", serif`
- Botones (`.book-btn`): transparente con borde dorado, hover invierte a dorado sólido sobre texto negro.

## Color de Acento

```
#D4AF37
```

## CSS Personalizado

```css
/* === MONTAGU ORIGINAL — tema visual del widget === */
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;700;900&family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@700;900&display=swap');

[style*="Lato"]   { font-family: 'Inter', sans-serif !important; }
[style*="Oswald"] { font-family: 'Outfit', sans-serif !important; font-style: normal !important; letter-spacing: 0.08em; font-weight: 700 !important; }

h2[style*="Oswald"],
h3[style*="Oswald"],
.text-lg[style*="Oswald"],
.text-2xl[style*="Oswald"],
.text-3xl[style*="Oswald"] {
    font-family: 'Playfair Display', serif !important;
    letter-spacing: 0 !important;
    font-weight: 700 !important;
    text-transform: none !important;
}
h3.uppercase[style*="Oswald"] { text-transform: uppercase !important; font-family: 'Outfit', sans-serif !important; letter-spacing: 0.08em; }

.text-xl[style*="Oswald"] {
    font-family: 'Outfit', sans-serif !important;
    letter-spacing: 0.04em;
    font-weight: 900 !important;
    font-style: normal !important;
}

.text-\[\#0A0A0A\] { color: #021a11 !important; }

h2.text-sm.uppercase.text-gray-400 {
    color: #004D33 !important;
    font-style: italic !important;
    font-family: 'Playfair Display', serif !important;
    letter-spacing: 0.04em !important;
    text-transform: none !important;
    font-weight: 700 !important;
}

.text-\[\#C59D5F\]                { color: #D4AF37 !important; }
.bg-\[\#C59D5F\]                  { background-color: #D4AF37 !important; }
.border-\[\#C59D5F\]              { border-color: #D4AF37 !important; }
.accent-\[\#C59D5F\]              { accent-color: #D4AF37 !important; }
.hover\:text-\[\#C59D5F\]:hover   { color: #D4AF37 !important; }
.hover\:border-\[\#C59D5F\]:hover { border-color: #D4AF37 !important; }
.focus\:border-\[\#C59D5F\]:focus { border-color: #D4AF37 !important; }

p.text-\[\#C59D5F\],
h4.text-\[\#C59D5F\],
h3 span.text-\[\#C59D5F\] { color: #004D33 !important; }
div.rounded-full.bg-\[\#C59D5F\] { background-color: #D4AF37 !important; box-shadow: 0 0 0 3px rgba(212,175,55,0.25) !important; }

.bg-\[\#0A0A0A\] { background-color: #004D33 !important; }
.rounded-full[style*="rgb(10, 10, 10)"],
.rounded-full[style*="#0A0A0A"],
.rounded-full[style*="#0a0a0a"] {
    background-color: #004D33 !important;
    border-color: #004D33 !important;
}

button[style*="background-color"]:not([style*="transparent"]) {
    background-color: transparent !important;
    color: #D4AF37 !important;
    border: 1px solid #D4AF37 !important;
    border-radius: 0 !important;
    text-shadow: none !important;
    box-shadow: none !important;
    font-weight: 700 !important;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    transition: all 0.5s cubic-bezier(.4,0,.2,1) !important;
}
button[style*="background-color"]:not([style*="transparent"]):hover {
    background-color: #D4AF37 !important;
    color: #000000 !important;
}

button.bg-black {
    background-color: transparent !important;
    color: #D4AF37 !important;
    border: 1px solid #D4AF37 !important;
    border-radius: 0 !important;
    letter-spacing: 0.12em;
}
button.bg-black:hover { background-color: #D4AF37 !important; color: #000000 !important; }

[style*="rgba(197, 157, 95"] { box-shadow: 0 2px 6px rgba(212,175,55,0.45) !important; }
```

## Alternativa por API

```powershell
curl -X POST -H "Content-Type: application/json" `
  -d "@scratch/montagu-widget-payload.json" `
  https://api.reservas.sotodelprior.com/config/dc48599b-85d3-40e0-9732-c3c3a241c606
```
