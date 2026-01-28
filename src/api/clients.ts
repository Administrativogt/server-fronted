import api from './axios';

export interface Client {
  id: number;
  name: string;
}

export async function fetchClients(): Promise<Client[]> {
  const { data } = await api.get<{ data: Client[] }>('/procuration-control/master-data/clients');
  return data.data;
}
