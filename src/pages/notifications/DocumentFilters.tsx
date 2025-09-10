import React from 'react';
import { DatePicker, Input, Select, Space } from 'antd';
import dayjs from 'dayjs';

interface Props {
  filters: Record<string, any>;
  setFilters: (f: Record<string, any>) => void;
  documentTypes: string[];
}

const DocumentFilters: React.FC<Props> = ({ filters, setFilters, documentTypes }) => {
  return (
    <Space style={{ marginBottom: 16 }} wrap>
      <Select
        placeholder="Tipo"
        allowClear
        options={documentTypes.map(t => ({ label: t, value: t }))}
        value={filters.documentType}
        onChange={(value) => setFilters({ ...filters, documentType: value })}
      />
      <DatePicker
        placeholder="Fecha recepción"
        value={filters.receptionDate ? dayjs(filters.receptionDate) : null}
        onChange={(date) => setFilters({ ...filters, receptionDate: date?.format('YYYY-MM-DD') })}
      />
      <DatePicker
        placeholder="Fecha entrega"
        value={filters.deliveryDate ? dayjs(filters.deliveryDate) : null}
        onChange={(date) => setFilters({ ...filters, deliveryDate: date?.format('YYYY-MM-DD') })}
      />
      <Input
        placeholder="Buscar texto"
        value={filters.text || ''}
        onChange={(e) => setFilters({ ...filters, text: e.target.value })}
      />
    </Space>
  );
};

export default DocumentFilters;
