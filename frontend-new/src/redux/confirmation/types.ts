export interface IConfirmation {
  open: boolean;
  title: string;
  message: string;
  onSubmit: () => void;
  // When true, the confirm button renders as a destructive variant so
  // delete / cancel-shipment actions stand out.
  destructive?: boolean;
  confirmText?: string;
}
