import { Table } from 'antd';

const data = [
  {
    key: '1',
    cheque: 'CH-00123',
    proveedor: 'Proveedora ABC',
    monto: 5000,
    fecha: '2025-07-20',
    estado: 'Liquidado',
  },
  {
    key: '2',
    cheque: 'CH-00124',
    proveedor: 'Servicios XYZ',
    monto: 3200,
    fecha: '2025-07-22',
    estado: 'Pendiente',
  },
];

const columns = [
  { title: 'N° Cheque', dataIndex: 'cheque' },
  { title: 'Proveedor', dataIndex: 'proveedor' },
  { title: 'Monto', dataIndex: 'monto' },
  { title: 'Fecha', dataIndex: 'fecha' },
  { title: 'Estado', dataIndex: 'estado' },
];

function LiquidacionCheque() {
  return (
    <>
      <h2>Liquidación de cheques</h2>
      <Table dataSource={data} columns={columns} />
    </>
  );
}

export default LiquidacionCheque;
