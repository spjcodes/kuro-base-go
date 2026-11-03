import { useEffect } from 'react';
import { subscribeApiErrors } from '@/lib/api-error';
import { useToast } from '@/components/custom/toast';

/**
 * Draws every failure reported through lib/api-error.ts as a toast.
 *
 * Rendered once at the root, inside ToastProvider. Keeping the subscription in
 * a component rather than auto-showing from the reporter is what lets the toast
 * UI stay free of API knowledge, and the reporter stay free of React (it is
 * called from the MutationCache, outside any render tree).
 */
export function ApiErrorToaster() {
  const { showToast } = useToast();

  useEffect(
    () => subscribeApiErrors((message) => showToast(message, { variant: 'error' })),
    [showToast]
  );

  return null;
}
