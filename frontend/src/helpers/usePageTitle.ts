import { useEffect } from 'react';

const APP_NAME = 'LIEC Shipping';

// Sets document.title for the duration the calling component is mounted.
// Pass the page-specific label; the hook appends the app name. For detail
// pages whose label depends on async data, pass the data-derived value —
// the effect re-fires when it changes, so the tab updates as soon as the
// query resolves.
export const usePageTitle = (title: string | undefined | null) => {
  useEffect(() => {
    document.title = title ? `${title} — ${APP_NAME}` : APP_NAME;
    return () => {
      document.title = APP_NAME;
    };
  }, [title]);
};
