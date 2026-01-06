import { AlertCircle, XCircle, WifiOff, Lock, Search, AlertTriangle, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ParsedError, ErrorType } from "@/lib/error-utils";

interface ErrorAlertProps {
  error: ParsedError;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

const ERROR_ICONS: Record<ErrorType, typeof AlertCircle> = {
  license_limit: AlertTriangle,
  validation: AlertCircle,
  network: WifiOff,
  auth: Lock,
  not_found: Search,
  conflict: XCircle,
  server: AlertCircle,
  unknown: AlertCircle,
};

const ERROR_VARIANTS: Record<ErrorType, "default" | "destructive"> = {
  license_limit: "destructive",
  validation: "destructive",
  network: "destructive",
  auth: "destructive",
  not_found: "default",
  conflict: "destructive",
  server: "destructive",
  unknown: "destructive",
};

export function ErrorAlert({ error, onRetry, onDismiss, className }: ErrorAlertProps) {
  const Icon = ERROR_ICONS[error.type];
  const variant = ERROR_VARIANTS[error.type];

  return (
    <Alert variant={variant} className={className} data-testid="error-alert">
      <Icon className="h-4 w-4" />
      <AlertTitle data-testid="error-alert-title">{error.title}</AlertTitle>
      <AlertDescription className="mt-2">
        <p data-testid="error-alert-message">{error.message}</p>
        {error.suggestion && (
          <p className="mt-1 text-muted-foreground text-sm" data-testid="error-alert-suggestion">
            {error.suggestion}
          </p>
        )}
        {(onRetry || onDismiss) && (
          <div className="flex gap-2 mt-3">
            {onRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                data-testid="button-error-retry"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Tekrar Dene
              </Button>
            )}
            {onDismiss && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDismiss}
                data-testid="button-error-dismiss"
              >
                Kapat
              </Button>
            )}
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}

interface InlineFieldErrorProps {
  message?: string;
  className?: string;
}

export function InlineFieldError({ message, className }: InlineFieldErrorProps) {
  if (!message) return null;
  
  return (
    <p className={`text-sm text-destructive mt-1 ${className || ''}`} data-testid="field-error">
      {message}
    </p>
  );
}
