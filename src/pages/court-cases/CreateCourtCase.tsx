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
import { getCourtCasesAccess } from './access';
import { filterLawyersForCourtCases } from './lawyers';

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
  const areaId = useAuthStore((s) => s.areaId);
  const { defaultCaseType, allowedCaseTypes } = useMemo(
    () => getCourtCasesAccess(areaId),
    [areaId]
  );
  const [activeType, setActiveType] = useState<CaseTypeKey>(
    defaultCaseType
  );
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
      const [statesRes, depsRes, clientsRes, usersRes] = await Promise.allSettled([
        fetchCaseStates(),
        fetchDependencies(),
        fetchClients(),
        fetchUsers(),
      ]);
      if (statesRes.status === 'fulfilled') setStates(statesRes.value);
      else message.error('No se pudieron cargar los estados');
      if (depsRes.status === 'fulfilled') setDependencies(depsRes.value);
      else console.warn('Dependencias no cargadas');
      if (clientsRes.status === 'fulfilled') setClients(clientsRes.value ?? []);
      else message.error('No se pudieron cargar los clientes');
      if (usersRes.status === 'fulfilled') setLawyers(usersRes.value ?? []);
      else message.error('No se pudieron cargar los abogados');
    };
    loadMasterData();
  }, []);

  useEffect(() => {
    if (!defaultStateId) return;
    const defaults = { state: defaultStateId, currency: 1 };
    const administrativeTaxDefaults = { ...defaults, entity: 'SAT', entity_mode: false };
    laborForm.setFieldsValue(defaults);
    litigationForm.setFieldsValue(defaults);
    penalForm.setFieldsValue(defaults);
    tributaryForm.setFieldsValue(defaults);
    administrativeTaxForm.setFieldsValue(administrativeTaxDefaults);
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

  const renderTab = (type: CaseTypeKey, form: any) => {
    const filteredLawyers = filterLawyersForCourtCases(lawyers, areaId, type, 'create');
    return (
      <div>
        <CourtCaseForm
          type={type}
          form={form}
          clients={clients}
          lawyers={filteredLawyers}
          dependencies={dependencies}
        />
        <Button type="primary" onClick={() => submitForm(type)}>
          Crear caso
        </Button>
      </div>
    );
  };

  useEffect(() => {
    if (!allowedCaseTypes.includes(activeType)) {
      setActiveType(defaultCaseType);
    }
  }, [activeType, allowedCaseTypes, defaultCaseType]);

  const availableTabs = useMemo(() => {
    const allTabs = [
      { key: 'labor' as CaseTypeKey, label: tabLabels.labor, children: renderTab('labor', laborForm) },
      { key: 'litigation' as CaseTypeKey, label: tabLabels.litigation, children: renderTab('litigation', litigationForm) },
      { key: 'penal' as CaseTypeKey, label: tabLabels.penal, children: renderTab('penal', penalForm) },
      { key: 'tributary' as CaseTypeKey, label: tabLabels.tributary, children: renderTab('tributary', tributaryForm) },
      { key: 'administrative-tax' as CaseTypeKey, label: tabLabels['administrative-tax'], children: renderTab('administrative-tax', administrativeTaxForm) },
    ];

    return allTabs.filter((tab) => allowedCaseTypes.includes(tab.key));
  }, [allowedCaseTypes, laborForm, litigationForm, penalForm, tributaryForm, administrativeTaxForm, clients, lawyers, states, dependencies]);

  return (
    <div>
      <Tabs
        activeKey={activeType}
        onChange={(key) => setActiveType(key as CaseTypeKey)}
        items={availableTabs}
      />
    </div>
  );
};

export default CreateCourtCase;
