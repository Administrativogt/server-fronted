import React, { useEffect, useMemo, useState } from 'react';
import { Button, Form, Tabs, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../auth/useAuthStore';
import { fetchClients } from '../../api/clients';
import { fetchUsers } from '../../api/users';
import type { Client } from '../../api/clients';
import type { UserLite } from '../../api/users';
import {
  type CaseTypeKey,
  type CourtCaseState,
  type Dependency,
  fetchCaseStates,
  fetchDependencies,
  createLaborCase,
  createLitigationCase,
  createPenalCase,
  createTributaryCase,
  createAdministrativeTaxCase,
} from '../../api/courtCases';
import CourtCaseForm from './CourtCaseForm';
import { normalizeCasePayload } from './utils';

const tabLabels: Record<CaseTypeKey, string> = {
  labor: 'Laboral',
  litigation: 'Litigio',
  penal: 'Penal',
  tributary: 'Tributario',
  'administrative-tax': 'Administrativo-Tributario',
};

const CreateCourtCase: React.FC = () => {
  const navigate = useNavigate();
  const userId = useAuthStore((s) => s.userId);
  const [activeType, setActiveType] = useState<CaseTypeKey>('litigation');
  const [states, setStates] = useState<CourtCaseState[]>([]);
  const [dependencies, setDependencies] = useState<Dependency[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [lawyers, setLawyers] = useState<UserLite[]>([]);

  const [laborForm] = Form.useForm();
  const [litigationForm] = Form.useForm();
  const [penalForm] = Form.useForm();
  const [tributaryForm] = Form.useForm();
  const [administrativeTaxForm] = Form.useForm();

  const defaultStateId = useMemo(() => {
    const activeState = states.find((state) => state.id === 1);
    return activeState?.id || states[0]?.id;
  }, [states]);

  useEffect(() => {
    const loadMasterData = async () => {
      try {
        const [statesRes, depsRes, clientsRes, usersRes] = await Promise.all([
          fetchCaseStates(),
          fetchDependencies(),
          fetchClients(),
          fetchUsers(),
        ]);
        setStates(statesRes);
        setDependencies(depsRes);
        setClients(clientsRes);
        setLawyers(usersRes);
      } catch {
        message.error('Error al cargar datos base');
      }
    };
    loadMasterData();
  }, []);

  useEffect(() => {
    if (!defaultStateId) return;
    const defaults = { state: defaultStateId, currency: 1 };
    laborForm.setFieldsValue(defaults);
    litigationForm.setFieldsValue(defaults);
    penalForm.setFieldsValue(defaults);
    tributaryForm.setFieldsValue(defaults);
    administrativeTaxForm.setFieldsValue(defaults);
  }, [defaultStateId, laborForm, litigationForm, penalForm, tributaryForm, administrativeTaxForm]);

  const submitForm = async (type: CaseTypeKey) => {
    const form =
      type === 'labor'
        ? laborForm
        : type === 'litigation'
          ? litigationForm
          : type === 'penal'
            ? penalForm
            : type === 'tributary'
              ? tributaryForm
              : administrativeTaxForm;

    try {
      const values = await form.validateFields();
      const payload = normalizeCasePayload({
        ...values,
        creator: userId || undefined,
        state: values.state || defaultStateId,
      });

      if (type === 'labor') await createLaborCase(payload);
      if (type === 'litigation') await createLitigationCase(payload);
      if (type === 'penal') await createPenalCase(payload);
      if (type === 'tributary') await createTributaryCase(payload);
      if (type === 'administrative-tax') await createAdministrativeTaxCase(payload);

      message.success('Caso creado');
      navigate('/dashboard/casos');
    } catch {
      message.error('No se pudo crear el caso');
    }
  };

  const renderTab = (type: CaseTypeKey, form: any) => (
    <div>
      <CourtCaseForm
        type={type}
        form={form}
        clients={clients}
        lawyers={lawyers}
        states={states}
        dependencies={dependencies}
      />
      <Button type="primary" onClick={() => submitForm(type)}>
        Crear caso
      </Button>
    </div>
  );

  return (
    <div>
      <Tabs
        activeKey={activeType}
        onChange={(key) => setActiveType(key as CaseTypeKey)}
        items={[
          { key: 'labor', label: tabLabels.labor, children: renderTab('labor', laborForm) },
          { key: 'litigation', label: tabLabels.litigation, children: renderTab('litigation', litigationForm) },
          { key: 'penal', label: tabLabels.penal, children: renderTab('penal', penalForm) },
          { key: 'tributary', label: tabLabels.tributary, children: renderTab('tributary', tributaryForm) },
          {
            key: 'administrative-tax',
            label: tabLabels['administrative-tax'],
            children: renderTab('administrative-tax', administrativeTaxForm),
          },
        ]}
      />
    </div>
  );
};

export default CreateCourtCase;
