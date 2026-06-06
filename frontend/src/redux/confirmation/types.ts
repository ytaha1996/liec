export interface IConfirmation {
  open: boolean;
  title: string;
  message: string;
  onSubmit: () => void;
  // When true, the confirm button renders as a red contained "Delete"-style
  // button so destructive actions (delete, cancel shipment) stand out.
  destructive?: boolean;
  confirmText?: string;
}
