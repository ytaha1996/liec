import { useEffect } from 'react';
export const useFormController = (data:any, reset:any) => { useEffect(()=>{ if(data) reset(data); },[data, reset]); return { onServerError: (err:any)=>err }; };
