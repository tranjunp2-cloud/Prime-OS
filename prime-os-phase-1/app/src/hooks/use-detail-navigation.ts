import { useLocation, useNavigate } from 'react-router-dom';

export interface DetailNavigationState {
  from?: string;
  label?: string;
}

export function buildListNavigationState(pathname: string, search: string, label: string): DetailNavigationState {
  return {
    from: `${pathname}${search}`,
    label,
  };
}

export function useDetailNavigation(fallbackHref: string, fallbackLabel: string) {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as DetailNavigationState | null) ?? null;

  const backTo = state?.from && state.from.startsWith('/') ? state.from : fallbackHref;
  const backLabel = state?.label?.trim() ? state.label : fallbackLabel;

  function goBack() {
    navigate(backTo);
  }

  return {
    backTo,
    backLabel,
    goBack,
  };
}
