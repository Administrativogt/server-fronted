// src/pages/appointments/CreateAppointment.tsx
import React, { useState } from 'react';
import {
  Card,
  Form,
  Input,
  DatePicker,
  Button,
  Space,
  Upload,
  message,
  Row,
  Col,
  Divider,
} from 'antd';
import {
  SaveOutlined,
  ArrowLeftOutlined,
  InboxOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { UploadFile } from 'antd/es/upload/interface';
import { createAppointment } from '../../api/appointments';
import type { CreateAppointmentDto } from '../../types/appointment.types';
import useAuthStore from '../../auth/useAuthStore';

const { Dragger } = Upload;
const { TextArea } = Input;

const CreateAppointment: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const userId = useAuthStore((s) => s.userId);

  const [loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  const handleSubmit = async (values: any) => {
    if (fileList.length === 0) {
      message.error('Debe subir al menos un archivo PDF');
      return;
    }

    if (!userId) {
      message.error('Error: Usuario no autenticado');
      return;
    }

    setLoading(true);
    try {
      const appointmentData: CreateAppointmentDto = {
        deedId: values.deedId,
        startDate: values.startDate.format('YYYY-MM-DD'),
        finishDate: values.finishDate.format('YYYY-MM-DD'),
        register: values.register || '',
        folio: values.folio || '',
        book: values.book || '',
        representative: values.representative,
        position: values.position,
        clientEmail: values.clientEmail,
        creatorId: userId,
      };

      const files = fileList.map((file) => file.originFileObj as File);

      await createAppointment(appointmentData, files);

      message.success('Acta creada con éxito');
      navigate('/dashboard/appointments');
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Error al crear acta');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (info: any) => {
    let newFileList = [...info.fileList];

    // Filtrar solo PDFs
    newFileList = newFileList.filter((file) => {
      if (file.type && file.type !== 'application/pdf') {
        message.error(`${file.name} no es un archivo PDF`);
        return false;
      }
      return true;
    });

    setFileList(newFileList);
  };

  return (
    <Card
      title="Crear Acta de Nombramiento"
      extra={
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/dashboard/appointments')}>
          Volver
        </Button>
      }
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              label="Identificación del Acta"
              name="deedId"
              rules={[{ required: true, message: 'Campo requerido' }]}
            >
              <Input placeholder="Ej: ACTA-001-2025" />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item
              label="Representante Legal"
              name="representative"
              rules={[{ required: true, message: 'Campo requerido' }]}
            >
              <Input placeholder="Nombre completo" />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item
              label="Fecha que se Otorgó"
              name="startDate"
              rules={[{ required: true, message: 'Campo requerido' }]}
            >
              <DatePicker
                style={{ width: '100%' }}
                format="DD/MM/YYYY"
                placeholder="Seleccione fecha"
              />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item
              label="Fecha que Vence"
              name="finishDate"
              rules={[
                { required: true, message: 'Campo requerido' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    const startDate = getFieldValue('startDate');
                    if (!value || !startDate || value.isAfter(startDate)) {
                      return Promise.resolve();
                    }
                    return Promise.reject(
                      new Error('La fecha de vencimiento debe ser posterior a la fecha de inicio')
                    );
                  },
                }),
              ]}
            >
              <DatePicker
                style={{ width: '100%' }}
                format="DD/MM/YYYY"
                placeholder="Seleccione fecha"
              />
            </Form.Item>
          </Col>
        </Row>

        <Divider>Datos Registrales</Divider>

        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Form.Item label="Registro" name="register">
              <Input placeholder="Ej: Registro Mercantil" />
            </Form.Item>
          </Col>

          <Col xs={24} md={8}>
            <Form.Item label="Folio" name="folio">
              <Input placeholder="Ej: 123" />
            </Form.Item>
          </Col>

          <Col xs={24} md={8}>
            <Form.Item label="Libro" name="book">
              <Input placeholder="Ej: 456" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              label="Cargo"
              name="position"
              rules={[{ required: true, message: 'Campo requerido' }]}
            >
              <Input placeholder="Ej: Gerente General" />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item
              label="Correo del Cliente"
              name="clientEmail"
              rules={[
                { required: true, message: 'Campo requerido' },
                {
                  pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: 'Correo inválido',
                },
              ]}
              tooltip="Puede ingresar múltiples correos separados por coma"
            >
              <TextArea
                rows={2}
                placeholder="cliente1@empresa.com,cliente2@empresa.com"
              />
            </Form.Item>
          </Col>
        </Row>

        <Divider>Documentos</Divider>

        <Form.Item label="Archivos PDF" required>
          <Dragger
            multiple
            fileList={fileList}
            onChange={handleFileChange}
            beforeUpload={() => false}
            accept="application/pdf"
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">
              Click o arrastra archivos PDF para subir
            </p>
            <p className="ant-upload-hint">
              Puedes subir múltiples archivos. Solo se aceptan PDFs.
            </p>
          </Dragger>
        </Form.Item>

        <Form.Item>
          <Space>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={loading}
              size="large"
            >
              Crear Acta
            </Button>
            <Button size="large" onClick={() => navigate('/dashboard/appointments')}>
              Cancelar
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default CreateAppointment;