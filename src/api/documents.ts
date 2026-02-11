import api from "./axios";
import type { User } from "../types/user.types";
import type { PlaceDto, UserRef } from "./notifications";

//
// Tipos de datos
//

/** Estados de documentos */
export const DOCUMENT_STATES = {
  PENDING: 1,
  DELIVERED: 2,
  DELETED: 3,
  FINALIZED: 4,
  REJECTED: 5,
} as const;

export interface DocumentDto {
  id: number;
  state: number;
  receptionDatetime: string;
  documentDeliverBy: string | null;
  amount: number;
  documentType: string;
  submitTo: string;
  deliverTo: string;
  deliverDatetime?: string | null;
  observations?: string | null;
  reminder?: boolean;
  deleteReason?: string | null;
  returned?: boolean;
  selectedAction?: boolean;
  creationPlace?: PlaceDto | null;
  receivedBy?: UserRef | null;
  deliverBy?: UserRef | null;
}

/** Valores disponibles para filtros */
export interface DocumentFilterValues {
  documentTypes: string[];
  documentDelivers: string[];
  receivedBy: number[];
  deliverBy: number[];
  deliverTo: string[];
  submitTo: string[];
}

//
// 1. Pendientes
//
export async function fetchPendingDocuments(): Promise<DocumentDto[]> {
  const { data } = await api.get("/documents/pending");
  return data;
}

//
// 2. Entregar o reentregar
//
export async function deliverDocuments({
  ids,
  action,
  deliverTo,
  observations,
}: {
  ids: number[];
  action: 1 | 2;
  deliverTo: string | number;
  observations?: string;
}) {
  const { data } = await api.patch(`/documents/deliver/${action}`, {
    documentsSelected: ids,
    deliver_to: String(deliverTo),
    observations,
  });
  return data;
}

//
// 3. Crear
//
export interface CreateDocumentPayload {
  documentDeliverBy: string;
  amount: number;
  creationPlace: number;
  receivedBy: number;
  documentType: string;
  submitTo: string;
  deliverTo: string;
  deliverBy?: number;
  observations?: string;
  deliverDatetime?: string;
}

export async function createDocument(payload: CreateDocumentPayload) {
  const { data } = await api.post("/documents", payload);
  return data as DocumentDto;
}

//
// 4. Actualizar
//
export async function updateDocument(id: number, payload: Partial<DocumentDto>) {
  const { data } = await api.patch(`/documents/${id}`, payload);
  return data as DocumentDto;
}

//
// 5. Eliminar (soft delete via PATCH con state=3)
//
export async function deleteDocument(id: number, deleteReason: string) {
  const { data } = await api.patch(`/documents/${id}`, {
    state: DOCUMENT_STATES.DELETED,
    deleteReason,
  });
  return data;
}

//
// 6. Entregados
//
export async function fetchDeliveredDocuments(): Promise<DocumentDto[]> {
  const { data } = await api.get("/documents/delivered");
  return data;
}

//
// 7. Obtener un documento
//
export async function fetchDocumentById(id: number): Promise<DocumentDto> {
  const { data } = await api.get(`/documents/${id}`);
  return data;
}

//
// 8. Filtro entregados
//
export async function filterDocuments(filters: Record<string, string>): Promise<DocumentDto[]> {
  const { data } = await api.get("/documents/filter", { params: filters });
  return data;
}

//
// 9. Valores para filtros (meta)
//
export async function fetchDocumentFilterValues(): Promise<DocumentFilterValues> {
  const { data } = await api.get("/documents/meta/filter-values");
  return data;
}

//
// 10. Acciones (Aceptar/Rechazar/Seleccionar) – base64
//
export async function applyActionToDocuments(action: 1 | 2 | 3, documentIds: number[]) {
  if (!documentIds.length) throw new Error("No se seleccionaron documentos");
  const encoded = btoa(JSON.stringify(documentIds));
  const { data } = await api.patch("/documents/actions", {}, {
    params: { action, documents: encoded },
  });
  return data;
}

//
// 11. Selección múltiple (aceptados/rechazados)
//
export async function applySelectedDocuments(acceptedIds: number[], rejectedIds: number[]) {
  const acc = btoa(JSON.stringify(acceptedIds));
  const rej = btoa(JSON.stringify(rejectedIds));
  const { data } = await api.patch("/documents/actions/selected", {}, {
    params: { documentsAccepted: acc, documentsRejected: rej },
  });
  return data;
}

//
// Obtener lista de usuarios activos (para dropdowns)
//
export async function fetchUsers(): Promise<User[]> {
  const { data } = await api.get("/users");
  return data;
}
