// src/pages/notifications/NotificationFilters.tsx
import React from "react";
import { DatePicker, Input, Select, Space } from "antd";
import dayjs from "dayjs";

// ✅ Tipado extendido para que sea compatible con Record<string, unknown>
export interface NotificationFilterValues extends Record<string, unknown> {
  receptionDate?: string;
  deliveryDate?: string;
  provenience?: number;
  hall?: number;
  cedule?: string;
  expedientNum?: string;
  directedTo?: string;
}

interface Props {
  filters: NotificationFilterValues;
  setFilters: (f: NotificationFilterValues) => void;
  proveniences: { id: number; name: string }[];
  halls: { id: number; name: string }[];
}

const NotificationFilters: React.FC<Props> = ({
  filters,
  setFilters,
  proveniences,
  halls,
}) => {
  return (
    <Space style={{ marginBottom: 16 }} wrap>
      <DatePicker
        placeholder="Fecha recepción"
        value={filters.receptionDate ? dayjs(filters.receptionDate) : null}
        onChange={(date) =>
          setFilters({ ...filters, receptionDate: date?.format("YYYY-MM-DD") })
        }
      />
      <DatePicker
        placeholder="Fecha entrega"
        value={filters.deliveryDate ? dayjs(filters.deliveryDate) : null}
        onChange={(date) =>
          setFilters({ ...filters, deliveryDate: date?.format("YYYY-MM-DD") })
        }
      />
      <Select
        placeholder="Proveniencia"
        allowClear
        options={proveniences.map((p) => ({ label: p.name, value: p.id }))}
        value={filters.provenience}
        onChange={(value) => setFilters({ ...filters, provenience: value })}
      />
      <Select
        placeholder="Sala"
        allowClear
        options={halls.map((h) => ({ label: h.name, value: h.id }))}
        value={filters.hall}
        onChange={(value) => setFilters({ ...filters, hall: value })}
      />
      <Input
        placeholder="Cédula"
        value={filters.cedule || ""}
        onChange={(e) => setFilters({ ...filters, cedule: e.target.value })}
      />
      <Input
        placeholder="Expediente"
        value={filters.expedientNum || ""}
        onChange={(e) =>
          setFilters({ ...filters, expedientNum: e.target.value })
        }
      />
      <Input
        placeholder="Dirigido a"
        value={filters.directedTo || ""}
        onChange={(e) =>
          setFilters({ ...filters, directedTo: e.target.value })
        }
      />
    </Space>
  );
};

export default NotificationFilters;