import { Table } from 'antd';

const data = [
  {
    key: '1',
    cheque: 'CH-00088',
    beneficiario: 'María López',
    fecha: '2025-06-15',
    monto: 4200,
  },
  {
    key: '2',
    cheque: 'CH-00089',
    beneficiario: 'Carlos Ruiz',
    fecha: '2025-06-18',
    monto: 2850,
  },
];

const columns = [
  { title: 'N° Cheque', dataIndex: 'cheque' },
  { title: 'Beneficiario', dataIndex: 'beneficiario' },
  { title: 'Fecha', dataIndex: 'fecha' },
  { title: 'Monto', dataIndex: 'monto' },
];

function ChequesLiquidados() {
  return (
    <>
      <h2>Cheques liquidados</h2>
      <Table dataSource={data} columns={columns} />
    </>
  );
}

export default ChequesLiquidados;
