// src/pages/procuration/EditProcurationModal.tsx
import React, { useEffect, useState } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  TimePicker,
  InputNumber,
  message,
  Row,
  Col,
  Switch,
  Space,
} from 'antd';
import dayjs from 'dayjs';
import { updateProcuration } from '../../api/procuration';
import type {
  Procuration,
  Client,
  Entity,
  Recurrence,
  UpdateProcurationDto,
} from '../../types/procuration.types';

const { TextArea } = Input;

interface EditProcurationModalProps {
  visible: boolean;
  procuration: Procuration | null;
  clients: Client[];
  entities: Entity[];
  recurrences: Recurrence[];
  onClose: () => void;
  onSuccess: () => void;
}

const EditProcurationModal: React.FC<EditProcurationModalProps> = ({
  visible,
  procuration,
  clients,
  entities,
  recurrences,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [hasLimitHour, setHasLimitHour] = useState(false);

  useEffect(() => {
    if (visible && procuration) {
      setHasLimitHour(!!procuration.limit_hour);
      form.setFieldsValue({
        client: procuration.client?.id,
        entity: procuration.entity?.id,
        description: procuration.description,
        documents: procuration.documents,
        nt_number: procuration.nt_number,
        priority: procuration.priority,
        limit_date: procuration.limit_date ? dayjs(procuration.limit_date) : null,
        limit_hour: procuration.limit_hour ? dayjs(procuration.limit_hour, 'HH:mm') : null,
      });
    }
  }, [visible, procuration, form]);

  const handleSubmit = async (values: any) => {
    if (!procuration) return;

    setLoading(true);
    try {
      const updateData: UpdateProcurationDto = {
        client: values.client,
        entity: values.entity,
        description: values.description,
        documents: values.documents,
        nt_number: values.nt_number,
        priority: values.priority,
        limit_date: values.limit_date ? values.limit_date.format('YYYY-MM-DD') : undefined,
        limit_hour: hasLimitHour && values.limit_hour
          ? values.limit_hour.format('HH:mm')
          : undefined,
      };

      await updateProcuration(procuration.id, updateData);
      message.success('Procuracion actualizada con exito');
      onSuccess();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Error al actualizar');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setHasLimitHour(false);
    onClose();
  };

  return (
    <Modal
      title={`Editar Procuracion #${procuration?.id}`}
      open={visible}
      onOk={() => form.submit()}
      onCancel={handleCancel}
      okText="Guardar"
      cancelText="Cancelar"
      confirmLoading={loading}
      width={700}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              label="Cliente"
              name="client"
              rules={[{ required: true, message: 'Seleccione un cliente' }]}
            >
              <Select
                placeholder="Seleccionar cliente"
                showSearch
                optionFilterProp="label"
                options={clients.map((c) => ({
                  value: c.id,
                  label: `${c.code} - ${c.name}`,
                }))}
              />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item
              label="Entidad"
              name="entity"
              rules={[{ required: true, message: 'Seleccione una entidad' }]}
            >
              <Select
                placeholder="Seleccionar entidad"
                showSearch
                optionFilterProp="label"
                options={entities.map((e) => ({
                  value: e.id,
                  label: e.name,
                }))}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              label="Documentos Entregados"
              name="documents"
              rules={[{ required: true, message: 'Ingrese los documentos' }]}
            >
              <Input placeholder="Documentos entregados" />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item label="Numero NT" name="nt_number">
              <InputNumber
                placeholder="Numero de tramite"
                style={{ width: '100%' }}
                min={0}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          label="Descripcion"
          name="description"
          rules={[{ required: true, message: 'Ingrese una descripcion' }]}
        >
          <TextArea rows={3} placeholder="Descripcion del requerimiento" />
        </Form.Item>

        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Form.Item
              label="Prioridad"
              name="priority"
              rules={[{ required: true, message: 'Seleccione una prioridad' }]}
            >
              <Select
                options={[
                  { value: 1, label: 'A - Urgente' },
                  { value: 2, label: 'B - Media' },
                  { value: 3, label: 'C - Baja' },
                ]}
              />
            </Form.Item>
          </Col>

          <Col xs={24} md={8}>
            <Form.Item label="Fecha Limite" name="limit_date">
              <DatePicker
                style={{ width: '100%' }}
                format="DD/MM/YYYY"
                placeholder="Seleccionar fecha"
              />
            </Form.Item>
          </Col>

          <Col xs={24} md={8}>
            <Form.Item label="Hora Limite">
              <Space>
                <Switch
                  checked={hasLimitHour}
                  onChange={setHasLimitHour}
                />
                {hasLimitHour && (
                  <Form.Item name="limit_hour" noStyle>
                    <TimePicker format="HH:mm" placeholder="Hora" />
                  </Form.Item>
                )}
              </Space>
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};

export default EditProcurationModal;
