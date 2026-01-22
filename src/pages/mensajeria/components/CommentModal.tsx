// src/pages/mensajeria/components/CommentModal.tsx
import React, { useState, useEffect } from 'react';
import { Modal, Input, List, message, Button, Space } from 'antd';
import { createComentario, getComentariosByEncargo, deleteComentario } from '../../../api/comentarios';
import type { Comentario } from '../../../types/comentario';
import useAuthStore from '../../../auth/useAuthStore';

const { TextArea } = Input;

interface CommentModalProps {
  open: boolean;
  encargoId: number;
  onClose: () => void;
}

const CommentModal: React.FC<CommentModalProps> = ({ open, encargoId, onClose }) => {
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [newComment, setNewComment] = useState('');
  const userId = useAuthStore((state) => state.userId);

  useEffect(() => {
    if (open) {
      // ✅ IIFE: Función autoejecutada dentro del useEffect
      (async () => {
        try {
          const res = await getComentariosByEncargo(encargoId);
          setComentarios(res.data);
        } catch {
          message.error('Error al cargar comentarios');
        }
      })();
    }
  }, [open, encargoId]); // ✅ Solo dependencias reales

  const handleOk = async () => {
    if (!newComment.trim()) {
      message.warning('El comentario no puede estar vacío');
      return;
    }
    try {
      await createComentario(encargoId, newComment);
      message.success('Comentario agregado');
      setNewComment('');
      // Recargar
      const res = await getComentariosByEncargo(encargoId);
      setComentarios(res.data);
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Error al guardar');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteComentario(id);
      message.success('Comentario eliminado');
      const res = await getComentariosByEncargo(encargoId);
      setComentarios(res.data);
    } catch {
      message.error('No puedes eliminar este comentario');
    }
  };

  return (
    <Modal
      title="Comentarios"
      open={open}
      onCancel={onClose}
      width={600}
      footer={null}
    >
      <List
        dataSource={comentarios}
        renderItem={(item) => (
          <List.Item
            actions={[
              userId === item.user_id && (
                <Button
                  type="link"
                  danger
                  size="small"
                  onClick={() => handleDelete(item.id)}
                >
                  Eliminar
                </Button>
              ),
            ]}
          >
            <List.Item.Meta
              description={
                <>
                  <div>{item.text}</div>
                  <small style={{ color: '#999' }}>
                    {item.user_nombre || 'Usuario'} • {new Date(item.created_at).toLocaleString()}
                  </small>
                </>
              }
            />
          </List.Item>
        )}
        locale={{ emptyText: 'Sin comentarios' }}
      />

      <div style={{ marginTop: 16 }}>
        <TextArea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Escribe un comentario..."
          rows={3}
        />
        <Space style={{ marginTop: 8, float: 'right' }}>
          <Button onClick={onClose}>Cancelar</Button>
          <Button type="primary" onClick={handleOk}>
            Agregar
          </Button>
        </Space>
      </div>
    </Modal>
  );
};

export default CommentModal;