import { Table } from 'antd';

const data = [
  {
    key: '1',
    beneficiario: 'Juan Pérez',
    monto: 1500,
    motivo: 'Pago de servicios',
    fecha: '2025-07-29',
    estado: 'Pendiente',
  },
  {
    key: '2',
    beneficiario: 'Ana Martínez',
    monto: 2100,
    motivo: 'Honorarios legales',
    fecha: '2025-07-25',
    estado: 'Autorizado',
  },
];

const columns = [
  { title: 'Beneficiario', dataIndex: 'beneficiario' },
  { title: 'Monto', dataIndex: 'monto' },
  { title: 'Motivo', dataIndex: 'motivo' },
  { title: 'Fecha', dataIndex: 'fecha' },
  { title: 'Estado', dataIndex: 'estado' },
];

function AutorizacionCheque() {
  return (
    <>
      <h2>Autorización de cheques</h2>
      <Table dataSource={data} columns={columns} />
    </>
  );
}

export default AutorizacionCheque;
