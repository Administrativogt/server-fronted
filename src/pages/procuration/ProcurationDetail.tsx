// src/pages/procuration/ProcurationDetail.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Descriptions,
  Button,
  Space,
  Tag,
  message,
  Spin,
  Divider,
  Input,
  List,
  Avatar,
  Typography,
  Popconfirm,
  Row,
  Col,
  Alert,
} from 'antd';
import {
  ArrowLeftOutlined,
  SendOutlined,
  UserOutlined,
  CheckOutlined,
  CloseOutlined,
  PauseOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  getProcurationById,
  getCommentsByProcuration,
  createComment,
  updateProcuration,
} from '../../api/procuration';
import type { Procuration, Comment } from '../../types/procuration.types';
import {
  STATE_LABELS,
  STATE_COLORS,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
  ProcurationState,
} from '../../types/procuration.types';
import useAuthStore from '../../auth/useAuthStore';

const { TextArea } = Input;
const { Text, Title } = Typography;

// Comment state labels
const COMMENT_STATE_LABELS: Record<number, { text: string; color: string }> = {
  3: { text: 'Cancelacion', color: 'red' },
  4: { text: 'Suspension', color: 'gold' },
  5: { text: 'Justificacion de tardio', color: 'orange' },
  7: { text: 'Comentario', color: 'blue' },
};

const ProcurationDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const userId = useAuthStore((s) => s.userId);
  const tipoUsuario = useAuthStore((s) => s.tipo_usuario);

  // Data states
  const [procuration, setProcuration] = useState<Procuration | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);

  // Comment form
  const [newComment, setNewComment] = useState('');

  // Check if user is procurator
  const isProcurator = tipoUsuario === 5;
  const isAssignedProcurator = procuration?.procurator?.id === userId;
  const isApplicant = procuration?.applicant?.id === userId;

  // Fetch procuration details
  const fetchProcuration = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    try {
      const response = await getProcurationById(parseInt(id));
      setProcuration(response.data);
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Error al cargar procuracion');
      navigate('/dashboard/procuration');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  // Fetch comments
  const fetchComments = useCallback(async () => {
    if (!id) return;

    setLoadingComments(true);
    try {
      const response = await getCommentsByProcuration(parseInt(id));
      setComments(response.data);
    } catch (error: any) {
      console.error('Error loading comments:', error);
    } finally {
      setLoadingComments(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProcuration();
    fetchComments();
  }, [fetchProcuration, fetchComments]);

  // Handle send comment
  const handleSendComment = async () => {
    if (!newComment.trim() || !id) {
      message.warning('Ingrese un comentario');
      return;
    }

    setSubmittingComment(true);
    try {
      await createComment({
        procuration: parseInt(id),
        comment: newComment.trim(),
        state: 7, // Regular comment
        push_supported: 'true',
      });

      message.success('Comentario enviado');
      setNewComment('');
      fetchComments();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Error al enviar comentario');
    } finally {
      setSubmittingComment(false);
    }
  };

  // State transition handlers
  const handleAccept = async () => {
    if (!procuration) return;
    try {
      await updateProcuration(procuration.id, { state: ProcurationState.EN_PROCESO });
      message.success('Procuracion aceptada');
      fetchProcuration();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Error al aceptar');
    }
  };

  const handleFinalize = async () => {
    if (!procuration) return;
    try {
      await updateProcuration(procuration.id, {
        state: ProcurationState.FINALIZADO,
        finalized: new Date().toISOString(),
        user_finalized: userId || undefined,
      });
      message.success('Procuracion finalizada');
      fetchProcuration();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Error al finalizar');
    }
  };

  const handleReject = async () => {
    if (!procuration || !newComment.trim()) {
      message.warning('Debe agregar un comentario con la razon del rechazo');
      return;
    }

    try {
      // Create reject comment first
      await createComment({
        procuration: procuration.id,
        comment: newComment.trim(),
        state: 3, // Reject state
        push_supported: 'true',
        reject: 'true',
      });

      // Then update state
      await updateProcuration(procuration.id, { state: ProcurationState.RECHAZADO });
      message.success('Procuracion rechazada');
      setNewComment('');
      fetchProcuration();
      fetchComments();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Error al rechazar');
    }
  };

  const handleSuspend = async () => {
    if (!procuration || !newComment.trim()) {
      message.warning('Debe agregar un comentario con la razon de la suspension');
      return;
    }

    try {
      await createComment({
        procuration: procuration.id,
        comment: newComment.trim(),
        state: 4, // Suspend state
        push_supported: 'true',
        suspend: 'true',
      });

      await updateProcuration(procuration.id, { state: ProcurationState.EN_SUSPENSO });
      message.success('Procuracion suspendida');
      setNewComment('');
      fetchProcuration();
      fetchComments();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Error al suspender');
    }
  };

  const handleResume = async () => {
    if (!procuration) return;
    try {
      await updateProcuration(procuration.id, { state: ProcurationState.EN_PROCESO });
      message.success('Procuracion reanudada');
      fetchProcuration();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Error al reanudar');
    }
  };

  // Render action buttons based on state and role
  const renderActionButtons = () => {
    if (!procuration) return null;

    const actions = [];

    if (isProcurator && isAssignedProcurator) {
      // Accept (state = Solicitado)
      if (procuration.state === ProcurationState.SOLICITADO) {
        actions.push(
          <Popconfirm
            key="accept"
            title="Marcar como recibido?"
            onConfirm={handleAccept}
            okText="Si"
            cancelText="No"
          >
            <Button type="primary" icon={<CheckOutlined />}>
              Marcar Recibido
            </Button>
          </Popconfirm>
        );
      }

      // Finalize (state = En Proceso)
      if (procuration.state === ProcurationState.EN_PROCESO) {
        actions.push(
          <Popconfirm
            key="finalize"
            title="Finalizar procuracion?"
            onConfirm={handleFinalize}
            okText="Si"
            cancelText="No"
          >
            <Button type="primary" style={{ backgroundColor: '#52c41a' }} icon={<CheckOutlined />}>
              Finalizar
            </Button>
          </Popconfirm>
        );

        actions.push(
          <Button
            key="suspend"
            icon={<PauseOutlined />}
            onClick={handleSuspend}
          >
            Suspender
          </Button>
        );

        actions.push(
          <Button
            key="reject"
            danger
            icon={<CloseOutlined />}
            onClick={handleReject}
          >
            Rechazar
          </Button>
        );
      }

      // Resume (state = En Suspenso)
      if (procuration.state === ProcurationState.EN_SUSPENSO) {
        actions.push(
          <Popconfirm
            key="resume"
            title="Reanudar procuracion?"
            onConfirm={handleResume}
            okText="Si"
            cancelText="No"
          >
            <Button type="primary" icon={<PlayCircleOutlined />}>
              Reanudar
            </Button>
          </Popconfirm>
        );
      }
    }

    return actions.length > 0 ? <Space wrap>{actions}</Space> : null;
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!procuration) {
    return (
      <Card>
        <Alert
          message="No se encontro la procuracion"
          type="error"
          action={
            <Button onClick={() => navigate('/dashboard/procuration')}>Volver</Button>
          }
        />
      </Card>
    );
  }

  return (
    <div>
      {/* Header */}
      <Card
        title={
          <Space>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/dashboard/procuration')}
            />
            <span>Detalle de Procuracion #{procuration.id}</span>
          </Space>
        }
        extra={
          <Space>
            <Tag color={STATE_COLORS[procuration.state]} style={{ fontSize: 14, padding: '4px 12px' }}>
              {STATE_LABELS[procuration.state]}
            </Tag>
            <Tag color={PRIORITY_COLORS[procuration.priority]}>
              {PRIORITY_LABELS[procuration.priority]}
            </Tag>
          </Space>
        }
      >
        <Descriptions bordered column={{ xs: 1, sm: 2, md: 3 }}>
          <Descriptions.Item label="ID">{procuration.id}</Descriptions.Item>
          <Descriptions.Item label="Fecha Creacion">
            {dayjs(procuration.create_date).format('DD/MM/YYYY HH:mm')}
          </Descriptions.Item>
          <Descriptions.Item label="Fecha Requerimiento">
            {dayjs(procuration.date).format('DD/MM/YYYY')}
          </Descriptions.Item>

          <Descriptions.Item label="Cliente" span={2}>
            {procuration.client?.code} - {procuration.client?.name}
          </Descriptions.Item>
          <Descriptions.Item label="Entidad">
            {procuration.entity?.name}
          </Descriptions.Item>

          <Descriptions.Item label="Solicitante">
            {procuration.applicant?.username}
          </Descriptions.Item>
          <Descriptions.Item label="Procurador">
            {procuration.procurator?.username || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Numero NT">
            {procuration.nt_number || '-'}
          </Descriptions.Item>

          <Descriptions.Item label="Fecha Limite">
            {procuration.limit_date
              ? dayjs(procuration.limit_date).format('DD/MM/YYYY')
              : '-'}
            {procuration.limit_hour && ` ${procuration.limit_hour}`}
          </Descriptions.Item>
          <Descriptions.Item label="Recurrencia">
            {procuration.recurrence?.lapse || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Prioridad">
            <Tag color={PRIORITY_COLORS[procuration.priority]}>
              {PRIORITY_LABELS[procuration.priority]}
            </Tag>
          </Descriptions.Item>

          <Descriptions.Item label="Documentos Entregados" span={3}>
            {procuration.documents}
          </Descriptions.Item>

          <Descriptions.Item label="Descripcion" span={3}>
            {procuration.description}
          </Descriptions.Item>

          {procuration.finalized && (
            <>
              <Descriptions.Item label="Fecha Finalizacion">
                {dayjs(procuration.finalized).format('DD/MM/YYYY HH:mm')}
              </Descriptions.Item>
              <Descriptions.Item label="Finalizado Por">
                {procuration.user_finalized?.username || '-'}
              </Descriptions.Item>
            </>
          )}
        </Descriptions>

        {/* Action Buttons */}
        <div style={{ marginTop: 16 }}>
          {renderActionButtons()}
        </div>
      </Card>

      {/* Comments Section */}
      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card
            title={<Title level={5}>Comentarios</Title>}
            style={{ height: '100%' }}
          >
            {/* Comment List */}
            <div
              style={{
                maxHeight: 400,
                overflowY: 'auto',
                marginBottom: 16,
                padding: '0 8px',
              }}
            >
              <Spin spinning={loadingComments}>
                <List
                  dataSource={comments}
                  locale={{ emptyText: 'No hay comentarios' }}
                  renderItem={(comment) => {
                    const isOwnComment = comment.user?.id === userId;
                    const stateInfo = COMMENT_STATE_LABELS[comment.state] || {
                      text: 'Comentario',
                      color: 'default',
                    };

                    return (
                      <List.Item
                        style={{
                          justifyContent: isOwnComment ? 'flex-end' : 'flex-start',
                          border: 'none',
                          padding: '8px 0',
                        }}
                      >
                        <div
                          style={{
                            maxWidth: '70%',
                            display: 'flex',
                            flexDirection: isOwnComment ? 'row-reverse' : 'row',
                            alignItems: 'flex-start',
                            gap: 8,
                          }}
                        >
                          <Avatar
                            icon={<UserOutlined />}
                            style={{
                              backgroundColor: isOwnComment ? '#1890ff' : '#87d068',
                            }}
                          />
                          <div
                            style={{
                              backgroundColor: isOwnComment ? '#e6f7ff' : '#f0f0f0',
                              padding: '8px 12px',
                              borderRadius: 8,
                              textAlign: isOwnComment ? 'right' : 'left',
                            }}
                          >
                            <div style={{ marginBottom: 4 }}>
                              <Text strong>{comment.user?.username}</Text>
                              {comment.state !== 7 && (
                                <Tag
                                  color={stateInfo.color}
                                  style={{ marginLeft: 8, fontSize: 10 }}
                                >
                                  {stateInfo.text}
                                </Tag>
                              )}
                            </div>
                            <div>{comment.comment}</div>
                            <div style={{ marginTop: 4 }}>
                              <Text type="secondary" style={{ fontSize: 11 }}>
                                {dayjs(comment.creation).format('DD/MM/YYYY HH:mm')}
                              </Text>
                            </div>
                          </div>
                        </div>
                      </List.Item>
                    );
                  }}
                />
              </Spin>
            </div>

            <Divider style={{ margin: '12px 0' }} />

            {/* Comment Input */}
            {(procuration.state !== ProcurationState.FINALIZADO &&
              procuration.state !== ProcurationState.RECHAZADO) && (
              <Space.Compact style={{ width: '100%' }}>
                <TextArea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Escribir comentario..."
                  autoSize={{ minRows: 2, maxRows: 4 }}
                  onPressEnter={(e) => {
                    if (e.ctrlKey) {
                      handleSendComment();
                    }
                  }}
                />
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  onClick={handleSendComment}
                  loading={submittingComment}
                  style={{ height: 'auto' }}
                >
                  Enviar
                </Button>
              </Space.Compact>
            )}

            {(procuration.state === ProcurationState.FINALIZADO ||
              procuration.state === ProcurationState.RECHAZADO) && (
              <Alert
                message="Esta procuracion esta cerrada y no acepta mas comentarios"
                type="info"
              />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ProcurationDetail;
