import { Table } from 'antd';

const data = [
  {
    key: '1',
    cheque: 'CH-00001',
    beneficiario: 'Pedro Soto',
    fechaEmision: '2025-05-01',
    diasPendientes: 88,
  },
  {
    key: '2',
    cheque: 'CH-00002',
    beneficiario: 'Lucía Vega',
    fechaEmision: '2025-04-20',
    diasPendientes: 99,
  },
];

const columns = [
  { title: 'N° Cheque', dataIndex: 'cheque' },
  { title: 'Beneficiario', dataIndex: 'beneficiario' },
  { title: 'Fecha de emisión', dataIndex: 'fechaEmision' },
  { title: 'Días pendientes', dataIndex: 'diasPendientes' },
];

function ChequesPendientes() {
  return (
    <>
      <h2>Cheques más antiguos pendientes de liquidar</h2>
      <Table dataSource={data} columns={columns} />
    </>
  );
}

export default ChequesPendientes;
