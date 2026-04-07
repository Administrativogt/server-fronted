// Contraseñas de pago
export interface Factura {
  numero: string;
  fecha: string;
  valor: string;
}

export interface ContrasenaDeago {
  id: number;
  codigo_unico: number;
  cliente: string;
  cliente_correo: string;
  facturas: string; // JSON string
  fecha_cancelacion: string;
  fecha_creacion: string;
  recordatorio: 1 | 2; // 1=hecho, 2=pendiente
  estado: 1 | 2 | 3; // 1=Pagada, 2=Pendiente, 3=Anulada
  usuario_creador?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  };
}

export interface CreateContrasenaPayload {
  codigo_unico: number;
  cliente: string;
  cliente_correo: string;
  facturas: Factura[];
  fecha_cancelacion: string;
}

export interface UpdateContrasenaPayload {
  estado?: 1 | 2 | 3;
  recordatorio?: 1 | 2;
}

// Proveedores
export interface Proveedor {
  id: number;
  nombre: string;
  correo: string;
}

export interface CreateProveedorPayload {
  nombre: string;
  correo: string;
}

// Cheques de liquidación
export interface AccountingCheck {
  id: number;
  date: string;
  document_type: string;
  check_number: number;
  user: string;
  description: string;
  amount: string;
  announcements: number;
  active: boolean;
}

export interface CreateCheckPayload {
  date: string;
  document_type: string;
  check_number: number;
  user: string;
  description: string;
  amount: string;
  announcements?: number;
  active?: boolean;
}
