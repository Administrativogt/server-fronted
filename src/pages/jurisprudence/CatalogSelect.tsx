import React, { useRef, useState } from 'react';
import { Button, Divider, Empty, Input, Select, Space, Spin, message } from 'antd';
import type { InputRef } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { createCatalogItem } from '../../api/jurisprudence';
import type {
  CatalogKind,
  JurisprudenceCatalog,
} from '../../types/jurisprudence.types';

interface CatalogSelectProps {
  /** Endpoint kind for this catalog (e.g. 'tribunals'). */
  kind: CatalogKind;
  /** Current options for this catalog. */
  items: JurisprudenceCatalog[];
  /** Selected id (injected by Form.Item). */
  value?: number;
  /** Change handler (injected by Form.Item). */
  onChange?: (value: number) => void;
  /** Called after a new catalog item is created so the parent can merge it. */
  onCreated: (item: JurisprudenceCatalog) => void;
  /** Whether the catalog options are still being fetched. */
  loading?: boolean;
  placeholder?: string;
  showSearch?: boolean;
}

/**
 * Select with an inline "Agregar otro" footer: lets the user create a new
 * catalog entry without leaving the form. On create it persists via the API,
 * notifies the parent to merge the option, and auto-selects the new value.
 */
const CatalogSelect: React.FC<CatalogSelectProps> = ({
  kind,
  items,
  value,
  onChange,
  onCreated,
  loading = false,
  placeholder = 'Selecciona',
  showSearch = true,
}) => {
  const [name, setName] = useState('');
  const [adding, setAdding] = useState(false);
  const inputRef = useRef<InputRef>(null);

  const handleAdd = async (
    e: React.MouseEvent | React.KeyboardEvent,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const trimmed = name.trim();
    if (!trimmed || adding) return;
    setAdding(true);
    try {
      const created = await createCatalogItem(kind, trimmed);
      onCreated(created);
      onChange?.(created.id);
      setName('');
      message.success(`"${created.name}" agregado`);
    } catch {
      message.error('No se pudo agregar el elemento');
    } finally {
      setAdding(false);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  return (
    <Select
      showSearch={showSearch}
      optionFilterProp="label"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      loading={loading}
      notFoundContent={
        loading ? (
          <div style={{ padding: 16, textAlign: 'center' }}>
            <Spin size="small" />
          </div>
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No hay datos" />
        )
      }
      options={items.map((t) => ({ value: t.id, label: t.name }))}
      popupRender={(menu) => (
        <>
          {menu}
          <Divider style={{ margin: '8px 0' }} />
          <Space style={{ padding: '0 8px 4px', width: '100%' }}>
            <Input
              ref={inputRef}
              placeholder="Agregar otro…"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              onPressEnter={handleAdd}
            />
            <Button
              type="text"
              icon={<PlusOutlined />}
              loading={adding}
              onClick={handleAdd}
            >
              Agregar
            </Button>
          </Space>
        </>
      )}
    />
  );
};

export default CatalogSelect;
