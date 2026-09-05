import { useEffect } from 'react';

const APP_NAME = 'LIEC Shipping';

export const usePageTitle = (title: string | undefined | null) => {
  useEffect(() => {
    document.title = title ? `${title} — ${APP_NAME}` : APP_NAME;
    return () => {
      document.title = APP_NAME;
    };
  }, [title]);
};
