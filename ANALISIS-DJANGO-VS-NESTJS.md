# 🔍 Análisis: Django (Antiguo) vs NestJS (Nuevo) - Módulo de Mensajería

**Fecha**: 4 de Febrero, 2026

---

## 📊 **GRÁFICAS ENCONTRADAS EN DJANGO**

### ✅ Implementadas en NestJS

1. **Envíos por Mes** ✅
   - **Django**: `GET /api/month/users/?pk={userId}`
   - **NestJS**: `GET /api/charts/month?pk={userId}`
   - **Estado**: ✅ Implementado

2. **Envíos por Zona** ✅
   - **Django**: `GET /api/zone_list/?pk={userId}`
   - **NestJS**: `GET /api/charts/zone`
   - **Estado**: ✅ Implementado

3. **Estado de Envíos (Correctos/Rechazados/Incidencias)** ✅
   - **Django**: `GET /api/state/user/?pk={userId}`
   - **NestJS**: `GET /api/charts/state?pk={userId}`
   - **Estado**: ✅ Implementado

4. **Por Prioridad** ✅
   - **Django**: `GET /api/priority-user/?pk={userId}`
   - **NestJS**: `GET /api/charts/priority`
   - **Estado**: ✅ Implementado

5. **Envíos del Mensajero por Mes** ✅
   - **Django**: `GET /api/mensajero_list/?pk={mensajeroId}`
   - **NestJS**: `GET /api/charts/mensajero/{mensajeroId}`
   - **Estado**: ✅ Implementado

---

### ❌ **FALTANTES - NO IMPLEMENTADAS**

6. **⚠️ GRÁFICA EN TIEMPO vs FUERA DE TIEMPO** ❌
   - **Django**: `GET /api/mensajero_list_tiempo/?pk={mensajeroId}&start={date}&end={date}`
   - **NestJS**: ❌ **NO EXISTE**
   - **Descripción**: Muestra cuántos envíos fueron entregados a tiempo vs fuera de tiempo
   - **Datos que retorna**:
     ```json
     [
       {
         "mes": "01",
         "onTime": 15,
         "offTime": 3,
         "total_solicitudes": 18
       }
     ]
     ```
   - **Lógica**: 
     - Compara `fecha_realizacion` con `fecha_entrega`
     - Si `diff_days <= 0` → a tiempo
     - Si `diff_days > 0` → fuera de tiempo
   - **Estado**: ❌ **ESTA ES LA GRÁFICA QUE FALTA**

7. **Zonas por Mensajero** ⚠️
   - **Django**: `GET /api/zone/mensajero/?pk={mensajeroId}`
   - **NestJS**: ❓ Verificar si existe
   - **Descripción**: Muestra distribución de zonas para un mensajero específico
   - **Estado**: ⚠️ Verificar en NestJS

8. **Encargos Rechazados/Con Incidencias por Usuario** ⚠️
   - **Django**: `GET /api/state/list/?pk={userId}`
   - **NestJS**: ❓ Verificar si existe
   - **Descripción**: Lista de encargos con estado 7 (rechazado) o estado 6 con incidencias
   - **Estado**: ⚠️ Verificar en NestJS

9. **Encargos con Tardanza** ⚠️
   - **Django**: `GET /api/mensajero/list/time/?pk={mensajeroId}`
   - **NestJS**: ❓ Verificar si existe
   - **Descripción**: Encargos con campo `razon_tardanza` no vacío
   - **Estado**: ⚠️ Verificar en NestJS

---

## 📧 **FUNCIONALIDAD: BOTÓN "REGISTRAR EMAIL"**

### Descubrimiento Importante ✅

**Propósito Encontrado**: Permite al usuario enviar RECLAMOS usando su propio correo de Outlook.

**Código Django** (`views.py` línea 286-305):
```python
class SendComplaint(generics.UpdateAPIView):
    def update(self, request, *args , **kwargs):
        instance = self.get_object()
        user_email = request.user.email
        password = request.data.get('user_password')
        
        # Se conecta a SMTP con credenciales del usuario
        connect = EmailBackend(
            host='SMTP.Office365.com', 
            port=587, 
            password=password, 
            username=user_email, 
            use_tls=True
        )
        
        if connect.open():
            email = send_complaint(...)
            connect.send_messages([email])
```

**¿Qué hace?**
1. Usuario quiere enviar un reclamo sobre un encargo
2. Debe ingresar su email y contraseña de Outlook
3. Sistema usa esas credenciales para conectarse a SMTP
4. Envía el email DESDE el correo del usuario
5. El reclamo va a: `mortiz@consortiumlegal.com`, CC: `ptoribio@consortiumlegal.com`, `fguerra@consortiumlegal.com`

**¿Por qué esta función?**
- El usuario quiere que el reclamo venga de SU correo personal
- No usa las credenciales del sistema
- El destinatario ve que el email viene del usuario real

**Estado en NestJS**:
- ✅ Endpoint existe: `PATCH /api/encargos/:id/complaint`
- ❓ **VERIFICAR**: ¿Requiere contraseña del usuario o usa credenciales del sistema?

**Recomendación**:
1. Si NestJS usa credenciales del sistema → **Funcionalidad diferente, revisar**
2. Si requiere contraseña → **Mantener el modal de "Registrar Email" pero cambiar nombre a "Enviar Reclamo"**
3. Considerar implementar OAuth2 para no pedir contraseña directamente

---

## 🏗️ **ESTRUCTURA DE DATOS**

### Estados de Encargo

| ID | Nombre | Color | Descripción |
|----|--------|-------|-------------|
| 1 | Pendiente | orange | Aún no asignado o iniciado |
| 2 | En proceso | blue | Mensajero lo tiene asignado |
| 3 | Entregado | green | Completado exitosamente |
| 4 | No entregado | red | No se pudo entregar |
| 5 | Extraordinario | volcano | Envío extraordinario |
| 6 | Anulado | default | Cancelado |
| 7 | Rechazado | magenta | Rechazado por mensajero |
| 8 | Extra entregado | purple | Extraordinario completado |

### Prioridades

| ID | Nombre | Días | Descripción |
|----|--------|------|-------------|
| 1 | A | 0 | Mismo día (si es antes 9 AM) |
| 2 | B | 2 | 2 días |
| 3 | C | 3 | 3 o más días |
| 4 | D | - | Solo Villa Nueva (jueves) |

### Prioridad de Hora

| ID | Nombre | Descripción |
|----|--------|-------------|
| 1 | Ninguna | Sin restricción de hora |
| 2 | Antes de | Antes de {hora_minima} |
| 3 | Después de | Después de {hora_minima} |
| 4 | Entre | Entre {hora_minima} y {hora_maxima} |

---

## 📝 **ENDPOINTS DE ACCIÓN**

### 1. Rechazar Envío ✅
- **Django**: `PATCH /send/reject/{id}/`
- **NestJS**: `PATCH /api/encargos/{id}/reject`
- **Payload**: `{ razon_rechazo: string }`
- **Email**: Sí, envía email al solicitante
- **Estado**: ✅ Implementado

### 2. Reportar Incidencia ✅
- **Django**: `PATCH /send/incidence/{id}/`
- **NestJS**: `PATCH /api/encargos/{id}/incidence`
- **Payload**: `{ incidencias: string }`
- **Email**: Sí, envía email al solicitante
- **Estado**: ✅ Implementado

### 3. Enviar Reclamo ⚠️
- **Django**: `PATCH /send/complaint/{id}/`
- **NestJS**: `PATCH /api/encargos/{id}/complaint`
- **Payload**: 
  ```json
  {
    "reclamo": "string",
    "user_password": "string"  // ¿Sigue siendo necesario?
  }
  ```
- **Email**: Sí, desde el correo del usuario
- **Estado**: ⚠️ Verificar implementación en NestJS

---

## 📑 **REPORTE EXCEL**

### Django (`views.py` línea 165-258)

**Filtros Soportados**:
```python
GET /reporte_solicitudes_envio/
  ?id={mensajeroId}           # Filtrar por mensajero
  &type=1                     # 1=en ruta (estados 2,5), 2=pendientes (estados 1,2,5)
  &params=[1,5,10,15]         # Array de IDs específicos
```

**Columnas del Excel**:
1. Mensajería enviada
2. Destinatario
3. Empresa
4. Prioridad (A/B/C/D)
5. Dirección
6. Zona
7. Municipio
8. Solicitante
9. Hora (formateada según prioridad_hora)
10. Observaciones

**Template Base**: `/usr/src/app/reportes.xlsx` (plantilla pre-formateada)

**NestJS**:
- **Endpoint**: `GET /api/encargos/reportes/excel`
- **Estado**: ✅ Implementado según guía
- **Verificar**: Si genera el mismo formato que Django

---

## 👥 **PERMISOS Y FILTROS**

### Permisos

| Permiso ID | Descripción |
|------------|-------------|
| 6 | Permiso especial 1 |
| 8 | Mensajero/Coordinador |
| 10 | Coordinador/Admin |

### Filtros en Listas

**Usuario Normal**:
- Solo ve encargos donde es `solicitante` o `usuario_creador`

**Admin/Coordinador (8, 10)**:
- Ve todos los encargos

**Django** (`views.py` línea 117-127):
```python
if 10 in user_permissions or 8 in user_permissions or user.is_superuser:
    solicitudes = models.Encargo.objects.all()
else:
    solicitudes = models.Encargo.objects.filter(
        Q(usuario_creador_id=user.id) | Q(solicitante_id=user.id)
    )
```

**NestJS**:
- ✅ Verificar que implementa la misma lógica de permisos

---

## 🎯 **DASHBOARD - GRÁFICAS QUE DEBEN EXISTIR**

Basado en el análisis de Django y el archivo `charts.py`:

### Gráficas Principales (Para TODOS)

1. ✅ **Envíos por Mes**
   - Muestra total de solicitudes por mes
   - Filtros: fecha, equipo

2. ✅ **Envíos por Zona** 
   - Distribución por zona (1-25)
   - Filtros: fecha, equipo

3. ✅ **Estado de Envíos**
   - Correctos (estado 3)
   - Rechazados (estado 7)
   - Con incidencias (estado 6 + incidencias no vacías)

4. ✅ **Por Prioridad**
   - A, B, C, D
   - Filtros: fecha, equipo

### Gráficas por Usuario Individual

5. ✅ **Envíos del Usuario por Mes**
   - Filtrar por `pk={userId}`
   
6. ❌ **Estado del Usuario** 
   - Correctos/Rechazados/Incidencias del usuario específico
   - **Estado**: Verificar si existe

### Gráficas por Mensajero

7. ✅ **Envíos del Mensajero por Mes**
   - `GET /api/charts/mensajero/{id}`

8. ❌ **⚠️ EN TIEMPO vs FUERA DE TIEMPO** ← **CRÍTICO - FALTA**
   - Muestra rendimiento del mensajero
   - Columnas: mes, onTime, offTime, total
   - **Estado**: ❌ NO IMPLEMENTADO

9. ⚠️ **Zonas del Mensajero**
   - Distribución de zonas para ese mensajero
   - **Estado**: Verificar

10. ⚠️ **Encargos con Tardanza**
    - Lista de encargos que se entregaron tarde
    - **Estado**: Verificar

---

## 🔴 **PRIORIDAD DE IMPLEMENTACIÓN**

### 1. CRÍTICO - Implementar Ya ⚠️

#### A. Gráfica "En Tiempo vs Fuera de Tiempo"

**Endpoint Requerido**: 
```
GET /api/charts/mensajero/{id}/time?start={date}&end={date}
```

**Respuesta Esperada**:
```json
{
  "mensajero_id": 5,
  "solicitudes": [
    {
      "mes": "01",
      "onTime": 15,
      "offTime": 3,
      "total_solicitudes": 18
    },
    {
      "mes": "02",
      "onTime": 20,
      "offTime": 1,
      "total_solicitudes": 21
    }
  ]
}
```

**Lógica de Cálculo**:
```typescript
// Para cada encargo del mensajero con estado 3 u 8 (entregados)
const diffDays = fecha_entrega - fecha_realizacion;

if (diffDays <= 0) {
  onTime++;  // Entregó a tiempo o antes
} else {
  offTime++; // Entregó tarde
}
```

**Frontend**:
- Agregar componente de gráfica en `MensajeriaDashboardPage.tsx`
- Usar gráfica de barras o pie chart
- Mostrar al seleccionar un mensajero

#### B. Aclarar Funcionalidad de "Enviar Reclamo"

**Opciones**:

1. **Opción 1 - Mantener con Credenciales del Usuario**
   - Modal pide email y contraseña
   - Se conecta a SMTP con credenciales del usuario
   - Email viene del correo del usuario
   - **Ventaja**: Destinatario ve que viene del usuario real
   - **Desventaja**: Seguridad (guardar contraseña en memoria)

2. **Opción 2 - Usar Credenciales del Sistema**
   - No pide contraseña
   - Email viene del sistema pero con nombre del usuario
   - **Ventaja**: Más seguro
   - **Desventaja**: Email no viene del correo personal del usuario

3. **Opción 3 - Implementar OAuth2**
   - Usuario autoriza la aplicación
   - No necesita dar contraseña
   - Email viene de su correo
   - **Ventaja**: Más seguro y profesional
   - **Desventaja**: Más complejo de implementar

**Recomendación**: Verificar cómo lo implementó NestJS y decidir

---

### 2. IMPORTANTE - Implementar Pronto 🟡

#### C. Gráficas Adicionales del Dashboard

1. **Zonas por Mensajero**
2. **Encargos con Tardanza**
3. **Estado por Usuario Individual**

#### D. Autocomplete en Listas

- Ya discutido en documento anterior
- Endpoint existe: `GET /users/search?q={query}`
- Falta componente

---

### 3. VERIFICACIONES 🔍

#### E. Permisos y Filtros

- ✅ Verificar que usuarios normales solo ven sus encargos
- ✅ Verificar que coordinadores ven todos
- ✅ Verificar lógica de permisos en cada endpoint

#### F. Cálculo de Fecha y Zona

- ✅ Verificar que `fecha_realizacion` se calcula según prioridad
- ✅ Verificar que `zona` se obtiene del municipio
- ✅ Verificar lógica de Villa Nueva (jueves)

---

## 📋 **RESUMEN EJECUTIVO**

### ¿Qué Funciona? ✅

- ✅ Creación de encargos
- ✅ Listado de encargos
- ✅ Edición de encargos
- ✅ Rechazar envíos (con email)
- ✅ Reportar incidencias (con email)
- ✅ Comentarios
- ✅ Reporte Excel básico
- ✅ Mayoría de gráficas del dashboard
- ✅ Permisos básicos
- ✅ Campos opcionales (zona, fecha)

### ¿Qué Falta? ❌

- ❌ **GRÁFICA EN TIEMPO vs FUERA DE TIEMPO** ← **MÁS IMPORTANTE**
- ❌ Gráfica de zonas por mensajero
- ❌ Gráfica de encargos con tardanza
- ❌ Autocomplete en listas (endpoint existe, falta componente)
- ⚠️ Verificar funcionalidad de "Enviar Reclamo" con credenciales

### ¿Qué Verificar? ⚠️

- ⚠️ Lógica de Villa Nueva (jueves)
- ⚠️ Cálculo de fecha según prioridad y horario
- ⚠️ Email de reclamo (¿requiere contraseña?)
- ⚠️ Permisos en todos los endpoints
- ⚠️ Filtros funcionando correctamente

---

## 🎯 **PLAN DE ACCIÓN INMEDIATO**

### Paso 1: Revisar Backend NestJS (30 min)

Verificar en NestJS:
1. ¿Existe endpoint de "en tiempo vs fuera de tiempo"?
2. ¿Cómo funciona el endpoint de "complaint"?
3. ¿Existen gráficas de zonas por mensajero y tardanzas?

### Paso 2: Implementar Gráfica Faltante (2-3 horas)

**Backend**:
- Crear endpoint `GET /api/charts/mensajero/:id/time`
- Implementar lógica de cálculo

**Frontend**:
- Agregar gráfica al dashboard
- Mostrar datos de onTime vs offTime

### Paso 3: Aclarar "Enviar Reclamo" (1 hora)

- Revisar implementación actual
- Decidir estrategia de credenciales
- Actualizar modal si es necesario

### Paso 4: Testing Completo (2 horas)

- Probar todas las funcionalidades
- Verificar permisos
- Verificar cálculos automáticos
- Probar reportes Excel

---

**Última Actualización**: 4 de Febrero, 2026
**Estado**: Análisis Django completado, esperando revisión NestJS
