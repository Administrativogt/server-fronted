import { useEffect, useMemo, useState } from 'react';
import { Button, Card, Empty, message, Skeleton, Space, Typography } from 'antd';
import { DownloadOutlined, FilePdfOutlined, FileTextOutlined } from '@ant-design/icons';
import {
  fetchPublicInduction,
  fetchPublicInductionFileUrl,
  type InductionItem,
} from '../../api/induction';

const { Title, Paragraph, Text } = Typography;

/**
 * Página PÚBLICA de inducción (administrativogt.com/induccion).
 * No requiere sesión: solo muestra el contenido activo publicado desde el
 * dashboard (Inducción → contenido público).
 */
function InduccionPublic() {
  const [items, setItems] = useState<InductionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<number | null>(null);

  useEffect(() => {
    fetchPublicInduction()
      .then(setItems)
      .catch(() => message.error('No se pudo cargar la información'))
      .finally(() => setLoading(false));
  }, []);

  const sections = useMemo(() => {
    const map = new Map<string, InductionItem[]>();
    for (const item of items) {
      const key = item.section?.trim() || 'Información general';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return Array.from(map.entries());
  }, [items]);

  const handleDownload = async (item: InductionItem) => {
    setDownloading(item.id);
    try {
      const url = await fetchPublicInductionFileUrl(item.id);
      window.open(url, '_blank');
    } catch {
      message.error('No se pudo abrir el documento');
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f4f6fb' }}>
      {/* Encabezado institucional (mismos colores que los correos) */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1f3864 0%, #5A2D81 100%)',
          padding: '48px 16px 40px',
          textAlign: 'center',
        }}
      >
        <Title level={2} style={{ color: '#ffffff', marginBottom: 4 }}>
          Consortium Legal
        </Title>
        <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 18 }}>
          Bienvenida e inducción
        </Text>
      </div>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 16px 64px' }}>
        {loading ? (
          <Card>
            <Skeleton active paragraph={{ rows: 6 }} />
          </Card>
        ) : sections.length === 0 ? (
          <Card>
            <Empty description="Aún no hay contenido publicado" />
          </Card>
        ) : (
          sections.map(([section, sectionItems]) => (
            <div key={section} style={{ marginBottom: 32 }}>
              <Title level={4} style={{ color: '#1f3864', marginBottom: 16 }}>
                {section}
              </Title>
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                {sectionItems.map((item) =>
                  item.item_type === 'text' ? (
                    <Card key={item.id} bordered={false} style={{ borderRadius: 12 }}>
                      <Title level={5} style={{ marginTop: 0 }}>
                        <FileTextOutlined style={{ color: '#5A2D81', marginRight: 8 }} />
                        {item.title}
                      </Title>
                      <Paragraph style={{ whiteSpace: 'pre-wrap', marginBottom: 0 }}>
                        {item.body}
                      </Paragraph>
                    </Card>
                  ) : (
                    <Card
                      key={item.id}
                      bordered={false}
                      style={{ borderRadius: 12 }}
                      bodyStyle={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 16,
                        flexWrap: 'wrap',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 220 }}>
                        <Text strong>
                          <FilePdfOutlined style={{ color: '#1f3864', marginRight: 8 }} />
                          {item.title}
                        </Text>
                        {item.body ? (
                          <Paragraph type="secondary" style={{ margin: '4px 0 0' }}>
                            {item.body}
                          </Paragraph>
                        ) : null}
                      </div>
                      {item.has_file ? (
                        <Button
                          type="primary"
                          icon={<DownloadOutlined />}
                          loading={downloading === item.id}
                          onClick={() => handleDownload(item)}
                        >
                          Descargar
                        </Button>
                      ) : null}
                    </Card>
                  ),
                )}
              </Space>
            </div>
          ))
        )}

        <div style={{ textAlign: 'center', marginTop: 48 }}>
          <Text type="secondary">© {new Date().getFullYear()} Consortium Legal</Text>
        </div>
      </div>
    </div>
  );
}

export default InduccionPublic;
