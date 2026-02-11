# 📖 Guía de Usuario - Sistema de Reservación de Salas

## 🎯 Nuevas Funcionalidades Implementadas

### 1. 🔁 Reservaciones Recurrentes

#### ¿Qué son?
Las reservaciones recurrentes te permiten crear múltiples reservaciones automáticamente con el mismo horario en diferentes fechas, sin tener que crearlas una por una.

#### ¿Cuándo usar reservaciones recurrentes?
- Reuniones semanales de equipo
- Sesiones de capacitación mensuales
- Juntas regulares con clientes
- Cualquier evento que se repita con frecuencia

#### ¿Cómo crear una reservación recurrente?

**Paso 1:** Ve a "Crear Reservación"

**Paso 2:** Llena los datos básicos:
- Sala
- Fecha de inicio
- Hora de inicio y fin
- Motivo
- Participantes

**Paso 3:** Activa la opción "¿Es una reservación recurrente?"

**Paso 4:** Selecciona el patrón de repetición:
- **Diaria:** Se repite cada día
- **Semanal:** Se repite cada semana (mismo día)
- **Quincenal:** Se repite cada 2 semanas
- **Mensual:** Se repite cada mes (mismo día)

**Paso 5:** Selecciona la fecha final

**Paso 6:** Haz clic en "Crear Reservación"

#### ⚠️ Importante:
- El sistema solo creará reservaciones en fechas donde NO haya conflictos de horario
- Recibirás una confirmación mostrando:
  - ✅ Fechas creadas exitosamente
  - ❌ Fechas omitidas por conflictos
- La recurrencia puede extenderse máximo **6 meses**

#### Ejemplo práctico:
```
Quiero una reunión todos los lunes de 9:00 a 10:00 durante 2 meses

✅ Configuración:
- Fecha inicio: 10 de febrero de 2026 (lunes)
- Patrón: Semanal
- Fecha final: 10 de abril de 2026

✅ Resultado:
El sistema creará 8 reservaciones automáticamente:
- 10/02/2026 ✓
- 17/02/2026 ✓
- 24/02/2026 ✓
- 03/03/2026 ✓
- 10/03/2026 ✓
- 17/03/2026 ✓
- 24/03/2026 ✓ (si hay conflicto, se omite)
- 31/03/2026 ✓
```

---

### 2. ❌ Cancelar Reservaciones

#### ¿Qué cambió?
Ahora puedes **cancelar** tus reservaciones en lugar de solo eliminarlas.

#### Diferencia entre Eliminar y Cancelar:

**Eliminar** (🗑️):
- Solo disponible para reservaciones **pendientes** (no aprobadas)
- La reservación desaparece completamente
- Solo tú puedes verla

**Cancelar** (🛑):
- Disponible para reservaciones **pendientes** y **aceptadas**
- La reservación queda marcada como "Cancelada" pero no se elimina
- Todos pueden ver que fue cancelada
- Se envía notificación automática a recepción y participantes

#### ¿Cómo cancelar una reservación?

**Paso 1:** Ve a "Listar Reservaciones"

**Paso 2:** Encuentra tu reservación

**Paso 3:** Haz clic en el botón 🛑 "Cancelar"

**Paso 4:** (Opcional) Escribe el motivo de la cancelación

**Paso 5:** Confirma

#### ✅ Beneficios:
- Mantiene registro histórico
- Notifica automáticamente a todos los involucrados
- Libera el horario para otros usuarios
- Transparencia en el uso de salas

---

### 3. 📊 Vista Mejorada del Calendario

#### Nuevas características:

**Filtro de Salas Completo** 🔍
- Ahora puedes filtrar por **TODAS las salas** del sistema
- Antes solo mostraba salas con reservaciones
- Selección múltiple para comparar disponibilidad

**Indicadores de Recurrencia** 🔄
- Las reservaciones recurrentes muestran un badge azul giratorio
- Puedes ver el patrón (Diaria, Semanal, etc.)
- Hover sobre el indicador para más detalles

**Estados Visibles** 📌
- 🟡 Pendiente - Esperando aprobación
- 🟢 Aceptada - Confirmada
- 🔴 Rechazada - No aprobada
- ⚪ Cancelada - Cancelada por el usuario

---

### 4. 📧 Notificaciones por Email (Próximamente)

Una vez implementado en el backend, recibirás emails automáticos:

#### Cuándo llegarán:
- ✅ Al crear una reservación
- ✅ Cuando se apruebe tu reservación
- ❌ Cuando se rechace tu reservación
- 🛑 Cuando canceles o alguien cancele
- 🔔 Recordatorio el día anterior (5:00 PM)
- 🔔 Recordatorio especial los viernes para el lunes

#### Qué incluirán:
- Detalles de la reservación
- Archivo .ICS para agregar a tu calendario
- Enlaces rápidos para gestionar la reservación
- Lista de participantes

---

### 5. 🎨 Interfaz Mejorada

#### Tabla de Reservaciones:

**Nuevas Columnas:**
- **Recurrente:** Muestra si es parte de una serie recurrente
- **Horario:** Combinado en una sola columna para mayor claridad

**Filtros Mejorados:**
- Filtrar por sala (búsqueda por nombre)
- Filtrar por fecha específica
- Filtrar por usuario
- Filtrar por estado (incluyendo "Canceladas")
- Contador de resultados en tiempo real

**Acciones Contextuales:**
- Los botones de acción aparecen según tus permisos
- Tooltips informativos en cada acción
- Confirmaciones claras antes de acciones importantes

---

## 🔐 Permisos y Roles

### Usuario Normal:
- ✅ Crear reservaciones
- ✅ Ver sus propias reservaciones
- ✅ Editar reservaciones propias (solo si están pendientes)
- ✅ Cancelar reservaciones propias (pendientes o aceptadas)
- ❌ No puede aprobar/rechazar

### Recepcionista:
- ✅ Todo lo de Usuario Normal
- ✅ Ver TODAS las reservaciones
- ✅ Aprobar/Rechazar reservaciones
- ✅ Editar cualquier reservación pendiente

### Superusuario:
- ✅ TODO lo anterior
- ✅ Eliminar cualquier reservación
- ✅ Ver estadísticas completas
- ✅ Gestionar salas y recursos
- ✅ Toggle "Solo mis reservas" para filtrar rápido

---

## 💡 Consejos y Buenas Prácticas

### Al crear reservaciones:

1. **Verifica disponibilidad primero:**
   - Usa el botón "Verificar disponibilidad" antes de enviar
   - Revisa la agenda del día en la parte inferior del formulario

2. **Reservaciones recurrentes:**
   - Sé realista con la fecha final (6 meses máximo)
   - Revisa la confirmación de fechas creadas
   - Si necesitas más de 6 meses, crea otra serie después

3. **Compartir costos:**
   - Solo disponible para socios autorizados
   - Máximo 3 socios por reservación
   - El costo se divide automáticamente en partes iguales

### Al cancelar:

1. **Cancela con tiempo:**
   - Hazlo con al menos 24 horas de anticipación
   - Permite que otros aprovechen el espacio

2. **Escribe el motivo:**
   - Aunque es opcional, ayuda a recepción a entender patrones
   - Facilita la resolución de conflictos

3. **Diferencia entre cancelar y rechazar:**
   - TÚ cancelas tus reservaciones
   - RECEPCIÓN rechaza reservaciones que no cumplen requisitos

---

## 🆘 Solución de Problemas

### "No puedo crear una reservación recurrente"

**Causa común:** La fecha final es muy lejana
**Solución:** Reduce el rango a máximo 6 meses

---

### "Algunas fechas no se crearon"

**Esto es normal:** El sistema omite fechas con conflictos
**Solución:** Revisa la lista de fechas omitidas y créalas manualmente con otro horario

---

### "No veo el botón de cancelar"

**Causa 1:** La reservación ya fue rechazada o cancelada
**Causa 2:** No eres el dueño de la reservación
**Solución:** Verifica que sea tu reservación y que esté pendiente o aceptada

---

### "El filtro de salas no muestra ninguna"

**Causa:** Las salas aún no han cargado
**Solución:** Espera unos segundos, deberías ver "Cargando salas..."

---

## 📞 Soporte

**¿Necesitas ayuda?**
- Contacta a recepción
- Revisa esta guía
- Consulta con el administrador del sistema

**Reportar un error:**
- Toma captura de pantalla
- Describe qué intentabas hacer
- Envía a soporte técnico

---

## 📅 Changelog

**Versión 2.0 - Febrero 2026**
- ✨ Reservaciones recurrentes
- ✨ Estado "Cancelada"
- ✨ Filtro completo de salas en calendario
- ✨ Indicadores visuales de recurrencia
- ✨ Filtros avanzados en lista
- 🐛 Correcciones menores de UI

**Versión 1.0 - Enero 2025**
- Funcionalidad básica de reservaciones
- Sistema de aprobación
- Compartir costos
- Reportes mensuales

---

**¡Disfruta del nuevo sistema de reservaciones! 🎉**
