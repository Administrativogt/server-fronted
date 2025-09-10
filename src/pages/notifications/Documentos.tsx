import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Form,
  Input,
  message,
  Modal,
  Row,
  Col,
  Table,
  Select,
  Space,
} from 'antd';
import dayjs from 'dayjs';

import {
  fetchPendingDocuments,
  createDocument,
  updateDocument,
  deleteDocument,
  type DocumentDto,
  applyActionToDocuments, // para Aceptar/Rechazar/Seleccionar (actions)
  deliverDocuments,       // ✅ para Entregar/Re-entregar (envía correo)
} from '../../api/documents';

import { fetchUsers, fullName, type UserLite } from '../../api/users';
import usePermissions from '../../hooks/usePermissions';

const documentTypes = ['Sobre', 'Folder', 'Cheque', 'Revista'];
const lugares = [
  { label: 'DIAGO 6', value: 1 },
  { label: 'Las Margaritas', value: 2 },
];

type RowType = {
  key: number;
  fecha: string;
  entregadoPor: string;
  recibidoPor: string;
  tipoDocumento: string;
  cantidad: number;
  enviarA: string;
  raw: DocumentDto;
};

const Documentos: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<RowType[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [users, setUsers] = useState<UserLite[]>([]);
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [stateFilter, setStateFilter] = useState<'pending' | 'delivered' | 'toDeliver'>('pending');
  const [page, setPage] = useState(1);

  // Modales
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; id?: number }>({ open: false });
  const [deliverOpen, setDeliverOpen] = useState(false); // ✅ modal de entrega

  // Forms
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [deliverForm] = Form.useForm(); // ✅ form de entrega

  const permissions = usePermissions();

  const load = async () => {
    setLoading(true);
    try {
      const [docs, us] = await Promise.all([fetchPendingDocuments(), fetchUsers()]);
      setUsers(us);
      setRows(
        docs.map((d) => ({
          key: d.id,
          fecha: d.receptionDatetime ? dayjs(d.receptionDatetime).format('DD/MM/YYYY') : '',
          entregadoPor: d.documentDeliverBy ?? '-',
          recibidoPor: d.receivedBy ? fullName(d.receivedBy) : '-',
          tipoDocumento: d.documentType,
          cantidad: d.amount,
          enviarA: d.submitTo,
          raw: d,
        }))
      );
    } catch (e) {
      console.error(e);
      message.error('Error al cargar documentos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filteredRows = useMemo(() => {
    return rows
      .filter((r) => {
        if (stateFilter === 'pending') return r.raw.state === 1;
        if (stateFilter === 'delivered') return [2, 4, 5].includes(r.raw.state);
        return true;
      })
      .filter((r) => {
        const matchesText = filters.text
          ? Object.values(r).some((val) =>
              typeof val === 'string' && val.toLowerCase().includes(filters.text.toLowerCase())
            )
          : true;
        return matchesText;
      });
  }, [rows, stateFilter, filters]);

  const columns = [
    { title: 'Fecha', dataIndex: 'fecha' },
    { title: 'Doc. entregado por', dataIndex: 'entregadoPor' },
    { title: 'Recibido por', dataIndex: 'recibidoPor' },
    { title: 'Tipo documento', dataIndex: 'tipoDocumento' },
    { title: 'Cant', dataIndex: 'cantidad' },
    { title: 'Enviar a', dataIndex: 'enviarA' },
    {
      title: 'Opciones',
      key: 'opciones',
      render: (_: any, record: RowType) => (
        <Space>
          {permissions.edit && (
            <Button type="primary" onClick={() => openEdit(record)}>
              Editar
            </Button>
          )}
          {permissions.delete && (
            <Button danger onClick={() => setDeleteModal({ open: true, id: record.key })}>
              Eliminar
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const openEdit = (row: RowType) => {
    const doc = row.raw;

    editForm.setFieldsValue({
      id: doc.id,
      documentDeliverBy: doc.documentDeliverBy ?? undefined,
      documentType: doc.documentType,
      amount: doc.amount,
      submitTo: doc.submitTo,
      receivedBy: (doc as any).receivedBy?.id ?? undefined,        // ✅ id numérico
      creationPlace: (doc as any).creationPlace?.id ?? undefined,  // ✅ id numérico
      deliverTo: doc.deliverTo,
      observations: doc.observations,
    });

    setEditOpen(true);
  };

  const submitCreate = async () => {
    try {
      const values = await form.validateFields();
      await createDocument(values);
      message.success('Documento creado');
      setCreateOpen(false);
      form.resetFields();
      load();
    } catch (e) {
      console.error(e);
      message.error('Error al crear');
    }
  };

  const submitEdit = async () => {
    try {
      const values = await editForm.validateFields();
      const { id, ...payload } = values; // ❗️ Elimina id antes del update
      await updateDocument(id, payload);
      message.success('Documento actualizado');
      setEditOpen(false);
      load();
    } catch (e) {
      console.error(e);
      message.error('Error al actualizar');
    }
  };

  const confirmDelete = async () => {
    try {
      await deleteDocument(deleteModal.id!);
      message.success('Documento eliminado');
      setDeleteModal({ open: false });
      load();
    } catch (e) {
      message.error('Error al eliminar');
    }
  };

  // ✅ Abrir modal de entrega (NO llamar /documents/actions)
  const openDeliverModal = () => {
    if (!selectedRowKeys.length) return;
    setDeliverOpen(true);
    // valores por defecto
    deliverForm.setFieldsValue({ action: 1, observations: '' });
  };

  // ✅ Entregar/Re-entregar usando /documents/deliver/:action → envía correo
  const submitDeliver = async () => {
    try {
      const values = await deliverForm.validateFields();
      const action = values.action as 1 | 2; // 1=entregar, 2=re-entregar
      const deliverTo = String(values.deliverTo);
      const observations = values.observations || undefined;

      await deliverDocuments({
        ids: selectedRowKeys as number[],
        action,
        deliverTo,
        observations,
      });

      message.success(action === 1 ? 'Entregado y correo enviado' : 'Re-entregado y correo enviado');
      setDeliverOpen(false);
      deliverForm.resetFields();
      setSelectedRowKeys([]);
      load();
    } catch (e) {
      console.error(e);
      message.error('Error al entregar/re-entregar');
    }
  };

  return (
    <Card title="📄 Documentos">
      <Space style={{ marginBottom: 16 }}>
        <Button
          type={stateFilter === 'pending' ? 'primary' : 'default'}
          onClick={() => {
            setStateFilter('pending');
            setPage(1);
          }}
        >
          Pendientes
        </Button>
        <Button
          type={stateFilter === 'delivered' ? 'primary' : 'default'}
          onClick={() => {
            setStateFilter('delivered');
            setPage(1);
          }}
        >
          Entregados
        </Button>
        <Button
          type={stateFilter === 'toDeliver' ? 'primary' : 'default'}
          onClick={openDeliverModal}
          disabled={!selectedRowKeys.length}
        >
          Entregar ({selectedRowKeys.length})
        </Button>
        <Button type="dashed" onClick={() => setCreateOpen(true)}>
          Crear documento
        </Button>
        <Input.Search
          allowClear
          placeholder="Buscar..."
          onChange={(e) => setFilters({ ...filters, text: e.target.value })}
          style={{ width: 220 }}
        />
      </Space>

      <Table
        rowSelection={{
          selectedRowKeys,
          onChange: setSelectedRowKeys,
        }}
        columns={columns}
        dataSource={filteredRows}
        loading={loading}
        rowKey="key"
        pagination={{ current: page, pageSize: 10, onChange: p => setPage(p) }}
        onChange={() => setPage(1)}
        size="middle"
      />

      {/* 🧾 Modal: Crear */}
      <Modal open={createOpen} title="Crear documento" onCancel={() => setCreateOpen(false)} onOk={submitCreate}>
        <DocumentoForm form={form} users={users} />
      </Modal>

      {/* ✏️ Modal: Editar */}
      <Modal open={editOpen} title="Editar documento" onCancel={() => setEditOpen(false)} onOk={submitEdit}>
        <DocumentoForm form={editForm} users={users} isEdit />
      </Modal>

      {/* ✉️ Modal: Entregar / Re-entregar (envía correo) */}
      <Modal
        open={deliverOpen}
        title="Entregar documentos"
        onCancel={() => setDeliverOpen(false)}
        onOk={submitDeliver}
        okText="Enviar constancia"
      >
        <Form form={deliverForm} layout="vertical" initialValues={{ action: 1 }}>
          <Form.Item
            name="action"
            label="Acción"
            rules={[{ required: true }]}
            tooltip="1 = Entregar, 2 = Re-entregar"
          >
            <Select
              options={[
                { value: 1, label: 'Entregar' },
                { value: 2, label: 'Re-entregar' },
              ]}
            />
          </Form.Item>

          <Form.Item
            name="deliverTo"
            label="Entregar a"
            rules={[{ required: true, message: 'Selecciona destinatario' }]}
            tooltip="Puede ser ID de usuario (numérico) o texto (p. ej., Mensajería externa)"
          >
            <Select
              showSearch
              placeholder="Selecciona usuario o departamento"
              options={[
                { value: 'Recepción', label: 'Recepción' },
                { value: 'Administración', label: 'Administración' },
                { value: 'Contabilidad', label: 'Contabilidad' },
                { value: 'Gerencia', label: 'Gerencia' },
                ...users.map(u => ({ value: String(u.id), label: fullName(u) })),
              ]}
            />
          </Form.Item>

          <Form.Item name="observations" label="Observaciones">
            <Input.TextArea rows={3} placeholder="Opcional" />
          </Form.Item>

          <div style={{ fontSize: 12, color: '#888' }}>
            Se enviará un correo a los destinatarios configurados con botones para confirmar/rechazar.
          </div>
        </Form>
      </Modal>

      {/* 🗑️ Modal: Eliminar */}
      <Modal
        open={deleteModal.open}
        title="¿Eliminar documento?"
        onCancel={() => setDeleteModal({ open: false })}
        onOk={confirmDelete}
        okText="Eliminar"
        okType="danger"
      >
        <p>Esta acción no se puede deshacer.</p>
      </Modal>
    </Card>
  );
};

export default Documentos;

// 🧩 Formulario reutilizable
const DocumentoForm: React.FC<{
  form: any;
  users: UserLite[];
  isEdit?: boolean;
}> = ({ form, users, isEdit }) => {
  return (
    <Form layout="vertical" form={form}>
      {isEdit && (
        <Form.Item name="id" noStyle>
          <Input type="hidden" />
        </Form.Item>
      )}
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item name="documentDeliverBy" label="Entregado por" rules={[{ required: true }]}>
            <Select
              showSearch
              options={users.map(u => ({ value: String(u.id), label: fullName(u) }))}
              placeholder="Selecciona usuario"
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="documentType" label="Tipo de documento" rules={[{ required: true }]}>
            <Select options={documentTypes.map(t => ({ value: t, label: t }))} />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item name="amount" label="Cantidad" rules={[{ required: true }]}>
            <Input type="number" min={1} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="submitTo" label="Para entregar a" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item name="receivedBy" label="Recibido por" rules={[{ required: true }]}>
            <Select
              options={users.map(u => ({ value: u.id, label: fullName(u) }))}
              placeholder="Selecciona usuario"
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="creationPlace" label="Lugar" rules={[{ required: true }]}>
            <Select options={lugares} />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={24}>
          <Form.Item
            name="deliverTo"
            label="Entregar a"
            rules={[{ required: true, message: 'Este campo es obligatorio' }]}
          >
            <Select
              showSearch
              placeholder="Selecciona usuario o departamento"
              options={[
                { value: 'Recepción', label: 'Recepción' },
                { value: 'Administración', label: 'Administración' },
                { value: 'Contabilidad', label: 'Contabilidad' },
                { value: 'Gerencia', label: 'Gerencia' },
                ...users.map(u => ({ value: String(u.id), label: fullName(u) })),
              ]}
            />
          </Form.Item>
        </Col>
      </Row>
    </Form>
  );
};
