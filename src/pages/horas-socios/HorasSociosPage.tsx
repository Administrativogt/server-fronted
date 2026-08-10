import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Modal,
  Popconfirm,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  Upload,
  message,
} from 'antd';
import {
  DeleteOutlined,
  DownloadOutlined,
  EyeOutlined,
  FileExcelOutlined,
  MailOutlined,
  SendOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { Link } from 'react-router-dom';
import { horasSociosApi, minutosAHoras } from '../../api/horas-socios';
import type {
  EnvioResultado,
  FilaReporte,
  HorasDestinatario,
  HorasImportacion,
  ReporteHoras,
} from '../../types/horas-socios.types';

const { Title, Text } = Typography;

const fmtMoney = (v: number) =>
  v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const periodoLabel = (imp: HorasImportacion) =>
  `${imp.semestre === 1 ? '1er' : '2do'} semestre ${imp.anio}`;

const HorasSociosPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [sinEquipo, setSinEquipo] = useState<string[]>([]);

  const [importaciones, setImportaciones] = useState<HorasImportacion[]>([]);
  const [loadingImps, setLoadingImps] = useState(false);

  const [reporte, setReporte] = useState<ReporteHoras | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [tabSocio, setTabSocio] = useState('GENERAL');

  const [envioOpen, setEnvioOpen] = useState(false);
  const [destinatarios, setDestinatarios] = useState<HorasDestinatario[]>([]);
  const [sociosSel, setSociosSel] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [resultadoEnvio, setResultadoEnvio] = useState<EnvioResultado[] | null>(null);
  const [fueDryRun, setFueDryRun] = useState(false);

  const cargarImportaciones = async () => {
    setLoadingImps(true);
    try {
      const { data } = await horasSociosApi.getImportaciones();
      setImportaciones(data);
    } catch {
      message.error('No se pudieron cargar las importaciones');
    } finally {
      setLoadingImps(false);
    }
  };

  useEffect(() => {
    cargarImportaciones();
  }, []);

  const handleImportar = async () => {
    if (!file) return message.warning('Selecciona el TM-report (Excel)');
    setUploading(true);
    setSinEquipo([]);
    try {
      const { data } = await horasSociosApi.importar(file);
      message.success(
        `Importados ${data.importacion.total_registros} registros (${periodoLabel(data.importacion)})`,
      );
      setSinEquipo(data.usuariosSinEquipo);
      setFile(null);
      await cargarImportaciones();
      await verPreview(data.importacion.id);
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Error al importar el archivo');
    } finally {
      setUploading(false);
    }
  };

  const verPreview = async (id: number) => {
    setLoadingPreview(true);
    try {
      const { data } = await horasSociosApi.getPreview(id);
      setReporte(data);
      setTabSocio('GENERAL');
      setSinEquipo(data.usuariosSinEquipo);
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Error al calcular el reporte');
    } finally {
      setLoadingPreview(false);
    }
  };

  const abrirEnvio = async () => {
    if (!reporte) return;
    try {
      const { data } = await horasSociosApi.getDestinatarios();
      setDestinatarios(data.filter((d) => d.activo));
      const disponibles = reporte.socios.filter((s) =>
        data.some((d) => d.activo && d.socio_codigo === s),
      );
      setSociosSel(disponibles);
      setResultadoEnvio(null);
      setEnvioOpen(true);
    } catch {
      message.error('No se pudieron cargar los destinatarios');
    }
  };

  const ejecutarEnvio = async (dryRun: boolean) => {
    if (!reporte) return;
    if (sociosSel.length === 0) return message.warning('Selecciona al menos un socio');
    setEnviando(true);
    try {
      const { data } = await horasSociosApi.enviar(reporte.importacion.id, {
        socios: sociosSel,
        dryRun,
      });
      setResultadoEnvio(data.resultado);
      setFueDryRun(data.dryRun);
      if (!dryRun) message.success('Correos enviados');
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Error al enviar');
    } finally {
      setEnviando(false);
    }
  };

  const eliminarImportacion = async (id: number) => {
    try {
      await horasSociosApi.deleteImportacion(id);
      message.success('Importación eliminada');
      if (reporte?.importacion.id === id) setReporte(null);
      await cargarImportaciones();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Error al eliminar');
    }
  };

  // ── Tabla de importaciones ──
  const colsImportaciones: ColumnsType<HorasImportacion> = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    {
      title: 'Período',
      render: (_, r) => <Tag color="blue">{periodoLabel(r)}</Tag>,
    },
    {
      title: 'Datos',
      render: (_, r) => `${r.fecha_min} → ${r.fecha_max}`,
    },
    {
      title: 'Registros',
      dataIndex: 'total_registros',
      align: 'right',
      render: (v: number) => v.toLocaleString(),
    },
    { title: 'Archivo', dataIndex: 'archivo_nombre', ellipsis: true },
    { title: 'Importó', dataIndex: 'creado_por_nombre', width: 90 },
    {
      title: 'Fecha',
      dataIndex: 'fecha_importacion',
      render: (v: string) => new Date(v).toLocaleString('es-GT'),
    },
    {
      title: 'Acciones',
      width: 220,
      render: (_, r) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => verPreview(r.id)}>
            Ver
          </Button>
          <Button
            size="small"
            icon={<DownloadOutlined />}
            onClick={() =>
              horasSociosApi.descargarExcel(
                r.id,
                `Mapa_de_Horas_${periodoLabel(r).replace(/ /g, '_')}.xlsx`,
              )
            }
          >
            Excel
          </Button>
          <Popconfirm
            title="¿Eliminar esta importación y sus registros?"
            onConfirm={() => eliminarImportacion(r.id)}
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // ── Tabla del reporte (preview) ──
  const filasTab = useMemo(() => {
    if (!reporte) return [];
    return tabSocio === 'GENERAL'
      ? reporte.filas
      : reporte.filas.filter((f) => f.socio === tabSocio);
  }, [reporte, tabSocio]);

  const colsReporte: ColumnsType<FilaReporte> = useMemo(() => {
    if (!reporte) return [];
    const m = reporte.mesesNombres;
    const mesCols: ColumnsType<FilaReporte> = m.map((nombre, i) => ({
      title: nombre.slice(0, 3),
      align: 'right' as const,
      width: 70,
      render: (_: unknown, f: FilaReporte) => minutosAHoras(f.totalMes[i]),
    }));
    return [
      {
        title: 'Responsable',
        dataIndex: 'usuario',
        fixed: 'left',
        width: 190,
        sorter: (a, b) => a.usuario.localeCompare(b.usuario),
      },
      { title: 'Equipo', dataIndex: 'equipo', width: 140 },
      ...mesCols,
      {
        title: 'Total',
        align: 'right',
        width: 80,
        defaultSortOrder: 'descend',
        sorter: (a, b) => a.totalHoras - b.totalHoras,
        render: (_, f) => <b>{minutosAHoras(f.totalHoras)}</b>,
      },
      {
        title: 'Cobrables',
        align: 'right',
        width: 90,
        sorter: (a, b) => a.totalFact - b.totalFact,
        render: (_, f) => minutosAHoras(f.totalFact),
      },
      { title: 'Formación', align: 'right', width: 85, render: (_, f) => minutosAHoras(f.nfFormacion) },
      { title: 'Consortium', align: 'right', width: 90, render: (_, f) => minutosAHoras(f.nfConsortium) },
      { title: 'Cobro y Fact.', align: 'right', width: 95, render: (_, f) => minutosAHoras(f.nfCobro) },
      { title: 'Pro Bono', align: 'right', width: 80, render: (_, f) => minutosAHoras(f.nfProBono) },
      { title: 'Gestión Adm.', align: 'right', width: 95, render: (_, f) => minutosAHoras(f.nfGestion) },
      {
        title: 'No cobrables',
        align: 'right',
        width: 100,
        render: (_, f) => <b>{minutosAHoras(f.totalNoCobrables)}</b>,
      },
      {
        title: 'CNC',
        align: 'right',
        width: 80,
        render: (_, f) => <b>{minutosAHoras(f.cnc)}</b>,
      },
      { title: '$ Facturable', align: 'right', width: 105, render: (_, f) => fmtMoney(f.valorFacturable) },
      { title: '$ No fact.', align: 'right', width: 105, render: (_, f) => fmtMoney(f.valorNoFacturable) },
    ];
  }, [reporte]);

  const totalesTab = useMemo(() => {
    const t = {
      totalMes: [0, 0, 0, 0, 0, 0],
      totalHoras: 0,
      totalFact: 0,
      nfFormacion: 0,
      nfConsortium: 0,
      nfCobro: 0,
      nfProBono: 0,
      nfGestion: 0,
      totalNoCobrables: 0,
      cnc: 0,
      valorFacturable: 0,
      valorNoFacturable: 0,
    };
    for (const f of filasTab) {
      for (let i = 0; i < 6; i++) t.totalMes[i] += f.totalMes[i];
      t.totalHoras += f.totalHoras;
      t.totalFact += f.totalFact;
      t.nfFormacion += f.nfFormacion;
      t.nfConsortium += f.nfConsortium;
      t.nfCobro += f.nfCobro;
      t.nfProBono += f.nfProBono;
      t.nfGestion += f.nfGestion;
      t.totalNoCobrables += f.totalNoCobrables;
      t.cnc += f.cnc;
      t.valorFacturable += f.valorFacturable;
      t.valorNoFacturable += f.valorNoFacturable;
    }
    return t;
  }, [filasTab]);

  const colsEnvio: ColumnsType<EnvioResultado> = [
    { title: 'Socio', dataIndex: 'socio', width: 80 },
    { title: 'Destinatario', dataIndex: 'destinatario', ellipsis: true },
    { title: 'CC', dataIndex: 'cc', ellipsis: true },
    {
      title: 'Estado',
      dataIndex: 'estado',
      render: (v: string) => (
        <Tag color={v === 'ENVIADO' ? 'green' : v.startsWith('SIMULADO') ? 'blue' : 'red'}>
          {v}
        </Tag>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Title level={3}>
        <FileExcelOutlined /> Horas Socios — Mapa de Horas
      </Title>
      <Text type="secondary">
        Sube el export crudo de Time Manager (TM-report) del semestre; el sistema clasifica las
        horas, genera el Excel con el formato del Mapa de Horas y envía el correo a cada socio.
      </Text>

      <Card title="Importar TM-report" style={{ marginTop: 16 }}>
        <Space>
          <Upload
            beforeUpload={(f) => {
              setFile(f);
              return false;
            }}
            onRemove={() => setFile(null)}
            fileList={file ? [{ uid: '1', name: file.name }] : []}
            accept=".xlsx"
            maxCount={1}
          >
            <Button icon={<UploadOutlined />}>Seleccionar Excel</Button>
          </Upload>
          <Button type="primary" loading={uploading} onClick={handleImportar} disabled={!file}>
            Importar
          </Button>
        </Space>
        {sinEquipo.length > 0 && (
          <Alert
            style={{ marginTop: 12 }}
            type="warning"
            showIcon
            message={`${sinEquipo.length} usuario(s) sin equipo asignado — sus filas saldrán como "(SIN EQUIPO)" y no entran en ninguna hoja de socio`}
            description={
              <>
                {sinEquipo.join(', ')}
                <br />
                <Link to="/dashboard/horas-socios/catalogos">Asignarlos en Catálogos →</Link>
              </>
            }
          />
        )}
      </Card>

      <Card
        title="Importaciones"
        style={{ marginTop: 16 }}
        extra={<Button onClick={cargarImportaciones}>Actualizar</Button>}
      >
        <Table
          rowKey="id"
          size="small"
          loading={loadingImps}
          columns={colsImportaciones}
          dataSource={importaciones}
          pagination={{ pageSize: 5 }}
        />
      </Card>

      {reporte && (
        <Card
          style={{ marginTop: 16 }}
          title={
            <>
              Reporte {periodoLabel(reporte.importacion)} —{' '}
              <Text type="secondary" style={{ fontWeight: 'normal' }}>
                {reporte.mesesCompletos.length > 0 &&
                  `${reporte.mesesCompletos[0].toLowerCase()}${
                    reporte.mesesCompletos.length > 1
                      ? ` a ${reporte.mesesCompletos[reporte.mesesCompletos.length - 1].toLowerCase()}`
                      : ''
                  } completo`}
                {reporte.mesParcial &&
                  `, ${reporte.mesParcial.toLowerCase()} parcial al ${reporte.importacion.fecha_max}`}
              </Text>
            </>
          }
          extra={
            <Space>
              <Button
                icon={<DownloadOutlined />}
                onClick={() =>
                  horasSociosApi.descargarExcel(
                    reporte.importacion.id,
                    `Mapa_de_Horas_${periodoLabel(reporte.importacion).replace(/ /g, '_')}.xlsx`,
                  )
                }
              >
                Mapa completo
              </Button>
              {tabSocio !== 'GENERAL' && (
                <Button
                  icon={<DownloadOutlined />}
                  onClick={() =>
                    horasSociosApi.descargarExcelSocio(reporte.importacion.id, tabSocio)
                  }
                >
                  {tabSocio}.xlsx
                </Button>
              )}
              <Button type="primary" icon={<MailOutlined />} onClick={abrirEnvio}>
                Enviar a socios
              </Button>
            </Space>
          }
        >
          <Tabs
            activeKey={tabSocio}
            onChange={setTabSocio}
            items={[
              { key: 'GENERAL', label: `GENERAL (${reporte.filas.length})` },
              ...reporte.socios.map((s) => ({
                key: s,
                label: `${s} (${reporte.filas.filter((f) => f.socio === s).length})`,
              })),
            ]}
          />
          <Table
            rowKey="usuario"
            size="small"
            loading={loadingPreview}
            columns={colsReporte}
            dataSource={filasTab}
            pagination={false}
            scroll={{ x: 1600, y: 480 }}
            summary={() => (
              <Table.Summary fixed>
                <Table.Summary.Row style={{ fontWeight: 'bold' }}>
                  <Table.Summary.Cell index={0}>TOTAL</Table.Summary.Cell>
                  <Table.Summary.Cell index={1}>{''}</Table.Summary.Cell>
                  {totalesTab.totalMes.map((v, i) => (
                    <Table.Summary.Cell key={i} index={2 + i} align="right">
                      {minutosAHoras(v)}
                    </Table.Summary.Cell>
                  ))}
                  <Table.Summary.Cell index={8} align="right">
                    {minutosAHoras(totalesTab.totalHoras)}
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={9} align="right">
                    {minutosAHoras(totalesTab.totalFact)}
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={10} align="right">
                    {minutosAHoras(totalesTab.nfFormacion)}
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={11} align="right">
                    {minutosAHoras(totalesTab.nfConsortium)}
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={12} align="right">
                    {minutosAHoras(totalesTab.nfCobro)}
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={13} align="right">
                    {minutosAHoras(totalesTab.nfProBono)}
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={14} align="right">
                    {minutosAHoras(totalesTab.nfGestion)}
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={15} align="right">
                    {minutosAHoras(totalesTab.totalNoCobrables)}
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={16} align="right">
                    {minutosAHoras(totalesTab.cnc)}
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={17} align="right">
                    {fmtMoney(totalesTab.valorFacturable)}
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={18} align="right">
                    {fmtMoney(totalesTab.valorNoFacturable)}
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              </Table.Summary>
            )}
          />
        </Card>
      )}

      <Modal
        title={`Enviar registro de horas — ${reporte ? periodoLabel(reporte.importacion) : ''}`}
        open={envioOpen}
        onCancel={() => setEnvioOpen(false)}
        width={760}
        footer={[
          <Button key="cerrar" onClick={() => setEnvioOpen(false)}>
            Cerrar
          </Button>,
          <Button key="dry" loading={enviando} onClick={() => ejecutarEnvio(true)}>
            Simular (dry run)
          </Button>,
          <Popconfirm
            key="real"
            title={`¿Enviar los correos a ${sociosSel.length} socio(s)?`}
            onConfirm={() => ejecutarEnvio(false)}
          >
            <Button type="primary" icon={<SendOutlined />} loading={enviando}>
              Enviar correos
            </Button>
          </Popconfirm>,
        ]}
      >
        <Text>Cada socio recibe su cuadro con el Excel {`{SOCIO}.xlsx`} adjunto.</Text>
        <div style={{ margin: '12px 0' }}>
          <Checkbox
            indeterminate={sociosSel.length > 0 && sociosSel.length < (reporte?.socios.length ?? 0)}
            checked={sociosSel.length === (reporte?.socios.length ?? 0)}
            onChange={(e) => setSociosSel(e.target.checked ? (reporte?.socios ?? []) : [])}
          >
            Todos
          </Checkbox>
          <Checkbox.Group
            style={{ display: 'block', marginTop: 8 }}
            value={sociosSel}
            onChange={(v) => setSociosSel(v as string[])}
            options={(reporte?.socios ?? []).map((s) => {
              const d = destinatarios.find((x) => x.socio_codigo === s);
              return {
                value: s,
                label: (
                  <span>
                    <b>{s}</b>{' '}
                    <Text type={d ? 'secondary' : 'danger'}>
                      {d ? `→ ${d.email_para}` : '(sin destinatario configurado)'}
                    </Text>
                  </span>
                ),
              };
            })}
          />
        </div>
        {resultadoEnvio && (
          <>
            <Alert
              type={fueDryRun ? 'info' : 'success'}
              showIcon
              message={fueDryRun ? 'Simulación — no se envió nada' : 'Resultado del envío'}
              style={{ marginBottom: 8 }}
            />
            <Table
              rowKey="socio"
              size="small"
              columns={colsEnvio}
              dataSource={resultadoEnvio}
              pagination={false}
            />
          </>
        )}
      </Modal>
    </div>
  );
};

export default HorasSociosPage;
