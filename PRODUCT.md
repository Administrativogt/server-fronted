# Product

## Register

product

## Users

Personal interno del despacho **Consortium Legal**, con perfiles y niveles de acceso muy distintos que conviven en la misma app:

- **Abogados y coordinadores** — gestionan casos, procuraciones, actas, jurisprudencia, plazos.
- **Contabilidad y finanzas** — cargan, autorizan y liquidan cheques; recibos de caja; requerimientos de dinero; informe de socios.
- **Secretarias / asistentes** — crean clientes, casos, notificaciones, documentos, reservas de salas.
- **Mensajeros** — perfil operativo y móvil; sólo consultan y gestionan sus encargos (no crean envíos).
- **Administradores / superadmins** — gestión de usuarios, permisos y módulos.

Contexto de uso: jornada laboral, en escritorio la mayor parte del tiempo, con picos de trabajo repetitivo sobre tablas y formularios. Los mensajeros la usan en móvil. El acceso a cada módulo está controlado por permisos (`ModuleRoute` / `moduleKey`), así que dos usuarios distintos ven aplicaciones muy diferentes.

## Product Purpose

Sistema de gestión legal interno (ERP) que reúne en una sola SPA los procesos operativos del despacho: cheques y contabilidad, casos judiciales, clientes, mensajería, reservas de salas, recursos humanos, plazos, procuraciones, actas, jurisprudencia, notificaciones, recibos y reportes.

Sustituye a un sistema anterior tipo Django admin. El éxito se mide por **velocidad y confianza en la tarea**: que cada perfil complete su trabajo diario (autorizar un cheque, registrar un caso, cerrar un encargo) con el menor número de clics y sin ambigüedad sobre qué hace cada acción. No es un producto de cara al cliente; es una herramienta que debe desaparecer dentro del flujo de trabajo.

## Brand Personality

**Eficiente, ágil, confiable.** La herramienta se borra dentro de la tarea. Densidad de información cuando el usuario la necesita (tablas, paneles), cero decoración gratuita. Referencia de actitud: Linear / Stripe / Raycast — rapidez, jerarquía clara, consistencia pantalla a pantalla. El tono es profesional y sobrio (es un despacho legal), pero moderno y sin fricción, no acartonado.

## Anti-references

- **SaaS genérico "hecho con IA"**: gradientes morados, glassmorphism decorativo, tarjetas idénticas repetidas en grid, la plantilla "número gigante + label pequeño". Prohibido.
- **Dashboard azul-corporativo de plantilla comprada**: el admin azul-marino sin personalidad, frío e intercambiable. La marca es **índigo**, no el azul por defecto — no debe leerse como "otro admin template más".
- **El sistema anterior tipo Django admin**: tablas planas grises sin jerarquía, formularios crudos, cero estados de carga/vacío. Es exactamente de lo que se está migrando.

## Design Principles

1. **La herramienta desaparece.** Ningún adorno compite con los datos. Cada pantalla tiene una tarea primaria evidente; todo lo demás es secundario y se ve secundario.
2. **Un solo vocabulario, pantalla a pantalla.** Mismo botón, mismo control de formulario, mismo estilo de tabla, mismo acento de marca en toda la app. Si el botón "Guardar" se ve distinto en dos módulos, uno está mal.
3. **Densidad con jerarquía.** Se permite mucha información (tablas largas, paneles con muchos campos) siempre que la jerarquía tipográfica y el espaciado guíen el ojo. Densidad ≠ ruido.
4. **Estados completos, no felices.** Cada vista tiene carga (skeleton), vacío que enseña, error recuperable y foco de teclado. Un módulo sin sus estados está incompleto.
5. **El permiso manda sobre el nombre.** Lo que un usuario ve y puede hacer se decide por módulos/permisos, nunca por casos especiales de nombre de usuario en el front.

## Accessibility & Inclusion

Nivel **sólido y práctico** (AA de facto, sin certificación formal):

- Contraste de texto **≥ 4.5:1** (cuerpo) y **≥ 3:1** (texto grande) en modo claro y oscuro. En particular, no usar el gris `t3` para texto de lectura sobre fondos claros.
- **Navegable por teclado**: todo lo interactivo (incluidos íconos-acción como la estrella de favoritos) es `<button>` real, con foco visible.
- Respetar **`prefers-reduced-motion`**: las animaciones de entrada tienen alternativa de crossfade/instantánea.
- **Tema claro y oscuro** de primera clase (ya existe; mantener paridad de contraste en ambos).
- Español como idioma base (AntD `esES`, dayjs `es`).
