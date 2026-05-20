# Consortium Legal 2025 — Frontend

## Descripción del proyecto

Frontend React (Vite + TypeScript) del sistema de gestión legal de Consortium. Aplicación SPA con autenticación JWT, control de acceso por módulos, y múltiples módulos de negocio.

## Stack tecnológico

- **Framework:** React 19 + TypeScript
- **Build tool:** Vite
- **UI principal:** Ant Design 5 (`antd`)
- **Estilos:** Tailwind CSS
- **Estado global:** Zustand
- **HTTP:** Axios con interceptores JWT automáticos
- **Router:** React Router DOM v6
- **Grids:** AG Grid Community, MUI DataGrid
- **Gráficas:** Nivo, Chart.js, Ant Design Charts
- **Exportación:** ExcelJS, docx, file-saver, xlsx

## Comandos

```bash
npm run dev       # servidor de desarrollo (Vite)
npm run build     # compilar para producción
npm run lint      # ESLint
npm run preview   # previsualizar el build
```

## Variables de entorno

Archivo `.env` en la raíz:

```
VITE_API_URL=/backend        # producción (proxy ngrok/nginx)
# VITE_API_URL=http://localhost:3000   # desarrollo local
```

## Estructura del proyecto

```
src/
├── api/            # Funciones de llamadas HTTP (una por dominio)
├── auth/           # useAuthStore (Zustand) — sesión y JWT
├── hooks/          # useThemeStore, useToken, usePermissions
├── pages/          # Páginas por módulo
│   ├── autorizacion-cheques/
│   ├── cheques/
│   ├── mensajeria/
│   ├── cargability/
│   ├── court-cases/
│   ├── jurisprudence/
│   ├── procuration/
│   ├── reservaciones/
│   ├── appointments/
│   ├── recibos/
│   ├── money_req/
│   ├── documents/
│   ├── notifications/
│   ├── agendador/
│   ├── human-resources/
│   ├── client-creation/
│   ├── contabilidad/
│   ├── reportes/
│   └── admin/
├── routes/         # PrivateRoute, ModuleRoute (guards)
├── services/       # Lógica de negocio separada de la UI
├── types/          # Tipos TypeScript por dominio
└── utils/          # Helpers (auth, etc.)
```

## Autenticación

- Token JWT almacenado en `sessionStorage` (no localStorage).
- `useAuthStore` (Zustand) mantiene token, refreshToken, usuario, módulos y permisos.
- El interceptor Axios (`src/api/axios.ts`) renueva el token automáticamente con `/auth/refresh` si está expirado.
- `PrivateRoute` protege todas las rutas privadas.
- `ModuleRoute` restringe rutas según los módulos habilitados para el usuario (`moduleKey` / `moduleKeys`).

## Módulos disponibles (claves de acceso)

| Clave                  | Módulo                        |
|------------------------|-------------------------------|
| `cheques`              | Gestión y autorización de cheques |
| `autorizacion_cheques` | Carga y lista de cheques       |
| `reservas_salas`       | Reservaciones de salas         |
| `notificaciones`       | Notificaciones                 |
| `recibos_caja`         | Recibos de caja                |
| `solicitudes_dinero`   | Requerimientos de dinero       |
| `encargos`             | Mensajería / Encargos          |
| `cargabilidad`         | Reportes de cargabilidad       |
| `expedientes_judiciales` | Control de casos             |
| `recursos_humanos`     | Recursos humanos               |
| `actas`                | Appointments / Actas           |
| `control_plazos`       | Agendador de plazos            |
| `procuracion`          | Control de procuraciones       |
| `usuarios`             | Administración de usuarios     |
| `clientes`             | Clientes y casos               |

## Convenciones de código

- Cada módulo tiene su carpeta en `src/pages/` y su archivo API en `src/api/`.
- Los tipos TypeScript de cada dominio van en `src/types/<dominio>.types.ts`.
- Los componentes de UI usan Ant Design como librería principal; Tailwind para utilidades de layout y espaciado.
- Tema claro/oscuro controlado por `useThemeStore`; el algoritmo de Ant Design cambia según el modo.
- El idioma de Ant Design está configurado en español (`esES`) y dayjs en `es`.

## Preferencias de trabajo

- Si el usuario dice "sí" o aprueba algo, proceder sin volver a preguntar lo mismo en toda la sesión.
- No pedir confirmación redundante en pasos intermedios; ejecutar y verificar el resultado directamente.
- Después de hacer cambios, verificar que compilen/funcionen (lint, build o revisión de tipos) en lugar de preguntar si está bien.

## Notas importantes

- La app se despliega con un proxy: `/backend` apunta al servidor NestJS.
- Para desarrollo local cambiar `VITE_API_URL` a `http://localhost:3000`.
- El token se guarda en `sessionStorage`, por lo tanto se pierde al cerrar el navegador (comportamiento intencional por seguridad).
