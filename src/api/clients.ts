import api from './axios';

export interface Client {
  id: number;
  name: string;
}

function parseClientsResponse(data: unknown): Client[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object' && Array.isArray((data as { data?: Client[] }).data)) {
    return (data as { data: Client[] }).data;
  }
  return [];
}

export async function fetchClients(): Promise<Client[]> {
  const urls = [
    '/procuration-control/master-data/clients',
    '/api/procuration-control/master-data/clients',
  ];
  for (const url of urls) {
    try {
      const { data } = await api.get<Client[] | { data: Client[] }>(url);
      const list = parseClientsResponse(data);
      if (list.length > 0 || url === urls[0]) return list;
    } catch (err: any) {
      if (url === urls[urls.length - 1]) {
        console.warn('[fetchClients] No se pudo cargar la lista de clientes:', err?.response?.status ?? err?.message);
        return [];
      }
    }
  }
  return [];
}
