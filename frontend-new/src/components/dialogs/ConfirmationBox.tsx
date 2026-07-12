import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { CloseConfirmation } from '@/redux/confirmation/confirmationReducer';

// Global confirmation surface — every page can dispatch OpenConfirmation
// with a callback and this renders the prompt at app root.
export function ConfirmationBox() {
  const dispatch = useAppDispatch();
  const state = useAppSelector((s) => s.confirmation);

  const close = () => dispatch(CloseConfirmation());

  const onConfirm = () => {
    state.onSubmit();
    close();
  };

  return (
    <AlertDialog open={state.open} onOpenChange={(v) => !v && close()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{state.title || 'Are you sure?'}</AlertDialogTitle>
          {state.message && <AlertDialogDescription>{state.message}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button variant="outline">Cancel</Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              variant={state.destructive ? 'destructive' : 'default'}
              onClick={onConfirm}
            >
              {state.confirmText || (state.destructive ? 'Delete' : 'Confirm')}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
