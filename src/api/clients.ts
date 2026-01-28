import api from './axios';

export interface Client {
  id: number;
  name: string;
}

export async function fetchClients(): Promise<Client[]> {
  try {
    const { data } = await api.get<{ data: Client[] }>('/procuration-control/master-data/clients');
    return data.data;
  } catch (error: any) {
    if (error?.response?.status === 404) {
      const { data } = await api.get<{ data: Client[] }>('/api/procuration-control/master-data/clients');
      return data.data;
    }
    throw error;
  }
}
