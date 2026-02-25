export interface IConfirmation {
  open: boolean;
  title: string;
  message: string;
  onSubmit: () => void;
}
