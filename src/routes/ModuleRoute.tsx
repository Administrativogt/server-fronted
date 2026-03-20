import { Navigate, Outlet } from 'react-router-dom';
import useAuthStore from '../auth/useAuthStore';
import type { ModuleKey } from '../types/module-access.types';

interface ModuleRouteProps {
  moduleKey?: ModuleKey;
  moduleKeys?: ModuleKey[];
}

export default function ModuleRoute({ moduleKey, moduleKeys }: ModuleRouteProps) {
  const modules = useAuthStore((state) => state.modules);
  const keys = moduleKeys && moduleKeys.length ? moduleKeys : moduleKey ? [moduleKey] : [];
  const hasModule = keys.some((key) => modules.some((module) => module.key === key));
  return hasModule ? <Outlet /> : <Navigate to="/dashboard" replace />;
}

