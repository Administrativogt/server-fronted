import React, { useEffect, useMemo, useState } from "react";
import { Button, Card, Table, message, Space } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";

import {
  fetchDeliveredNotifications,
  type NotificationDto,
} from "../../api/notifications";
import NotificationFilters from "./NotificationFilters";

type RowType = {
  key: number;
  fechaRecepcion: string;
  horaRecepcion: string;
  de: string;
  cedula: string;
  expediente: string;
  dirigidaA: string;
  recibe: string;
  fechaEntrega: string;
  horaEntrega: string;
  entregadaA: string;
  quienEntrega: string;
};

const Entregadas: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<RowType[]>([]);
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [proveniences, setProveniences] = useState<{ id: number; name: string }[]>([]);
  const [halls, setHalls] = useState<{ id: number; name: string }[]>([]);

  const columns: ColumnsType<RowType> = useMemo(
    () => [
      { title: "Fecha recepción", dataIndex: "fechaRecepcion", key: "fechaRecepcion" },
      { title: "Hora recepción", dataIndex: "horaRecepcion", key: "horaRecepcion" },
      { title: "De", dataIndex: "de", key: "de" },
      { title: "Cédula", dataIndex: "cedula", key: "cedula" },
      { title: "No. Expediente", dataIndex: "expediente", key: "expediente" },
      { title: "Dirigida a", dataIndex: "dirigidaA", key: "dirigidaA" },
      { title: "Recibe", dataIndex: "recibe", key: "recibe" },
      { title: "Fecha entrega", dataIndex: "fechaEntrega", key: "fechaEntrega" },
      { title: "Hora entrega", dataIndex: "horaEntrega", key: "horaEntrega" },
      { title: "Entregada a", dataIndex: "entregadaA", key: "entregadaA" },
      { title: "Quien entrega", dataIndex: "quienEntrega", key: "quienEntrega" },
    ],
    []
  );

  const load = async () => {
    setLoading(true);
    try {
      const [data, provRes, hallsRes] = await Promise.all([
        fetchDeliveredNotifications(filters),
        // catálogos para los filtros
        (await import("../../api/notifications")).fetchProveniences(),
        (await import("../../api/notifications")).fetchHalls(),
      ]);

      setProveniences(provRes);
      setHalls(hallsRes);

      const mapped = data.map((n: NotificationDto): RowType => {
        const de = [n.provenience?.name, n.hall?.name].filter(Boolean).join(" ");
        return {
          key: n.id,
          fechaRecepcion: n.receptionDatetime
            ? dayjs(n.receptionDatetime).format("DD/MM/YYYY")
            : "",
          horaRecepcion: n.receptionDatetime
            ? dayjs(n.receptionDatetime).format("HH:mm")
            : "",
          de,
          cedula: n.cedule,
          expediente: n.expedientNum,
          dirigidaA: n.directedTo,
          recibe: n.recepReceives
            ? `${n.recepReceives.first_name} ${n.recepReceives.last_name}`
            : "",
          fechaEntrega: n.receptionDatetime
            ? dayjs(n.receptionDatetime).format("DD/MM/YYYY")
            : "",
          horaEntrega: n.receptionDatetime
            ? dayjs(n.receptionDatetime).format("HH:mm")
            : "",
          entregadaA: n.deliverTo
            ? `${n.deliverTo.first_name} ${n.deliverTo.last_name}`
            : "",
          quienEntrega: n.recepDelivery
            ? `${n.recepDelivery.first_name} ${n.recepDelivery.last_name}`
            : "",
        };
      });

      setRows(mapped);
    } catch (e: any) {
      console.error(e);
      message.error(e?.response?.data?.message || "Error al cargar entregadas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filters]);

  return (
    <Card
      title="Lista de notificaciones entregadas"
      extra={
        <Space>
          <Button type="primary" onClick={load}>
            🔄 Refrescar
          </Button>
        </Space>
      }
    >
      <NotificationFilters
        filters={filters}
        setFilters={setFilters}
        proveniences={proveniences}
        halls={halls}
      />

      <Table
        columns={columns}
        dataSource={rows}
        loading={loading}
        pagination={{ pageSize: 10 }}
        locale={{ emptyText: "No hay notificaciones entregadas" }}
      />
    </Card>
  );
};

export default Entregadas;
