---
name: Consortium Legal
description: ERP legal interno — herramienta densa y sobria que desaparece dentro de la tarea.
colors:
  primary: "#3C50E0"
  success: "#10B981"
  danger: "#EF4444"
  warning: "#F59E0B"
  info: "#06B6D4"
  favorite: "#FAAD14"
  light-bg: "#EFF4FB"
  light-surface: "#FFFFFF"
  light-ink: "#1C2434"
  light-muted: "#64748B"
  light-faint: "#94A3B8"
  light-border: "#E2E8F0"
  light-divider: "#F1F5F9"
  light-subtle: "#F8FAFC"
  dark-bg: "#161824"
  dark-surface: "#1D1F2B"
  dark-ink: "#ECEDF2"
  dark-muted: "#A0A4B3"
  dark-faint: "#6B7080"
  dark-border: "#2C2F40"
  dark-divider: "#262936"
  dark-subtle: "#232634"
typography:
  display:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: "normal"
  body:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "0.07em"
rounded:
  sm: "6px"
  md: "10px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.light-surface}"
    rounded: "{rounded.sm}"
    padding: "6px 16px"
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.light-surface}"
    rounded: "{rounded.sm}"
    padding: "6px 16px"
  card:
    backgroundColor: "{colors.light-surface}"
    textColor: "{colors.light-ink}"
    rounded: "{rounded.md}"
    padding: "24px"
  input:
    backgroundColor: "{colors.light-surface}"
    textColor: "{colors.light-ink}"
    rounded: "{rounded.sm}"
    padding: "6px 11px"
  table-header:
    backgroundColor: "{colors.light-subtle}"
    textColor: "{colors.light-faint}"
    typography: "{typography.label}"
    padding: "10px 16px"
---

# Design System: Consortium Legal

## 1. Overview

**Creative North Star: "La mesa de trabajo del despacho"**

Una superficie de trabajo, no una vitrina. La app es el escritorio digital donde el personal de Consortium Legal despacha su día: autoriza cheques, registra casos, cierra encargos. El diseño existe para **borrarse dentro de la tarea** — jerarquía nítida, densidad cuando hace falta, y un único acento de marca (índigo) que aparece sólo donde hay una acción o un estado que importa. La actitud es la de Linear o Stripe: rápida, consistente pantalla a pantalla, sin fricción ni decoración.

Este sistema rechaza tres cosas de forma explícita. **El SaaS "hecho con IA"** (gradientes morados, glass, tarjetas clonadas, el hero de número gigante) — nunca. **El admin azul-corporativo de plantilla** — la marca es índigo `#3C50E0`, no el azul por defecto de AntD; si se lee como "otro template azul", falló. Y **el Django admin anterior** — tablas planas grises sin jerarquía ni estados, justo lo que se está sustituyendo.

Conviven modo claro y oscuro como ciudadanos de primera clase; ambos deben cumplir el mismo contraste. El español es el idioma base.

**Key Characteristics:**
- Índigo como única voz de marca; el resto es neutro.
- Densidad con jerarquía tipográfica, nunca ruido.
- Un solo vocabulario de componentes en toda la app (AntD 5).
- Paridad claro/oscuro en color y contraste.
- Movimiento breve y funcional (150–250 ms), nunca coreografía.

## 2. Colors

Paleta neutra fría con un único acento índigo; los colores semánticos (verde/rojo/ámbar/cian) sólo comunican estado, jamás decoran.

### Primary
- **Índigo Consortium** (`#3C50E0`): la voz de marca. Acciones primarias (botón "Guardar"/"Crear"), selección actual en menú y tablas, foco, indicadores de estado activo. Es el mismo valor en claro y oscuro. Reemplaza al azul AntD por defecto (`#1677ff`), que **no** debe aparecer.

### Secondary (semánticos de estado)
- **Éxito** (`#10B981`): confirmaciones, estados "liquidado/entregado/aprobado".
- **Peligro** (`#EF4444`): acciones destructivas y errores. Único color del botón "Cerrar sesión" y de eliminar.
- **Advertencia** (`#F59E0B`): pendientes, alertas suaves.
- **Info** (`#06B6D4`): mensajes informativos neutros.
- **Favorito** (`#FAAD14`): exclusivo de la estrella de favoritos en el menú. No usar como acento general.

### Neutral — modo claro
- **Fondo app** (`#EFF4FB`): lienzo azulado muy tenue detrás de las superficies.
- **Superficie** (`#FFFFFF`): tarjetas, tablas, header.
- **Tinta principal** (`#1C2434`): texto de lectura y títulos.
- **Tinta media** (`#64748B`): texto secundario, etiquetas, ejes de gráfica.
- **Tinta tenue** (`#94A3B8`): sólo cabeceras de tabla en mayúsculas y placeholders decorativos — **nunca** texto de lectura (no pasa 4.5:1).
- **Borde** (`#E2E8F0`) / **Divisor** (`#F1F5F9`) / **Sutil** (`#F8FAFC`): estructura, líneas de tabla, fondos de cabecera.

### Neutral — modo oscuro
- **Fondo app** (`#161824`) / **Superficie** (`#1D1F2B`).
- **Tinta** (`#ECEDF2`) / **media** (`#A0A4B3`) / **tenue** (`#6B7080`).
- **Borde** (`#2C2F40`) / **Divisor** (`#262936`) / **Sutil** (`#232634`).

### Named Rules
**La Regla de Una Sola Voz.** El índigo es el único color de marca. En cualquier pantalla ocupa ≤10% de la superficie y siempre significa "acción primaria" o "estado activo". Si hay dos azules en pantalla (índigo + azul AntD), uno sobra.

**La Regla del Estado, no del Adorno.** Verde/rojo/ámbar/cian sólo aparecen para comunicar un estado. Un badge de color que no informa de un estado real está prohibido.

## 3. Typography

**Display / Body Font:** Plus Jakarta Sans (con `system-ui, sans-serif` de respaldo)
**Label Font:** Plus Jakarta Sans (misma familia, peso 700 + mayúsculas + tracking)

**Character:** Una sola sans humanista-geométrica para todo — títulos, cuerpo, etiquetas, datos. En un ERP no hace falta emparejar fuentes; el contraste lo da el peso y el tamaño, no una segunda familia. **Poppins queda deprecado** como fuente de cuerpo; unificar todo en Plus Jakarta Sans (incluido el token `fontFamily` de AntD, hoy sin definir).

### Hierarchy
- **Display** (700, ~1.5rem/24px, `-0.01em`): título de página / encabezado principal de un módulo.
- **Title** (600, ~1.125rem/18px): títulos de tarjeta y secciones dentro de una página.
- **Body** (400, ~0.875rem/14px, 1.5): texto general, celdas de tabla (13px es aceptable en tablas densas), labels de formulario.
- **Label** (700, ~0.6875rem/11px, `0.07em`, MAYÚSCULAS): cabeceras de tabla y encabezados de grupo del menú lateral. Sólo aquí van las mayúsculas con tracking; no como "eyebrow" decorativo sobre cada sección.

### Named Rules
**La Regla de Una Familia.** Toda la UI usa Plus Jakarta Sans. Ninguna pantalla introduce una segunda fuente para "dar variedad". La jerarquía es peso + tamaño, no familia.

## 4. Elevation

Sistema mayormente plano con sombras suaves y difusas para separar superficie de fondo; la profundidad la lleva sobre todo el color tonal (superficie vs. fondo vs. sutil), no la sombra. Las sombras crecen sólo como respuesta a un estado (hover de tarjeta).

### Shadow Vocabulary
- **Reposo** (`box-shadow: 0 1px 4px rgba(0,0,0,.06), 0 4px 12px rgba(0,0,0,.04)` en claro; opacidades `.4/.3` en oscuro): tarjetas y paneles en reposo.
- **Hover de tarjeta** (`box-shadow: 0 8px 28px rgba(60,80,224,.13)` + `translateY(-3px)`): elevación interactiva sobre elementos accionables, teñida con el índigo de marca.

### Named Rules
**La Regla Plano-por-Defecto.** Las superficies están planas en reposo. La sombra fuerte y el desplazamiento aparecen sólo al hacer hover sobre algo accionable. Si una tarjeta estática lleva sombra pesada, es demasiada.

## 5. Components

Base: **Ant Design 5** con algoritmo claro/oscuro conmutado por `useThemeStore`. AntD es el vocabulario único; Tailwind sólo para utilidades de layout/espaciado.

### Buttons
- **Forma:** esquinas suaves (6px, `rounded.sm`).
- **Primary:** relleno índigo `#3C50E0`, texto blanco, padding `6px 16px`. Única acción principal por vista.
- **Danger:** relleno rojo `#EF4444` — destructivo y "Cerrar sesión".
- **Hover / Focus:** transición 150–250 ms de fondo/borde; foco visible siempre (obligatorio para teclado).
- **Ghost / text:** para acciones secundarias (toggle de menú, íconos de header).

### Cards / Containers
- **Esquina:** 10px (`rounded.md`).
- **Fondo:** superficie (`#FFFFFF` claro / `#1D1F2B` oscuro) sobre fondo app.
- **Sombra:** ver Elevation (reposo suave; hover elevado teñido de índigo).
- **Borde:** 1px del token borde.
- **Padding interno:** 24px (`spacing.lg`).
- **Nunca anidar tarjetas.** Una tarjeta dentro de otra siempre está mal.

### Inputs / Fields
- **Estilo:** borde 1px, fondo superficie, radio 6px.
- **Focus:** desplazamiento de borde a índigo + halo AntD por defecto.
- **Placeholder:** debe cumplir 4.5:1 (no el gris tenue por defecto).

### Tables (patrón central del producto)
- **49 vistas usan la `Table` de AntD** — es EL patrón de datos del sistema. Una sola librería de tabla.
- **Cabecera:** fondo sutil, texto `label` (11px, 700, mayúsculas, tracking `.07em`), color tinta tenue, borde inferior 1px.
- **Filas:** padding `10px 16px`, divisor 1px, hover con fondo sutil.
- **Vacío:** `Empty` con descripción que orienta, no "sin datos" a secas.

### Navigation (sidebar)
- **Sider AntD** fijo, 250px expandido / 80px colapsado; off-canvas bajo 992px con overlay.
- **Selección:** `selectedKeys` por ruta con acento índigo. Grupos de menú con encabezado `label` en mayúsculas.
- **Favoritos:** grupo superior con estrella ámbar `#FAAD14`; la estrella debe ser `<button>` accesible por teclado.
- **Buscador de módulos** en la cabecera del sider (con ~20 módulos, es esencial).

### Signature: paleta de gráficas (Nivo)
Ejes/leyendas en tinta media, grid en divisor, tooltip sobre superficie con sombra de reposo, todo en Plus Jakarta Sans. Nivo es la librería de gráficas única.

## 6. Do's and Don'ts

### Do:
- **Do** usar índigo `#3C50E0` como el único color de marca, en ≤10% de cada pantalla, sólo para acción primaria o estado activo.
- **Do** alimentar el token `colorPrimary` de AntD **y** los tokens de `theme.ts` desde el mismo valor índigo, para que botones AntD y tarjetas custom compartan acento.
- **Do** usar una sola fuente (Plus Jakarta Sans) en toda la UI, incluido el token `fontFamily` de AntD.
- **Do** dar a cada vista sus cuatro estados: skeleton de carga, vacío que enseña, error recuperable, foco de teclado.
- **Do** usar la `Table` de AntD y las gráficas de Nivo como patrones únicos de datos.
- **Do** decidir visibilidad y acciones por módulo/permiso, no por nombre de usuario.

### Don't:
- **Don't** dejar convivir el azul AntD por defecto (`#1677ff`) con el índigo de marca. Un solo azul.
- **Don't** emparejar dos fuentes sans parecidas (Poppins + Plus Jakarta). Deprecar Poppins.
- **Don't** caer en el molde SaaS-IA: gradientes morados, glassmorphism decorativo, tarjetas idénticas en grid, hero de "número gigante + label".
- **Don't** parecer un admin azul-corporativo de plantilla ni el Django admin anterior (tablas grises planas sin jerarquía ni estados).
- **Don't** usar `border-left`/`border-right` >1px de color como acento en tarjetas, alertas o filas. Prohibido.
- **Don't** usar texto con gradiente (`background-clip: text`). Énfasis por peso o tamaño.
- **Don't** usar la tinta tenue (`#94A3B8` / `#6B7080`) para texto de lectura — no pasa 4.5:1.
- **Don't** anidar tarjetas ni poner sombra pesada en superficies en reposo.
- **Don't** poner mayúsculas con tracking como "eyebrow" decorativo sobre cada sección; reservarlas para cabeceras de tabla y grupos de menú.
