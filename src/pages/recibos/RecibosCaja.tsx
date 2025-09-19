import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, List, message } from 'antd';
import AgregarCheque from './AgregarCheque';
import type { CashReceipt, Check } from '../../api/cashReceipts';
import cashReceiptsApi from '../../api/cashReceipts';

const RecibosCaja: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [recibo, setRecibo] = useState<CashReceipt | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await cashReceiptsApi.getById(Number(id));
        setRecibo(res.data);
      } catch {
        message.error('Error al cargar el recibo');
      }
    };
    if (id) fetchData();
  }, [id]);

  if (!recibo) return <p>Cargando...</p>;

  return (
    <Card title={`Recibo #${recibo.correlative}`} bordered>
      <p>
        <b>Recibimos de:</b> {recibo.received_from}
      </p>
      <p>
        <b>Cantidad:</b> Q. {recibo.amount}
      </p>
      <p>
        <b>Concepto:</b> {recibo.concept}
      </p>
      <p>
        <b>Factura:</b> {recibo.bill_number}
      </p>

      <h3>Cheques</h3>
      <List
        dataSource={recibo.checks || []}
        renderItem={(check: Check) => (
          <List.Item>
            {check.bank} - {check.number} - Q. {check.value}
          </List.Item>
        )}
      />

      <AgregarCheque onAdded={() => {
        if (id) {
          cashReceiptsApi.getById(Number(id)).then(res => setRecibo(res.data));
        }
      }} />
    </Card>
  );
};

export default RecibosCaja;