import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Clock, Link2Off, SearchX, ShieldAlert } from 'lucide-react';
import type { MenuRequestLoadError, MenuRequestLoadErrorKind } from '../../lib/menuRequestApi';

type Action = {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive' | null;
  disabled?: boolean;
};

function pickIcon(kind: MenuRequestLoadErrorKind) {
  if (kind === 'EXPIRED') return Clock;
  if (kind === 'REVOKED') return Link2Off;
  if (kind === 'NOT_FOUND') return SearchX;
  return ShieldAlert;
}

export function MenuRequestErrorCard(props: {
  error: MenuRequestLoadError;
  primaryAction?: Action;
  secondaryAction?: Action;
}) {
  const Icon = pickIcon(props.error.kind);

  return (
    <Card className="border-amber-200 bg-amber-50">
      <CardContent className="py-6">
        <div className="flex items-start gap-4">
          <div className="h-11 w-11 rounded-2xl bg-amber-100 flex items-center justify-center">
            <Icon className="h-6 w-6 text-amber-700" />
          </div>
          <div className="flex-1">
            <div className="text-base font-semibold text-amber-900">{props.error.title}</div>
            <div className="mt-1 text-sm text-amber-800">{props.error.description}</div>

            <div className="mt-5 flex flex-col sm:flex-row gap-2">
              {props.primaryAction && (
                <Button
                  className="gap-2"
                  variant={props.primaryAction.variant ?? 'default'}
                  onClick={props.primaryAction.onClick}
                  disabled={props.primaryAction.disabled}
                >
                  {props.primaryAction.label}
                </Button>
              )}
              {props.secondaryAction && (
                <Button
                  className="gap-2"
                  variant={props.secondaryAction.variant ?? 'outline'}
                  onClick={props.secondaryAction.onClick}
                  disabled={props.secondaryAction.disabled}
                >
                  {props.secondaryAction.label}
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
