# API - Modulo de Notificaciones y Documentos

> **Base URL:** `http://localhost:3000`
> **Swagger UI:** `http://localhost:3000/api`
> **Autenticacion:** Bearer Token (JWT)

---

## Autenticacion

Todos los endpoints marcados con "Auth: Si" requieren el header:

```
Authorization: Bearer <token>
```

Para obtener el token:

```
POST /auth/login
Content-Type: application/json

{
  "username": "ESC002",
  "password": "123"
}
```

**Respuesta:**
```json
{
  "access_token": "eyJhbGci...",
  "user": {
    "id": 1,
    "username": "ESC002",
    "first_name": "JASON",
    "last_name": "ESCOBAR GOMEZ",
    "email": "jason_javier@live.com",
    "is_superuser": true,
    "permissions": {
      "canAssignMensajero": true,
      "isMensajero": false,
      "isAdmin": true
    }
  }
}
```

---

## Conceptos Importantes

### Estados de Notificaciones
| Estado | Valor | Descripcion |
|--------|-------|-------------|
| Recibido/Pendiente | `1` | Acaba de ser creada, aun no se entrega |
| Entregado | `2` | Ya fue entregada al destinatario |
| Finalizado | `3` | El destinatario confirmo que la recibio |
| Eliminada | `4` | Fue eliminada/descartada |

### Estados de Documentos
| Estado | Valor | Descripcion |
|--------|-------|-------------|
| Recibido/Pendiente | `1` | Acaba de ser creado, aun no se entrega |
| Entregado | `2` | Ya fue entregado al destinatario |
| Eliminado | `3` | Fue eliminado |
| Finalizado | `4` | El destinatario confirmo que lo recibio |
| Rechazado | `5` | El destinatario rechazo la entrega |

### Flujo de trabajo (Workflow)

```
NOTIFICACIONES:
  Crear (state=1) --> Entregar (state=2) --> Aceptar (state=3)
                                         --> Rechazar (returned=true)
                                         --> Seleccionar algunos

DOCUMENTOS:
  Crear (state=1) --> Entregar (state=2) --> Aceptar (state=4)
                                         --> Rechazar (state=5, returned=true)
                                         --> Seleccionar algunos
```

### Permisos
- **Superusuario** o usuario con permiso `notifications_view_all` / `documents_view_all`: Ve TODAS las notificaciones/documentos.
- **Usuario normal**: Solo ve las notificaciones/documentos donde el es el destinatario (`deliverTo`).

### Base64 Encoding
Algunos endpoints de acciones usan IDs codificados en Base64. Asi se codifica en JavaScript:

```javascript
// Codificar
const ids = [100, 101, 102];
const encoded = btoa(JSON.stringify(ids));  // "WzEwMCwxMDEsMTAyXQ=="

// Decodificar
const decoded = JSON.parse(atob(encoded));  // [100, 101, 102]
```

---

# PARTE 1: CATALOGOS (Endpoints publicos, no requieren auth)

Estos endpoints proveen datos para los selectores/dropdowns en los formularios.

---

## 1.1 Listar Lugares (Places)

```
GET /notifications/places
Auth: No
```

**Respuesta:**
```json
[
  { "id": 1, "name": "Las Margaritas" },
  { "id": 2, "name": "DIAGO 6" }
]
```

**Uso:** Dropdown de "Lugar de creacion" al crear una notificacion o documento.

---

## 1.2 Listar Procedencias (Proveniences)

```
GET /notifications/proveniences
Auth: No
```

**Respuesta:**
```json
[
  {
    "id": 1,
    "name": "Camara Civil CSJ",
    "halls": [
      { "id": 46, "name": "1a. Del Ramo Civil" },
      { "id": 47, "name": "2a. Del Ramo Civil" }
    ]
  },
  {
    "id": 2,
    "name": "Camara Penal CSJ",
    "halls": [
      { "id": 1, "name": "Primera" },
      { "id": 2, "name": "Segunda" }
    ]
  }
]
```

**Uso:** Dropdown de "Procedencia". Cuando el usuario selecciona una procedencia, se cargan sus `halls` (salas) asociadas.

---

## 1.3 Listar Salas (Halls)

```
GET /notifications/halls
GET /notifications/halls?provenienceId=2
Auth: No
```

| Query Param | Tipo | Requerido | Descripcion |
|-------------|------|-----------|-------------|
| `provenienceId` | number | No | Filtra salas por procedencia |

**Respuesta:**
```json
[
  { "id": 46, "name": "1a. Del Ramo Civil" },
  { "id": 47, "name": "2a. Del Ramo Civil" }
]
```

**Uso:** Dropdown de "Sala", se carga al seleccionar una procedencia.

---

## 1.4 Crear Procedencia

```
POST /notifications/proveniences
Auth: Si
Content-Type: application/json
```

**Body:**
```json
{
  "name": "Juzgado de Familia",
  "hallName": "Sala Primera"
}
```

O con IDs de salas existentes:
```json
{
  "name": "Juzgado de Familia",
  "halls": [46, 47]
}
```

**Respuesta:**
```json
{
  "id": 69,
  "name": "Juzgado de Familia",
  "halls": [
    { "id": 46, "name": "1a. Del Ramo Civil" }
  ]
}
```

---

## 1.5 Crear Sala

```
POST /notifications/halls
Auth: No
Content-Type: application/json
```

**Body:**
```json
{
  "provenienceId": 1,
  "name": "5a. Del Ramo Civil"
}
```

**Respuesta:**
```json
{ "id": 89, "name": "5a. Del Ramo Civil" }
```

---

# PARTE 2: NOTIFICACIONES

---

## 2.1 Crear Notificacion

```
POST /notifications
Auth: Si
Content-Type: application/json
```

**Body:**
```json
{
  "creator": 1,
  "provenience": 1,
  "creationPlace": 1,
  "hall": 46,
  "cedule": "12345-2024",
  "expedientNum": "01234-2024-00100",
  "directedTo": "Lic. Juan Perez",
  "recepReceives": 1
}
```

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| `creator` | number | Si | ID del usuario que crea |
| `provenience` | number | No | ID de la procedencia (dropdown) |
| `creationPlace` | number | Si | ID del lugar de creacion (dropdown) |
| `otherProvenience` | string | No | Texto libre si no hay procedencia en catalogo |
| `hall` | number | No | ID de la sala (dropdown, depende de provenience) |
| `cedule` | string | Si | Numero de cedula |
| `expedientNum` | string | Si | Numero de expediente |
| `directedTo` | string | Si | A quien va dirigida |
| `recepReceives` | number | Si | ID del usuario que recibe en recepcion |
| `deliveryDatetime` | string (ISO8601) | No | Fecha/hora de entrega (si ya se conoce) |
| `recepDelivery` | number | No | ID del usuario que entrega |
| `deliverTo` | number | No | ID del usuario destinatario final |
| `receptionDatetime` | string (ISO8601) | No | Fecha de recepcion (default: ahora) |
| `deleteReason` | string | No | Razon de eliminacion |

**Respuesta (201):**
```json
{
  "id": 9177,
  "state": 1,
  "receptionDatetime": "2026-02-11T16:40:00.000Z",
  "cedule": "12345-2024",
  "expedientNum": "01234-2024-00100",
  "directedTo": "Lic. Juan Perez",
  "otherProvenience": null,
  "send": false,
  "reminderSended": false,
  "deleteReason": null,
  "returned": false,
  "selectedAction": false,
  "deliveryDatetime": null,
  "provenience": { "id": 1, "name": "Camara Civil CSJ" },
  "creationPlace": { "id": 1, "name": "Las Margaritas" },
  "hall": { "id": 46, "name": "1a. Del Ramo Civil" },
  "recepReceives": { "id": 1, "first_name": "JASON", "last_name": "ESCOBAR" },
  "creator": { "id": 1 },
  "recepDelivery": null,
  "deliverTo": null
}
```

> **Nota:** `provenience` y `otherProvenience` son mutuamente excluyentes. Si la procedencia esta en el catalogo, usa `provenience` (ID). Si no, usa `otherProvenience` (texto libre).

---

## 2.2 Listar Notificaciones Pendientes

```
GET /notifications/pending
Auth: Si
```

Retorna todas las notificaciones con `state=1` (pendientes de entrega).

**Respuesta:**
```json
[
  {
    "id": 9176,
    "state": 1,
    "receptionDatetime": "2026-02-11T10:00:00.000Z",
    "cedule": "3123123",
    "expedientNum": "EXP-001",
    "directedTo": "Maria Garcia",
    "provenience": { "id": 1, "name": "Camara Civil CSJ" },
    "hall": { "id": 46, "name": "1a. Del Ramo Civil" },
    "recepReceives": { "id": 1, "first_name": "JASON", "last_name": "ESCOBAR" }
  }
]
```

**Uso:** Vista principal de "Pendientes" donde recepcion ve todo lo que falta entregar.

---

## 2.3 Listar Notificaciones Entregadas

```
GET /notifications/delivered
GET /notifications/delivered?sameMonth=true
Auth: Si
```

| Query Param | Tipo | Requerido | Descripcion |
|-------------|------|-----------|-------------|
| `sameMonth` | string | No | `"true"` = solo del mes actual |

Retorna notificaciones con `state IN [2, 3]` (entregadas y finalizadas).

- **Superusuario/admin:** Ve TODAS
- **Usuario normal:** Solo ve las que le entregaron a el (`deliverTo = userId`)

**Respuesta:**
```json
[
  {
    "id": 9170,
    "state": 2,
    "receptionDatetime": "2026-02-10T08:00:00.000Z",
    "deliveryDatetime": "2026-02-11T14:30:00.000Z",
    "cedule": "55555",
    "expedientNum": "EXP-099",
    "directedTo": "Carlos Lopez",
    "returned": false,
    "provenience": { "id": 5, "name": "Juzgado 1o Civil" },
    "hall": null,
    "recepReceives": { "id": 1, "first_name": "JASON" },
    "recepDelivery": { "id": 1, "first_name": "JASON" },
    "deliverTo": { "id": 3, "first_name": "CARLOS", "last_name": "LOPEZ" }
  }
]
```

**Uso:** Vista de "Entregadas" con historial.

---

## 2.4 Obtener Una Notificacion

```
GET /notifications/:id
Auth: Si
```

**Ejemplo:** `GET /notifications/9177`

**Respuesta:** Objeto completo de la notificacion con todas sus relaciones.

---

## 2.5 Actualizar Notificacion

```
PATCH /notifications/:id
Auth: Si
Content-Type: application/json
```

Solo enviar los campos que se desean actualizar:

**Body ejemplo 1 - Editar campos:**
```json
{
  "directedTo": "Lic. Maria Lopez",
  "cedule": "NUEVA-CEDULA-001"
}
```

**Body ejemplo 2 - Limpiar procedencia (cambiar a otra procedencia):**
```json
{
  "removeProvenience": true
}
```
> Esto pone `provenience=null` y `hall=null`.

**Body ejemplo 3 - Eliminar notificacion (state=4):**
```json
{
  "state": 4,
  "deleteReason": "Notificacion duplicada"
}
```

**Respuesta:** Notificacion actualizada.

---

## 2.6 Entregar Notificaciones

```
PATCH /notifications/deliver/1
Auth: Si
Content-Type: application/json
```

Este es el paso clave: pasar una notificacion de "pendiente" (state=1) a "entregada" (state=2).

**Body:**
```json
{
  "notificationIds": [9177, 9178],
  "deliverTo": 3
}
```

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| `notificationIds` | number[] | Si | IDs de notificaciones a entregar |
| `deliverTo` | number | Si | ID del usuario destinatario |

**Respuesta:**
```json
{ "ok": true }
```

**Que sucede internamente:**
1. Pone `state=2`, `deliveryDatetime=ahora`, `deliverTo=usuario`, `recepDelivery=usuario_logueado`
2. Envia un **correo electronico** al destinatario con una tabla de las notificaciones y links para:
   - "Recibi todos" (aceptar)
   - "Rechazar entrega"
   - "Recibi algunos" (seleccion parcial, solo si hay mas de 1)

---

## 2.7 Re-entregar Notificaciones

```
PATCH /notifications/deliver/2
Auth: Si
Content-Type: application/json
```

Cuando se necesita cambiar el destinatario de una notificacion ya entregada.

**Body:**
```json
{
  "notificationIds": [9177],
  "deliverTo": 5
}
```

**Respuesta:**
```json
{ "ok": true }
```

> **Importante:** Solo cambia `deliverTo`. NO cambia el estado ni la fecha de entrega.

---

## 2.8 Acciones sobre Notificaciones (Aceptar/Rechazar)

Estos endpoints se usan cuando el destinatario confirma o rechaza las notificaciones.

### Aceptar todas (action=1)

```
PATCH /notifications/actions?action=1&notifications=WzkxNzdd
Auth: Si
```

| Query Param | Tipo | Descripcion |
|-------------|------|-------------|
| `action` | number | `1`=aceptar, `2`=rechazar, `3`=seleccion |
| `notifications` | string | IDs en Base64: `btoa(JSON.stringify([9177]))` |

**Respuesta:**
```json
{ "status": "aceptadas" }
```
> Cambia `state=3` (finalizado).

### Rechazar todas (action=2)

```
PATCH /notifications/actions?action=2&notifications=WzkxNzhd
Auth: Si
```

**Respuesta:**
```json
{ "status": "rechazadas" }
```
> Pone `returned=true`. Envia correo de rechazo a recepcion.

### Solicitar seleccion (action=3)

```
PATCH /notifications/actions?action=3&notifications=WzkxNzcsOTE3OF0=
Auth: Si
```

**Respuesta:**
```json
{ "status": "seleccion requerida" }
```
> No cambia nada. Indica al frontend que muestre la UI de seleccion parcial.

---

## 2.9 Seleccion Parcial (Aceptar unos, Rechazar otros)

```
PATCH /notifications/actions/selected?notificationsAccepted=WzkxNzdd&notificationsRejected=WzkxNzhd
Auth: Si
```

| Query Param | Tipo | Descripcion |
|-------------|------|-------------|
| `notificationsAccepted` | string | IDs aceptados en Base64 |
| `notificationsRejected` | string | IDs rechazados en Base64 |

**Respuesta:**
```json
{ "accepted": 1, "rejected": 1 }
```

---

## 2.10 Confirmacion via Email (endpoint publico)

```
GET /notifications/actions/confirm?action=1&notifications=WzkxNzdd
Auth: No (publico, accedido desde el link del correo)
```

Este endpoint es llamado cuando el usuario hace clic en los links del correo electronico. Retorna una pagina HTML de confirmacion.

**No lo consume el frontend directamente** - es para los links de email.

---

## 2.11 Filtrar Notificaciones

```
GET /notifications/filter?cedule=12345&receptionDate=2026-02-11
Auth: Si
```

| Query Param | Tipo | Descripcion |
|-------------|------|-------------|
| `receptionDate` | string (YYYY-MM-DD) | Fecha de recepcion |
| `deliveryDate` | string (YYYY-MM-DD) | Fecha de entrega |
| `provenience` | number | ID de procedencia |
| `hall` | number | ID de sala |
| `recepDelivery` | number | ID de quien entrego |
| `deliverTo` | number | ID de destinatario |
| `recepReceives` | number | ID de quien recibio en recepcion |
| `directedTo` | string | Texto (busca parcial, case-insensitive) |
| `expedientNum` | string | Texto (busca parcial) |
| `cedule` | string | Texto (busca parcial) |

> Si se envian AMBAS fechas (`receptionDate` + `deliveryDate`), se tratan como un **rango** sobre la fecha de recepcion.

**Respuesta:** Array de notificaciones filtradas (misma estructura que delivered).

---

## 2.12 Exportar a Excel

```
GET /notifications/export/excel?fecha=2026-02-11
Auth: Si
```

| Query Param | Tipo | Descripcion |
|-------------|------|-------------|
| `fecha` | string (YYYY-MM-DD) | Fecha de entrega (default: hoy) |

**Respuesta:** Archivo `.xlsx` para descarga directa.

**En el frontend:**
```javascript
const response = await fetch('/notifications/export/excel?fecha=2026-02-11', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const blob = await response.blob();
const url = window.URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'notificaciones_2026-02-11.xlsx';
a.click();
```

---

## 2.13 Recordatorio Diario (trigger manual)

```
GET /notifications/reminder/daily
Auth: No
```

**Respuesta:**
```json
{ "sent": 5 }
```

> Envia correo con las notificaciones del dia. Se ejecuta automaticamente a las 18:00 (cron). Este endpoint es para dispararlo manualmente.

---

## 2.14 Recordatorio por Fecha

```
GET /notifications/reminder/by-date?date=2026-02-10&test=true
Auth: No
```

| Query Param | Tipo | Descripcion |
|-------------|------|-------------|
| `date` | string (YYYY-MM-DD) | Fecha especifica |
| `days_ago` | number | Dias atras desde hoy (alternativa a `date`) |
| `test` | string | `"true"` = enviar solo a email de prueba |
| `force` | string | `"true"` = enviar aunque no haya notificaciones |

**Respuesta:**
```json
{ "sent": 3 }
```

---

# PARTE 3: DOCUMENTOS

---

## 3.1 Crear Documento

```
POST /documents
Auth: Si
Content-Type: application/json
```

**Body:**
```json
{
  "documentDeliverBy": "1",
  "amount": 3,
  "creationPlace": 1,
  "receivedBy": 1,
  "documentType": "Oficio",
  "submitTo": "Gerencia Legal",
  "deliverTo": "1"
}
```

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| `documentDeliverBy` | string | Si | Quien entrega el doc. Si es un ID de usuario: `"1"`. Si es externo: `"Juan Perez"` |
| `amount` | number | Si | Cantidad de documentos |
| `creationPlace` | number | Si | ID del lugar (dropdown de Places) |
| `receivedBy` | number | Si | ID del usuario que recibe en recepcion |
| `documentType` | string | Si | Tipo de documento (ej: "Oficio", "Carta", "Sobre") |
| `submitTo` | string | Si | Para quien es / a donde se entrega |
| `deliverTo` | string | Si | Destinatario final. Si es usuario: `"1"` (ID). Si es externo: `"Mensajeria"` |
| `deliverBy` | number | No | ID del usuario que hizo la entrega |
| `observations` | string | No | Observaciones |
| `deliverDatetime` | string (ISO8601) | No | Fecha/hora de entrega |

> **Nota importante:** `documentDeliverBy` y `deliverTo` son **strings**, no numeros. Si el valor es un numero (ej: `"1"`), el sistema lo interpreta como un ID de usuario interno. Si es texto (ej: `"Mensajeria externa"`), lo interpreta como un nombre externo.

**Respuesta (201):**
```json
{
  "id": 15515,
  "state": 1,
  "receptionDatetime": "2026-02-11T16:40:00.000Z",
  "documentDeliverBy": "1",
  "amount": 3,
  "documentType": "Oficio",
  "submitTo": "Gerencia Legal",
  "deliverTo": "1",
  "deliverDatetime": null,
  "observations": null,
  "reminder": false,
  "deleteReason": null,
  "returned": false,
  "selectedAction": false,
  "creationPlace": { "id": 1, "name": "Las Margaritas" },
  "receivedBy": { "id": 1, "first_name": "JASON", "last_name": "ESCOBAR" },
  "deliverBy": null
}
```

---

## 3.2 Listar Documentos Pendientes

```
GET /documents/pending
Auth: Si
```

Retorna documentos con `state=1`.

**Respuesta:**
```json
[
  {
    "id": 15514,
    "state": 1,
    "documentDeliverBy": "2",
    "amount": 1,
    "documentType": "Sobre",
    "submitTo": "Contabilidad",
    "deliverTo": "3",
    "receivedBy": { "id": 1, "first_name": "JASON" },
    "deliverBy": null
  }
]
```

---

## 3.3 Listar Documentos Entregados

```
GET /documents/delivered
Auth: Si
```

Retorna documentos con `state IN [2, 4, 5]` (entregados, finalizados, rechazados).
- **Admin:** Ve todos
- **Usuario normal:** Solo ve donde `deliverTo` es su ID o nombre

---

## 3.4 Obtener Un Documento

```
GET /documents/:id
Auth: Si
```

**Ejemplo:** `GET /documents/15515`

---

## 3.5 Actualizar Documento

```
PATCH /documents/:id
Auth: Si
Content-Type: application/json
```

**Body (solo campos a cambiar):**
```json
{
  "observations": "Actualizado por solicitud",
  "amount": 5
}
```

**Eliminar documento:**
```json
{
  "state": 3,
  "deleteReason": "Documento duplicado"
}
```

---

## 3.6 Entregar Documentos

```
PATCH /documents/deliver/1
Auth: Si
Content-Type: application/json
```

**Body:**
```json
{
  "documentsSelected": [15515, 15516],
  "deliver_to": "3",
  "observations": "Entregado en mano"
}
```

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| `documentsSelected` | number[] | Si | IDs de documentos a entregar |
| `deliver_to` | string | Si | ID de usuario (`"3"`) o nombre externo (`"Mensajeria"`) |
| `observations` | string | No | Observaciones de la entrega |

**Respuesta:**
```json
{ "ok": true, "ids": [15515, 15516] }
```

**Que sucede internamente:**
1. Pone `state=2`, `deliverDatetime=ahora`, `deliverTo`, `deliverBy=usuario_logueado`
2. Envia correo con tabla de documentos y links de accion

---

## 3.7 Re-entregar Documentos

```
PATCH /documents/deliver/2
Auth: Si
Content-Type: application/json
```

**Body:**
```json
{
  "documentsSelected": [15515],
  "deliver_to": "5"
}
```

> Cambia `deliverTo` y `state=2`.

---

## 3.8 Acciones sobre Documentos

### Aceptar (action=1)

```
PATCH /documents/actions?action=1&documents=WzE1NTE1XQ==
Auth: Si
```

**Respuesta:**
```json
{ "status": "aceptados" }
```
> Cambia `state=4` (finalizado).

### Rechazar (action=2)

```
PATCH /documents/actions?action=2&documents=WzE1NTE2XQ==
Auth: Si
```

**Respuesta:**
```json
{ "status": "rechazados" }
```
> Cambia `state=5`, `returned=true`. Envia correo de rechazo.

### Seleccion requerida (action=3)

```
PATCH /documents/actions?action=3&documents=WzE1NTE1LDE1NTE2XQ==
Auth: Si
```

**Respuesta:**
```json
{ "status": "seleccion requerida" }
```

---

## 3.9 Seleccion Parcial de Documentos

```
PATCH /documents/actions/selected?documentsAccepted=WzE1NTE1XQ==&documentsRejected=WzE1NTE2XQ==
Auth: Si
```

**Respuesta:**
```json
{ "accepted": 1, "rejected": 1 }
```

---

## 3.10 Filtrar Documentos

```
GET /documents/filter?documentType=Oficio&receptionDate=2026-02-11
Auth: Si
```

| Query Param | Tipo | Descripcion |
|-------------|------|-------------|
| `receptionDate` | string (YYYY-MM-DD) | Fecha de recepcion |
| `deliveryDate` | string (YYYY-MM-DD) | Fecha de entrega |
| `documentDeliverBy` | string | Quien entrego (ID o texto) |
| `receivedBy` | number | ID de quien recibio |
| `documentType` | string | Tipo de documento |
| `submitTo` | string | Para quien es |
| `deliverTo` | string | Destinatario (ID o texto) |
| `deliverBy` | number | ID de quien hizo la entrega |

> Si se envian AMBAS fechas, se tratan como **rango** sobre fecha de recepcion.

---

## 3.11 Valores para Filtros (Meta)

```
GET /documents/meta/filter-values
Auth: Si
```

Retorna los valores unicos disponibles para los dropdowns de filtros.

**Respuesta:**
```json
{
  "documentTypes": ["Oficio", "Carta", "Sobre"],
  "documentDelivers": ["1", "Juan Perez"],
  "receivedBy": [1, 3, 5],
  "deliverBy": [1, 2],
  "deliverTo": ["1", "3", "Mensajeria"],
  "submitTo": ["Gerencia", "Contabilidad", "Legal"]
}
```

**Uso:** Llenar los dropdowns/autocomplete de la pantalla de filtros.

---

## 3.12 Recordatorio Diario de Documentos

```
GET /documents/reminder/daily
Auth: Si
```

**Respuesta:**
```json
{ "sent": 6, "recipients": 6 }
```

---

# PARTE 4: RESUMEN DE ERRORES COMUNES

| HTTP Code | Significado | Ejemplo |
|-----------|-------------|---------|
| `400` | Bad Request - datos invalidos | Falta un campo requerido |
| `401` | No autorizado - token invalido/expirado | Hacer login de nuevo |
| `404` | No encontrado | ID de notificacion/documento no existe |
| `409` | Conflicto de estado | Intentar aceptar una notificacion ya finalizada |

**Ejemplo de error:**
```json
{
  "statusCode": 409,
  "message": "Ya finalizadas",
  "error": "Conflict"
}
```

---

# PARTE 5: EJEMPLO COMPLETO DE FLUJO

## Flujo de una notificacion (paso a paso)

### Paso 1: Cargar catalogos para el formulario
```javascript
const places = await fetch('/notifications/places').then(r => r.json());
const proveniences = await fetch('/notifications/proveniences').then(r => r.json());
```

### Paso 2: Usuario selecciona procedencia -> cargar salas
```javascript
const halls = await fetch(`/notifications/halls?provenienceId=${selectedProvId}`).then(r => r.json());
```

### Paso 3: Crear la notificacion
```javascript
const notif = await fetch('/notifications', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    creator: currentUser.id,
    provenience: 1,
    creationPlace: 1,
    hall: 46,
    cedule: "12345-2024",
    expedientNum: "01234-2024-00100",
    directedTo: "Lic. Juan Perez",
    recepReceives: currentUser.id
  })
}).then(r => r.json());
// notif.id = 9177, notif.state = 1
```

### Paso 4: Entregar la notificacion
```javascript
await fetch('/notifications/deliver/1', {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    notificationIds: [9177],
    deliverTo: 3  // ID del abogado destinatario
  })
}).then(r => r.json());
// El destinatario recibe un correo
```

### Paso 5: El destinatario acepta (desde la app)
```javascript
const ids = [9177];
const encoded = btoa(JSON.stringify(ids));

await fetch(`/notifications/actions?action=1&notifications=${encoded}`, {
  method: 'PATCH',
  headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json());
// { status: "aceptadas" } -> state = 3 (finalizado)
```

### Paso 6: Consultar historial con filtros
```javascript
const filtered = await fetch('/notifications/filter?receptionDate=2026-02-11&provenience=1', {
  headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json());
```

### Paso 7: Exportar a Excel
```javascript
const response = await fetch('/notifications/export/excel?fecha=2026-02-11', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const blob = await response.blob();
// Descargar el archivo...
```

---

## Flujo de un documento (paso a paso)

### Paso 1: Crear el documento
```javascript
const doc = await fetch('/documents', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    documentDeliverBy: "1",       // ID de usuario interno
    amount: 2,
    creationPlace: 1,
    receivedBy: 1,
    documentType: "Oficio",
    submitTo: "Gerencia Legal",
    deliverTo: "3"                // ID del destinatario
  })
}).then(r => r.json());
```

### Paso 2: Entregar
```javascript
await fetch('/documents/deliver/1', {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    documentsSelected: [doc.id],
    deliver_to: "3",
    observations: "Entregado en oficina"
  })
}).then(r => r.json());
```

### Paso 3: El destinatario acepta o rechaza
```javascript
const encoded = btoa(JSON.stringify([doc.id]));

// Aceptar
await fetch(`/documents/actions?action=1&documents=${encoded}`, {
  method: 'PATCH',
  headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json());
// state -> 4 (finalizado)

// O rechazar
await fetch(`/documents/actions?action=2&documents=${encoded}`, {
  method: 'PATCH',
  headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json());
// state -> 5, returned -> true
```

---

> **Swagger UI disponible en:** `http://localhost:3000/api` para probar todos los endpoints interactivamente.
