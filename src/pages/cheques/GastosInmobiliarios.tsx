import { Table } from 'antd';

const data = [
  {
    key: '1',
    propiedad: 'Oficina Torre 5',
    proveedor: 'Inmobiliaria Real',
    monto: 8000,
    fecha: '2025-07-01',
  },
  {
    key: '2',
    propiedad: 'Sucursal Norte',
    proveedor: 'Arquitectura & Cía',
    monto: 12000,
    fecha: '2025-07-05',
  },
];

const columns = [
  { title: 'Propiedad', dataIndex: 'propiedad' },
  { title: 'Proveedor', dataIndex: 'proveedor' },
  { title: 'Monto', dataIndex: 'monto' },
  { title: 'Fecha', dataIndex: 'fecha' },
];

function GastosInmobiliarios() {
  return (
    <>
      <h2>Gastos inmobiliarios</h2>
      <Table dataSource={data} columns={columns} />
    </>
  );
}

export default GastosInmobiliarios;
