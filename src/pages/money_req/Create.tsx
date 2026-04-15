// src/pages/money_req/Create.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  message,
  Typography,
} from 'antd';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { getTeams, getPracticeAreas, type Team, type PracticeArea } from '../../api/teams';
import { fetchUsers, type UserLite, fullName } from '../../api/users';
import type { MoneyRequirement } from '../../api/moneyRequirements';
import { createMoneyRequirement, sendAuthorizationEmail } from '../../api/moneyRequirements';

const { Title } = Typography;

const formatAmountInput = (value?: string | number): string => {
  if (value === undefined || value === null || value === '') return '';
  const raw = String(value);
  const [integerPart, decimalPart] = raw.split('.');
  const withThousands = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return decimalPart !== undefined ? `${withThousands}.${decimalPart}` : withThousands;
};

interface FormValues {
  payableTo: string;
  workNoteNumber?: string;
  amount: number;
  currency: string;
  description?: string;
  date?: dayjs.Dayjs;
  teamId: number;
  areaIds: number[];
  responsibleForAuthorizingId: number;
}

const CreateMoneyRequirement: React.FC = () => {
  const [form] = Form.useForm<FormValues>();
  const [teams, setTeams] = useState<Team[]>([]);
  const [areas, setAreas] = useState<PracticeArea[]>([]);
  const [users, setUsers] = useState<UserLite[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const loadData = async () => {
      try {
        const [t, a, u] = await Promise.all([getTeams(), getPracticeAreas(), fetchUsers()]);
        setTeams(t);
        setAreas(a);
        setUsers(u);
      } catch (err) {
        console.error('Error cargando datos', err);
      }
    };
    loadData();
  }, []);

  // ⚙️ Opciones para el combo de autorizadores (con label string para filtrar)
  const userOptions = useMemo(
    () =>
      users.map((u) => ({
        value: u.id,
        label: `${fullName(u)}${u.email ? ` (${u.email})` : ''}`,
      })),
    [users],
  );

  /** Crear sin enviar correo */
  const handleCreate = async (values: FormValues) => {
    try {
      const payload: Partial<MoneyRequirement> = {
        payableTo: values.payableTo,
        workNoteNumber: values.workNoteNumber,
        amount: values.amount,
        currency: values.currency,
        description: values.description,
        date: values.date ? dayjs(values.date).format('YYYY-MM-DD') : undefined,
        teamId: values.teamId,
        areaIds: values.areaIds,
        responsibleForAuthorizingId: values.responsibleForAuthorizingId,
      };

      await createMoneyRequirement(payload);
      message.success('✅ Requerimiento creado correctamente');
      navigate('/dashboard/money-req');
    } catch (err) {
      console.error(err);
      message.error('❌ Error al crear el requerimiento');
    }
  };

  /** Crear y enviar correo */
  const handleCreateAndSend = async () => {
    try {
      const values = await form.validateFields();
      const payload: Partial<MoneyRequirement> = {
        payableTo: values.payableTo,
        workNoteNumber: values.workNoteNumber,
        amount: values.amount,
        currency: values.currency,
        description: values.description,
        date: values.date ? dayjs(values.date).format('YYYY-MM-DD') : undefined,
        teamId: values.teamId,
        areaIds: values.areaIds,
        responsibleForAuthorizingId: values.responsibleForAuthorizingId,
      };

      const created = await createMoneyRequirement(payload);

      if (created?.id && values.responsibleForAuthorizingId) {
        const user = users.find((u) => u.id === values.responsibleForAuthorizingId);
        if (user?.email) {
          await sendAuthorizationEmail(user.email, [created.id]);
          message.success('✅ Requerimiento creado y enviado para autorización');
        } else {
          message.warning('⚠️ El autorizador no tiene correo configurado');
        }
      }

      navigate('/dashboard/money-req');
    } catch (err) {
      console.error(err);
      message.error('❌ Error al crear o enviar el requerimiento');
    }
  };

  return (
    <Card>
      <Title level={4}>📝 Crear requerimiento de dinero</Title>
      <Form form={form} layout="vertical" onFinish={handleCreate}>
        <Form.Item label="Cheque a nombre de" name="payableTo" rules={[{ required: true }]}>
          <Input />
        </Form.Item>

        <Form.Item label="NT (Nota de trabajo)" name="workNoteNumber">
          <Input />
        </Form.Item>

        <Form.Item
          label="Monto"
          name="amount"
          rules={[{ required: true, message: 'Ingrese un monto válido' }]}
          extra="Formato sugerido: coma para miles y punto para decimales. Ejemplo: 1,000.00"
        >
          <InputNumber
            style={{ width: '100%' }}
            min={0}
            step={0.01}
            placeholder="Ejemplo: 1,000.00"
            formatter={(value) => formatAmountInput(value)}
            parser={(value) => {
              const normalized = (value ?? '').replace(/,/g, '').replace(/\s/g, '');
              const parsed = Number(normalized);
              return Number.isFinite(parsed) ? parsed : 0;
            }}
          />
        </Form.Item>

        <Form.Item label="Moneda" name="currency" rules={[{ required: true }]}>
          <Select>
            <Select.Option value="GTQ">Quetzales (Q)</Select.Option>
            <Select.Option value="USD">Dólares ($)</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item label="Fecha" name="date">
          <DatePicker style={{ width: '100%' }} format="DD-MM-YYYY" />
        </Form.Item>

        <Form.Item label="Descripción" name="description">
          <Input.TextArea rows={3} />
        </Form.Item>

        <Form.Item label="Equipo" name="teamId" rules={[{ required: true }]}>
          <Select placeholder="Seleccione un equipo" showSearch optionFilterProp="children">
            {teams.map((t) => (
              <Select.Option key={t.id} value={t.id}>
                {t.name}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item label="Área" name="areaIds" rules={[{ required: true }]}>
          <Select
            mode="multiple"
            placeholder="Seleccione una o más áreas"
            showSearch
            optionFilterProp="children"
          >
            {areas.map((a) => (
              <Select.Option key={a.id} value={a.id}>
                {a.name}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          label="Responsable de firmar"
          name="responsibleForAuthorizingId"
          rules={[{ required: true }]}
        >
          <Select
            showSearch
            placeholder="Seleccione un autorizador"
            options={userOptions}
            optionFilterProp="label"
            filterSort={(a, b) =>
              a.label.toLowerCase().localeCompare(b.label.toLowerCase())
            }
          />
        </Form.Item>

        <Form.Item>
          <Button type="default" htmlType="submit">
            Crear
          </Button>
          <Button type="primary" style={{ marginLeft: 8 }} onClick={handleCreateAndSend}>
            Crear y pedir autorización
          </Button>
          <Button style={{ marginLeft: 8 }} onClick={() => navigate('/dashboard/money-req')}>
            Cancelar
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default CreateMoneyRequirement;