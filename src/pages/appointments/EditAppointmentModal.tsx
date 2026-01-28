// src/pages/appointments/EditAppointmentModal.tsx
import React, { useEffect } from 'react';
import { Modal, Form, Input, DatePicker, message, Row, Col, Divider } from 'antd';
import dayjs from 'dayjs';
import { updateAppointment } from '../../api/appointments';
import type { Appointment, UpdateAppointmentDto } from '../../types/appointment.types';

const { TextArea } = Input;

interface EditAppointmentModalProps {
  visible: boolean;
  appointment: Appointment | null;
  onClose: () => void;
  onSuccess: () => void;
}

const EditAppointmentModal: React.FC<EditAppointmentModalProps> = ({
  visible,
  appointment,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (visible && appointment) {
      form.setFieldsValue({
        deedId: appointment.deedId,
        startDate: dayjs(appointment.startDate),
        finishDate: dayjs(appointment.finishDate),
        register: appointment.register,
        folio: appointment.folio,
        book: appointment.book,
        representative: appointment.representative,
        position: appointment.position,
        clientEmail: appointment.clientEmail,
      });
    }
  }, [visible, appointment, form]);

  const handleSubmit = async (values: any) => {
    if (!appointment) return;

    try {
      const updateData: UpdateAppointmentDto = {
        deedId: values.deedId,
        startDate: values.startDate.format('YYYY-MM-DD'),
        finishDate: values.finishDate.format('YYYY-MM-DD'),
        register: values.register,
        folio: values.folio,
        book: values.book,
        representative: values.representative,
        position: values.position,
        clientEmail: values.clientEmail,
      };

      await updateAppointment(appointment.id, updateData);

      message.success('Acta actualizada con éxito');
      form.resetFields();
      onSuccess();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Error al actualizar acta');
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      title="Editar Acta de Nombramiento"
      open={visible}
      onOk={() => form.submit()}
      onCancel={handleCancel}
      width={800}
      okText="Guardar"
      cancelText="Cancelar"
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="Identificación del Acta"
              name="deedId"
              rules={[{ required: true, message: 'Campo requerido' }]}
            >
              <Input />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item
              label="Representante Legal"
              name="representative"
              rules={[{ required: true, message: 'Campo requerido' }]}
            >
              <Input />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item
              label="Fecha que se Otorgó"
              name="startDate"
              rules={[{ required: true, message: 'Campo requerido' }]}
            >
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item
              label="Fecha que Vence"
              name="finishDate"
              rules={[{ required: true, message: 'Campo requerido' }]}
            >
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
          </Col>
        </Row>

        <Divider>Datos Registrales</Divider>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item label="Registro" name="register">
              <Input />
            </Form.Item>
          </Col>

          <Col span={8}>
            <Form.Item label="Folio" name="folio">
              <Input />
            </Form.Item>
          </Col>

          <Col span={8}>
            <Form.Item label="Libro" name="book">
              <Input />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="Cargo"
              name="position"
              rules={[{ required: true, message: 'Campo requerido' }]}
            >
              <Input />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item
              label="Correo del Cliente"
              name="clientEmail"
              rules={[{ required: true, message: 'Campo requerido' }]}
            >
              <TextArea rows={2} />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};

export default EditAppointmentModal;