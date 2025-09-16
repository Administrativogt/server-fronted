import React from "react";
import { DatePicker, Input, Select, Space } from "antd";
import dayjs from "dayjs";

interface Props {
  filters: Record<string, any>;
  setFilters: (f: Record<string, any>) => void;
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
    </Space>
  );
};

export default NotificationFilters;
