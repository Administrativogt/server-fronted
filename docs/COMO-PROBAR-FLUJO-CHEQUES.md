# Cómo probar el flujo de Gestión de Cheques en el frontend

Esta guía explica cómo levantar backend + frontend y probar el flujo completo del módulo de cheques contra el API NestJS.

---

## 1. Requisitos previos

- **Backend NestJS** en `server-backend` con base de datos configurada y tablas de `manejo_de_cheques_*`.
- **Variables de Sirvo** en `.env` del backend (si quieres sync real): `SIRVO_API_URL`, `SIRVO_API_USER`, `SIRVO_API_KEY`.
- Usuario en la BD con acceso al módulo de cheques (ver sección 4).

---

## 2. Levantar backend y frontend

### Backend (NestJS)

```bash
cd "/Users/aletzbarr11/Consorium Legal 2025/server-backend"
npm install   # si hace falta
npm run start:dev
```

El API quedará en **http://localhost:3000** (o el puerto que tengas en `PORT`).

### Frontend (Vite + React)

```bash
cd "/Users/aletzbarr11/Consorium Legal 2025/server-fronted"
npm install   # si hace falta
npm run dev
```

El frontend quedará en **http://localhost:5173** (o el que indique Vite).

### Configuración del frontend para el API

En **`server-fronted/.env`** debe estar:

```env
VITE_API_URL=http://localhost:3000
```

Así todas las llamadas de `src/api/checks.ts` (y el resto) van al NestJS. Si usas otro puerto en el backend, cámbialo aquí.

---

## 3. Rutas del módulo de cheques

El menú **"Gestión de cheques"** solo se muestra si el usuario tiene el módulo `cheques` o `autorizacion_cheques`. Rutas:

| Ruta | Página | Uso |
|------|--------|-----|
| `/dashboard/cheques/autorizacion` | AutorizacionCheque | Listar pendientes de autorización, sincronizar, solicitar autorización, autorizar/rechazar/parcial |
| `/dashboard/cheques/liquidacion` | LiquidacionCheque | Listar pendientes de liquidación, sincronizar, liquidar (form + documento) |
| `/dashboard/cheques/liquidados` | ChequesLiquidados | Listar cheques ya liquidados, reportes |
| `/dashboard/cheques/inmobiliario` | GastosInmobiliarios | CRUD gastos inmobiliarios y liquidar gasto |
| `/dashboard/cheques/pendientes` | ChequesPendientes | Cheque más antiguo pendiente por responsable |

---

## 4. Usuario con acceso al módulo

El backend asigna módulos por permisos/grupos. Para que un usuario vea el menú y las rutas de cheques debe tener en su respuesta de login los módulos con `key`: **`cheques`** o **`autorizacion_cheques`**.

- Revisa en Nest cómo se arma la lista de módulos (p. ej. `ModuleAccessService` y permisos del usuario).
- Inicia sesión en el front con un usuario que tenga uno de esos módulos.
- Si no ves "Gestión de cheques" en el menú lateral, ese usuario no tiene acceso; usa otro usuario o asígnale el permiso/módulo en backend.

---

## 5. Flujo sugerido para probar

### 5.1 Autorización

1. Ir a **Gestión de cheques → Autorización** (`/dashboard/cheques/autorizacion`).
2. **(Opcional)** Pulsar **Sincronizar** (año opcional). Esto llama a `POST /checks/sync/pending-authorization` y trae datos de Sirvo (si está configurado).
3. Ver la tabla de cheques pendientes de autorización (y opcionalmente autorizados si marcaste “incluir autorizados”).
4. Seleccionar uno o más cheques y pulsar **Solicitar autorización**.
5. En el modal, elegir un **Autorizador** (lista viene de `GET /checks/coordinator-members?check_ids=[...]`) y confirmar. Debe enviarse el correo y quedar marcado como “solicitud enviada”.
6. Para probar **Autorizar / Rechazar / Parcial** sin correo: seleccionar cheques y usar los botones correspondientes. Eso llama a `POST /checks/authorization/manage` con `action` y `all_check_ids` (y `selected_check_ids` en parcial).

### 5.2 Liquidación

1. Ir a **Gestión de cheques → Liquidación** (`/dashboard/cheques/liquidacion`).
2. **(Opcional)** Sincronizar con **Sincronizar** (`POST /checks/sync/pending-liquidation`).
3. Ver la tabla de pendientes de liquidación.
4. En una fila, abrir el modal de **Liquidar**.
5. Completar: **Entidad** (dropdown de `GET /checks/entities`), tipo documento, serie y número de factura, NIT, nombre/dirección, valor total, descripción; opcionalmente adjuntar PDF/imagen.
6. Enviar. Debe llamar a `POST /checks/:checkRequestId/liquidate` (multipart si hay documento) y el cheque pasar a liquidado.

### 5.3 Liquidados

1. Ir a **Gestión de cheques → Liquidados** (`/dashboard/cheques/liquidados`).
2. Ver listado (filtros por fechas, factura, responsable según implementación).
3. Probar descarga de reporte Excel si existe el botón (debería usar `GET /checks/reports/liquidated.xlsx` con query params).

### 5.4 Gastos inmobiliarios

1. Ir a **Gestión de cheques → Gastos inmobiliarios** (`/dashboard/cheques/inmobiliario`).
2. Listar gastos (filtros por request_id, etc.).
3. Crear un gasto asociado a un `request_id` de cheque (si tienes datos).
4. Editar y eliminar (si la UI lo permite).
5. Probar **Liquidar** un gasto (`POST /checks/inmobiliario-expenses/:id/liquidate`).

### 5.5 Cheques pendientes (más antiguo por responsable)

1. Ir a **Gestión de cheques → Cheques pendientes** (`/dashboard/cheques/pendientes`).
2. Debe mostrarse el cheque pendiente de liquidar más antiguo por cada responsable (`GET /checks/older-pending-liquidation`).

---

## 6. Reportes y documentos

- **Reporte pendientes de liquidación:** desde la vista correspondiente (o Liquidación), descarga Excel → `GET /checks/reports/pending-liquidation.xlsx` (opcional `user_id`).
- **Reporte liquidados:** `GET /checks/reports/liquidated.xlsx` con filtros (fechas, responsable, factura, etc.).
- **Reporte gastos inmobiliarios:** `GET /checks/reports/inmobiliario-expenses.xlsx` (opcional `request_id`).
- **Merge PDF de documentos de liquidación:** si la UI permite elegir cheques y “Descargar PDF unido”, debe llamar a `POST /checks/reports/liquidation-documents/merge.pdf` con `{ check_ids: [...] }`.

---

## 7. Errores frecuentes

| Síntoma | Revisar |
|--------|--------|
| No aparece el menú "Gestión de cheques" | Usuario sin módulo `cheques` o `autorizacion_cheques`; revisar respuesta de login y asignación de módulos en backend. |
| 401 en todas las peticiones | Token no enviado o expirado; volver a iniciar sesión. |
| 404 o CORS | `VITE_API_URL` en frontend debe ser la URL base del backend (ej. `http://localhost:3000`). Backend debe permitir origen del front (ej. `http://localhost:5173`). |
| Sync no trae datos | Configuración Sirvo en `.env` del backend; que existan datos en Sirvo para el filtro usado. |
| "Mas de un coordinador seleccionado" | En Autorización, no mezclar en la misma solicitud cheques de distintos códigos de coordinador; elegir solo cheques del mismo coordinador. |

---

## 8. Resumen de APIs usadas por el front

- **Sync:** `POST /checks/sync/pending-authorization`, `POST /checks/sync/pending-liquidation`
- **Listados:** `GET /checks/pending-authorization`, `pending-liquidation`, `liquidated`, `older-pending-liquidation`
- **Autorización:** `POST /checks/authorization/request`, `POST /checks/authorization/manage`, `GET /checks/coordinator-members`
- **Liquidación:** `GET /checks/entities`, `POST /checks/:id/liquidate`, `POST /checks/:id/revert-liquidation`
- **Gastos:** `GET/POST/PATCH/DELETE /checks/inmobiliario-expenses`, `POST .../:id/liquidate`
- **Reportes:** `GET /checks/reports/pending-liquidation.xlsx`, `liquidated.xlsx`, `inmobiliario-expenses.xlsx`, `POST .../liquidation-documents/merge.pdf`

Con backend y frontend en marcha, usuario con módulo de cheques y los pasos anteriores puedes probar el flujo completo de cheques en el frontend.
