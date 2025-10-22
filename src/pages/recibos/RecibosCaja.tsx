import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Card,
  List,
  message,
  Descriptions,
  Divider,
  Button,
  Modal,
  Input,
  Typography,
} from 'antd';
import {
  DownloadOutlined,
  MailOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import AgregarCheque from './AgregarCheque';
import type { CashReceipt, Check } from '../../api/cashReceipts';
import cashReceiptsApi from '../../api/cashReceipts';

const { Title } = Typography;

const RecibosCaja: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [recibo, setRecibo] = useState<CashReceipt | null>(null);
  const [loading, setLoading] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailToSend, setEmailToSend] = useState('');

  const fetchRecibo = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await cashReceiptsApi.getById(Number(id));
      setRecibo(res.data);
    } catch {
      message.error('Error al cargar el recibo');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecibo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleDownloadPdf = async () => {
    if (!id) return;
    try {
      const response = await cashReceiptsApi.getPdf(Number(id));
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `recibo_${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      message.success('PDF descargado correctamente');
    } catch {
      message.error('Error al generar PDF');
    }
  };

  const handleSendEmail = async () => {
    if (!id) return;
    setEmailModalOpen(true);
  };

  const confirmSendEmail = async () => {
    if (!emailToSend) {
      message.warning('Ingrese un correo válido');
      return;
    }

    try {
      await cashReceiptsApi.sendPdfByEmail(Number(id), emailToSend);
      message.success('Recibo enviado correctamente');
      setEmailModalOpen(false);
      setEmailToSend('');
    } catch {
      message.error('Error al enviar el recibo');
    }
  };

  if (!recibo) return <p>Cargando...</p>;

  const currencySymbol =
    recibo.currency === 1 ? 'Q' : recibo.currency === 2 ? '$' : '€';

  return (
    <Card
      title={
        <SpaceBetween>
          <Title level={4} style={{ margin: 0 }}>
            Recibo #{recibo.correlative}
          </Title>
          <div>
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchRecibo}
              style={{ marginRight: 8 }}
            >
              Refrescar
            </Button>
            <Button
              icon={<DownloadOutlined />}
              onClick={handleDownloadPdf}
              style={{ marginRight: 8 }}
            >
              Descargar PDF
            </Button>
            <Button
              icon={<MailOutlined />}
              type="primary"
              onClick={handleSendEmail}
            >
              Enviar por correo
            </Button>
          </div>
        </SpaceBetween>
      }
      bordered
      loading={loading}
    >
      <Descriptions bordered column={2} size="small">
        <Descriptions.Item label="Serie">{recibo.serie}</Descriptions.Item>
        <Descriptions.Item label="Correlativo">
          {recibo.correlative}
        </Descriptions.Item>
        <Descriptions.Item label="Fecha">{recibo.date}</Descriptions.Item>
        <Descriptions.Item label="Moneda">{currencySymbol}</Descriptions.Item>
        <Descriptions.Item label="Recibimos de" span={2}>
          {recibo.received_from}
        </Descriptions.Item>
        <Descriptions.Item label="Concepto" span={2}>
          {recibo.concept}
        </Descriptions.Item>
        <Descriptions.Item label="Factura No.">
          {recibo.bill_number || '—'}
        </Descriptions.Item>
        <Descriptions.Item label="Nota de trabajo">
          {recibo.work_note_number || '—'}
        </Descriptions.Item>
        <Descriptions.Item label="Exención IVA">
          {recibo.iva_exemption || '—'}
        </Descriptions.Item>
        <Descriptions.Item label="Cantidad">
          {currencySymbol} {Number(recibo.amount).toLocaleString()}
        </Descriptions.Item>
        <Descriptions.Item label="Creador">
          {recibo.creator?.username || '—'}
        </Descriptions.Item>
      </Descriptions>

      <Divider orientation="left">Cheques asociados</Divider>
      <List
        bordered
        dataSource={recibo.checks || []}
        renderItem={(check: Check) => (
          <List.Item>
            <b>{check.bank}</b> — No. {check.number} —{' '}
            {currencySymbol} {Number(check.value).toLocaleString()}
          </List.Item>
        )}
        locale={{ emptyText: 'No hay cheques registrados' }}
      />

      <AgregarCheque onAdded={fetchRecibo} />

      <Modal
        title="Enviar recibo por correo"
        open={emailModalOpen}
        onCancel={() => setEmailModalOpen(false)}
        onOk={confirmSendEmail}
        okText="Enviar"
        cancelText="Cancelar"
      >
        <p>Ingrese el correo del destinatario:</p>
        <Input
          placeholder="ejemplo@dominio.com"
          value={emailToSend}
          onChange={(e) => setEmailToSend(e.target.value)}
        />
      </Modal>
    </Card>
  );
};

// 🔹 Pequeño componente auxiliar para alinear título y botones
const SpaceBetween: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
    }}
  >
    {children}
  </div>
);

export default RecibosCaja;