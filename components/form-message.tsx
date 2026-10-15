import { Alert, AlertDescription } from "@/components/ui/alert";

export type FormState = {
  error?: string;
  success?: string;
  values?: Record<string, string>;
};

export function FormMessage({ state }: { state: FormState }) {
  if (state.error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{state.error}</AlertDescription>
      </Alert>
    );
  }
  if (state.success) {
    return (
      <Alert>
        <AlertDescription>{state.success}</AlertDescription>
      </Alert>
    );
  }
  return null;
}
