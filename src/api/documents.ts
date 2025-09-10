import api from './axios';

export interface DocumentDto {
  id: number;
  receptionDatetime: string;
  documentDeliverBy: string | null;
  amount: number;
  receivedBy?: any;
  documentType: string;
  submitTo: string;
  deliverDatetime?: string;
  deliverTo: string;
  deliverBy?: any;
  observations?: string;
  state: number;
}

// 1. Pendientes
export const fetchPendingDocuments = async (): Promise<DocumentDto[]> => {
  const { data } = await api.get('/documents/pending');
  return data;
};

// 2. Entregar o reentregar (¡este es el de correo!)
export const deliverDocuments = async ({
  ids,
  action,
  deliverTo,
  observations,
}: {
  ids: number[];
  action: 1 | 2;
  deliverTo: string | number;
  observations?: string;
}) => {
  return api.patch(`/documents/deliver/${action}`, {
    documentsSelected: ids,
    deliver_to: String(deliverTo),
    observations,
  });
};

// 3. Crear
export const createDocument = async (doc: Partial<DocumentDto>) => {
  return api.post('/documents', doc);
};

// 4. Actualizar
export const updateDocument = async (id: number, doc: Partial<DocumentDto>) => {
  return api.patch(`/documents/${id}`, doc);
};

// 5. Eliminar
export const deleteDocument = async (id: number): Promise<void> => {
  await api.delete(`/documents/${id}`);
};

// 6. Entregados
export const fetchDeliveredDocuments = async (): Promise<DocumentDto[]> => {
  const { data } = await api.get('/documents/delivered');
  return data;
};

// 7. Filtro entregados
export const filterDocuments = async (filters: Record<string, any>) => {
  const query = new URLSearchParams(filters as any).toString();
  const { data } = await api.get(`/documents/filter?${query}`);
  return data;
};

// 8. Acciones (Aceptar/Rechazar/Seleccionar) – base64
export const applyActionToDocuments = async (action: 1 | 2 | 3, documentIds: number[]) => {
  if (!documentIds.length) throw new Error('No se seleccionaron documentos');
  const encoded = btoa(JSON.stringify(documentIds));
  return api.patch(`/documents/actions?action=${action}&documents=${encoded}`);
};

// 9. Selección múltiple (aceptados/rechazados)
export const applySelectedDocuments = async (acceptedIds: number[], rejectedIds: number[]) => {
  const acc = btoa(JSON.stringify(acceptedIds));
  const rej = btoa(JSON.stringify(rejectedIds));
  const { data } = await api.patch(`/documents/actions/selected?documentsAccepted=${acc}&documentsRejected=${rej}`);
  return data;
};
