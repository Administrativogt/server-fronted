# GET Lista de entidades (dropdown “Entidad” en liquidación)

## Método y URL

**GET** `/checks/entities`

## Headers

```
Authorization: Bearer <access_token>
```

## Respuesta (200 OK)

Array de objetos con todas las entidades, **ordenadas por name (A–Z)**.

### Formato de cada item

```json
{
  "id": 1,
  "name": "GASTOS VARIOS ADMINISTRATIVOS",
  "pdf_pages_allowed": 1,
  "pdf_pages_unlimited": false
}
```

### Ejemplo de respuesta

```json
[
  { "id": 1, "name": "GASTOS VARIOS ADMINISTRATIVOS", "pdf_pages_allowed": 1, "pdf_pages_unlimited": false },
  { "id": 2, "name": "Traducciones", "pdf_pages_allowed": 5, "pdf_pages_unlimited": false },
  { "id": 3, "name": "Ministerio de Economía - MINECO -", "pdf_pages_allowed": 3, "pdf_pages_unlimited": false }
]
```

## Uso en el front

- Llamar **GET /checks/entities** al cargar la pantalla de liquidación de cheque.
- Poblar el dropdown **“Entidad”** con este array (`value` = `id`, `label` = `name`).
- Al enviar el formulario de liquidación, enviar el **id** elegido en el campo **entity_id** del body (multipart/form-data) de **POST /checks/:checkRequestId/liquidate**.

## Campos útiles

| Campo               | Tipo    | Uso |
|---------------------|---------|-----|
| `id`                | number  | Valor a enviar como `entity_id` al liquidar. |
| `name`              | string  | Texto a mostrar en el dropdown. |
| `pdf_pages_allowed` | number  | Límite de páginas del PDF (validado en backend). |
| `pdf_pages_unlimited` | boolean | Si es `true`, no se aplica límite de páginas. |

## Base URL

La misma del resto de la API (ej. `https://tu-dominio.com` o `http://localhost:3000`).

**Ejemplo de URL completa:** `GET https://tu-dominio.com/checks/entities`
