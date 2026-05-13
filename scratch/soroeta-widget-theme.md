# Tema visual del widget — Soroeta

Valores a pegar en **Admin → Restaurantes → Soroeta → Configuración → "Diseño del Widget"**.

Restaurante ID: `01d97d9b-6ec3-4ac2-98cc-7d42872d2fc2`

## Color de Acento

```
#004c97
```

## CSS Personalizado

```css
/* === SOROETA — tema visual del widget === */
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;900&family=Inter:wght@300;400;500;600;700&display=swap');

[style*="Lato"]   { font-family: 'Inter', sans-serif !important; }
[style*="Oswald"] { font-family: 'Inter', sans-serif !important; font-style: normal !important; letter-spacing: 0.06em; }

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
h3.uppercase[style*="Oswald"] { text-transform: uppercase !important; }

.text-xl[style*="Oswald"] {
    font-family: 'Inter', sans-serif !important;
    letter-spacing: 0.02em;
    font-weight: 800 !important;
    font-style: italic !important;
}

.text-\[\#0A0A0A\] { color: #1a1a1a !important; }

h2.text-sm.uppercase.text-gray-400 {
    color: #006e33 !important;
    font-style: italic !important;
    font-family: 'Playfair Display', serif !important;
    letter-spacing: 0.04em !important;
    text-transform: none !important;
    font-weight: 600 !important;
}

.text-\[\#C59D5F\]                { color: #004c97 !important; }
.bg-\[\#C59D5F\]                  { background-color: #004c97 !important; }
.border-\[\#C59D5F\]              { border-color: #004c97 !important; }
.accent-\[\#C59D5F\]              { accent-color: #004c97 !important; }
.hover\:text-\[\#C59D5F\]:hover   { color: #004c97 !important; }
.hover\:border-\[\#C59D5F\]:hover { border-color: #004c97 !important; }
.focus\:border-\[\#C59D5F\]:focus { border-color: #004c97 !important; }

p.text-\[\#C59D5F\],
h4.text-\[\#C59D5F\],
h3 span.text-\[\#C59D5F\] { color: #006e33 !important; }
div.rounded-full.bg-\[\#C59D5F\] { background-color: #006e33 !important; }

.bg-\[\#0A0A0A\] { background-color: #004c97 !important; }
.rounded-full[style*="rgb(10, 10, 10)"],
.rounded-full[style*="#0A0A0A"],
.rounded-full[style*="#0a0a0a"] {
    background-color: #004c97 !important;
    border-color: #004c97 !important;
}

button[style*="background-color"]:not([style*="transparent"]) {
    background-color: #ffffff !important;
    color: #004c97 !important;
    border: 2px solid #004c97 !important;
    border-radius: 0 !important;
    text-shadow: none !important;
    box-shadow: none !important;
    transition: 0.3s ease !important;
}
button[style*="background-color"]:not([style*="transparent"]):hover {
    background-color: #004c97 !important;
    color: #ffffff !important;
}

button.bg-black {
    background-color: #ffffff !important;
    color: #004c97 !important;
    border: 2px solid #004c97 !important;
    border-radius: 0 !important;
}
button.bg-black:hover { background-color: #004c97 !important; color: #ffffff !important; }

[style*="rgba(197, 157, 95"] { box-shadow: 0 2px 6px rgba(0, 76, 151, 0.35) !important; }
```

## Alternativa: aplicar por API (sin UI)

Si en algún momento prefieres scriptearlo en lugar de pegarlo a mano, hay un payload listo en `scratch/soroeta-widget-payload.json` (créalo a partir de los dos valores de arriba) y se publica con:

```powershell
curl -X POST -H "Content-Type: application/json" `
  -d "@scratch/soroeta-widget-payload.json" `
  https://api.reservas.sotodelprior.com/config/01d97d9b-6ec3-4ac2-98cc-7d42872d2fc2
```

(En local: `http://localhost:4000` en vez de `api.reservas.sotodelprior.com`.)
