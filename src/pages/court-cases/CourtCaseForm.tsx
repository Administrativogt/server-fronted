import React from 'react';
import { Form, Input, Select, DatePicker, InputNumber, Radio, Space, Button } from 'antd';
import type { FormInstance } from 'antd';
import type { CaseTypeKey, CourtCaseState, Dependency } from '../../api/courtCases';
import type { Client } from '../../api/clients';
import type { UserLite } from '../../api/users';

const { TextArea } = Input;

type Props = {
  type: CaseTypeKey;
  form: FormInstance;
  clients: Client[];
  lawyers: UserLite[];
  states: CourtCaseState[];
  dependencies: Dependency[];
  viewOnly?: boolean;
};

const currencyOptions = [
  { label: 'Quetzales', value: 1 },
  { label: 'Dólares', value: 2 },
];

const CourtCaseForm: React.FC<Props> = ({
  type,
  form,
  clients,
  lawyers,
  states,
  dependencies,
  viewOnly = false,
}) => {
  const disabled = viewOnly;

  const renderAdjustments = () => (
    <Form.List name="adjustments">
      {(fields, { add, remove }) => (
        <div>
          <Space style={{ marginBottom: 12 }}>
            <Button onClick={() => add()} disabled={disabled}>
              Agregar ajuste
            </Button>
          </Space>
          {fields.map((field) => (
            <Space key={field.key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
              <Form.Item
                {...field}
                name={[field.name, 'number']}
                label="Ajuste"
                style={{ marginBottom: 0 }}
              >
                <Input disabled={disabled} />
              </Form.Item>
              <Form.Item
                {...field}
                name={[field.name, 'amount']}
                label="Monto"
                style={{ marginBottom: 0 }}
              >
                <Input disabled={disabled} />
              </Form.Item>
              <Form.Item
                {...field}
                name={[field.name, 'success_probability']}
                label="Prob. éxito"
                style={{ marginBottom: 0 }}
              >
                <Input disabled={disabled} />
              </Form.Item>
              {!disabled && (
                <Button onClick={() => remove(field.name)}>-</Button>
              )}
            </Space>
          ))}
        </div>
      )}
    </Form.List>
  );

  return (
    <Form form={form} layout="vertical">
      <Form.Item name="client" label="Cliente" rules={[{ required: true, message: 'Selecciona un cliente' }]}>
        <Select
          showSearch
          optionFilterProp="label"
          disabled={disabled}
          options={clients.map((client) => ({ label: client.name, value: client.id }))}
        />
      </Form.Item>

      {type === 'labor' && (
        <Form.Item name="main_piece" label="Pieza principal">
          <Input disabled={disabled} />
        </Form.Item>
      )}

      {(type === 'labor' || type === 'litigation') && (
        <Form.Item
          name="official_court"
          label="Órgano jurisdiccional - Autoridad"
          rules={[{ required: true, message: 'Campo requerido' }]}
        >
          <Input disabled={disabled} />
        </Form.Item>
      )}

      {type === 'labor' && (
        <>
          <Form.Item name="appeals_room" label="Sala de apelaciones">
            <Input disabled={disabled} />
          </Form.Item>
          <Form.Item name="process_type" label="Tipo de proceso">
            <Input disabled={disabled} />
          </Form.Item>
        </>
      )}

      {type === 'litigation' && (
        <>
          <Form.Item name="process_type" label="Tipo de proceso">
            <Input disabled={disabled} />
          </Form.Item>
          <Form.Item name="case_name" label="Nombre del caso">
            <Input disabled={disabled} />
          </Form.Item>
          <Form.Item name="third_parties" label="Terceros / otros sujetos procesales">
            <Input disabled={disabled} />
          </Form.Item>
        </>
      )}

      {type === 'penal' && (
        <>
          <Form.Item
            name="case_name"
            label="Nombre del caso"
            rules={[{ required: true, message: 'Campo requerido' }]}
          >
            <Input disabled={disabled} />
          </Form.Item>
          <Form.Item name="court" label="Juzgado" rules={[{ required: true, message: 'Campo requerido' }]}>
            <Input disabled={disabled} />
          </Form.Item>
          <Form.Item
            name="district_attorney"
            label="Fiscalía/Auxiliar fiscal"
            rules={[{ required: true, message: 'Campo requerido' }]}
          >
            <Input disabled={disabled} />
          </Form.Item>
          <Form.Item name="accussed" label="Denunciado" rules={[{ required: true, message: 'Campo requerido' }]}>
            <Input disabled={disabled} />
          </Form.Item>
          <Form.Item name="description" label="Resumen de denuncia">
            <TextArea rows={3} disabled={disabled} />
          </Form.Item>
        </>
      )}

      {type === 'tributary' && (
        <>
          <Form.Item name="process_number" label="Número de proceso">
            <Input disabled={disabled} />
          </Form.Item>
          <Form.Item name="room" label="Sala">
            <Input disabled={disabled} />
          </Form.Item>
          <Form.Item name="resolution" label="Resolución">
            <Input disabled={disabled} />
          </Form.Item>
        </>
      )}

      {type === 'administrative-tax' && (
        <>
          <Form.Item name="entity" label="Entidad que conoce">
            <Input disabled={disabled} />
          </Form.Item>
          <Form.Item name="sat_dependency" label="Dependencia SAT">
            <Select
              disabled={disabled}
              options={dependencies.map((dep) => ({ label: dep.name, value: dep.id }))}
            />
          </Form.Item>
          <Form.Item name="audience" label="Audiencia">
            <Input disabled={disabled} />
          </Form.Item>
          <Form.Item name="resolution" label="Resolución">
            <Input disabled={disabled} />
          </Form.Item>
          <Form.Item name="tax_resolution" label="Resolución del TRIBUTA">
            <Input disabled={disabled} />
          </Form.Item>
        </>
      )}

      {(type === 'labor' || type === 'litigation') && (
        <>
          <Form.Item name="actor" label="Demandante">
            <Input disabled={disabled} />
          </Form.Item>
          <Form.Item name="defendant" label="Demandado">
            <Input disabled={disabled} />
          </Form.Item>
        </>
      )}

      {type === 'penal' && (
        <>
          <Form.Item name="actor" label="Parte actora">
            <Input disabled={disabled} />
          </Form.Item>
          <Form.Item name="subject" label="Delito">
            <Input disabled={disabled} />
          </Form.Item>
        </>
      )}

      {type !== 'penal' && (
        <Form.Item name="subject" label="Asunto">
          <TextArea rows={2} disabled={disabled} />
        </Form.Item>
      )}

      <Form.Item name="expedient" label="Expediente">
        <Input disabled={disabled} />
      </Form.Item>

      <Form.Item name="init_date" label="Fecha de inicio">
        <DatePicker style={{ width: '100%' }} disabled={disabled} />
      </Form.Item>

      <Form.Item name="observations" label="Observaciones generales">
        <TextArea rows={3} disabled={disabled} />
      </Form.Item>

      {(type === 'tributary' || type === 'administrative-tax') && renderAdjustments()}

      <Form.Item name="responsible_lawyer" label="Responsable" rules={[{ required: true, message: 'Selecciona un abogado' }]}>
        <Select
          showSearch
          optionFilterProp="label"
          disabled={disabled}
          options={lawyers.map((lawyer) => ({
            label: `${lawyer.first_name} ${lawyer.last_name}`.trim(),
            value: lawyer.id,
          }))}
        />
      </Form.Item>

      <Form.Item name="currency" label="Moneda" initialValue={1}>
        <Radio.Group options={currencyOptions} disabled={disabled} />
      </Form.Item>

      <Form.Item name="amount" label="Monto">
        <Input disabled={disabled} />
      </Form.Item>

      {type === 'administrative-tax' && (
        <Space style={{ display: 'flex' }} size="middle">
          <Form.Item name="tax" label="Impuesto" style={{ flex: 1 }}>
            <InputNumber min={0} step={0.01} style={{ width: '100%' }} disabled={disabled} />
          </Form.Item>
          <Form.Item name="penalty_fee" label="Multa" style={{ flex: 1 }}>
            <InputNumber min={0} step={0.01} style={{ width: '100%' }} disabled={disabled} />
          </Form.Item>
          <Form.Item name="interests" label="Intereses" style={{ flex: 1 }}>
            <InputNumber min={0} step={0.01} style={{ width: '100%' }} disabled={disabled} />
          </Form.Item>
        </Space>
      )}

      <Form.Item name="case_defenses" label="Forma como se defiende el caso">
        <TextArea rows={3} disabled={disabled} />
      </Form.Item>

      <Form.Item name="success_probability" label="Probabilidad de éxito">
        <Input disabled={disabled} />
      </Form.Item>

      <Form.Item name="expedient_link" label="Link expediente">
        <Input disabled={disabled} />
      </Form.Item>

      <Form.Item name="fee_proposal_link" label="Link propuesta de honorarios">
        <Input disabled={disabled} />
      </Form.Item>

      <Form.Item name="state" label="Estado">
        <Select
          disabled={disabled}
          options={states.map((state) => ({ label: state.name, value: state.id }))}
        />
      </Form.Item>
    </Form>
  );
};

export default CourtCaseForm;
