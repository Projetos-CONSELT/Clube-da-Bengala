declare module '@/components/ui/button' {
  import type { ComponentType } from 'react';
  export const Button: ComponentType<Record<string, unknown>>;
}

declare module '@/components/ui/input' {
  import type { InputHTMLAttributes } from 'react';
  export const Input: (props: InputHTMLAttributes<HTMLInputElement>) => JSX.Element;
}

declare module '@/components/ui/label' {
  import type { ComponentType } from 'react';
  export const Label: ComponentType<Record<string, unknown>>;
}

declare module '@/components/ui/card' {
  import type { ComponentType } from 'react';
  export const Card: ComponentType<Record<string, unknown>>;
  export const CardContent: ComponentType<Record<string, unknown>>;
  export const CardHeader: ComponentType<Record<string, unknown>>;
  export const CardTitle: ComponentType<Record<string, unknown>>;
  export const CardDescription: ComponentType<Record<string, unknown>>;
}

declare module '@/components/ui/toaster' {
  import type { ComponentType } from 'react';
  export const Toaster: ComponentType<Record<string, unknown>>;
}

declare module '@/components/ui/use-toast' {
  export function useToast(): {
    toast: (props: Record<string, unknown>) => void;
    dismiss: (toastId?: string) => void;
    toasts: unknown[];
  };
}

declare module '@/components/UserNotRegisteredError' {
  import type { ComponentType } from 'react';
  const UserNotRegisteredError: ComponentType<Record<string, unknown>>;
  export default UserNotRegisteredError;
}

declare module '@/components/AccessDenied' {
  import type { ComponentType } from 'react';
  const AccessDenied: ComponentType<Record<string, unknown>>;
  export default AccessDenied;
}

declare module '@/lib/query-client' {
  import type { QueryClient } from '@tanstack/react-query';
  export const queryClientInstance: QueryClient;
}

declare module '@/lib/NavigationTracker' {
  import type { ComponentType } from 'react';
  const NavigationTracker: ComponentType<Record<string, unknown>>;
  export default NavigationTracker;
}

declare module '@/lib/PageNotFound' {
  import type { ComponentType } from 'react';
  const PageNotFound: ComponentType<Record<string, unknown>>;
  export default PageNotFound;
}

declare module '@/Layout' {
  import type { ComponentType, ReactNode } from 'react';
  const Layout: ComponentType<{ children: ReactNode; currentPageName: string }>;
  export default Layout;
}

declare module '@/components/ui/badge' {
  import type { ComponentType } from 'react';
  export const Badge: ComponentType<Record<string, unknown>>;
}

declare module '@/components/ui/textarea' {
  import type { TextareaHTMLAttributes } from 'react';
  export const Textarea: (props: TextareaHTMLAttributes<HTMLTextAreaElement>) => JSX.Element;
}

declare module '@/components/ui/tabs' {
  import type { ComponentType } from 'react';
  export const Tabs: ComponentType<Record<string, unknown>>;
  export const TabsContent: ComponentType<Record<string, unknown>>;
  export const TabsList: ComponentType<Record<string, unknown>>;
  export const TabsTrigger: ComponentType<Record<string, unknown>>;
}

declare module '@/components/ui/select' {
  import type { ReactNode } from 'react';
  type SelectRootProps = {
    value?: string;
    defaultValue?: string;
    onValueChange?: (value: string) => void;
    children?: ReactNode;
    disabled?: boolean;
  };
  export const Select: (props: SelectRootProps) => JSX.Element;
  export const SelectContent: (props: { children?: ReactNode; className?: string }) => JSX.Element;
  export const SelectItem: (props: { value: string; children?: ReactNode; className?: string }) => JSX.Element;
  export const SelectTrigger: (props: { children?: ReactNode; className?: string }) => JSX.Element;
  export const SelectValue: (props: { placeholder?: string }) => JSX.Element;
}

declare module '@/components/ui/dialog' {
  import type { ComponentType } from 'react';
  export const Dialog: ComponentType<Record<string, unknown>>;
  export const DialogContent: ComponentType<Record<string, unknown>>;
  export const DialogDescription: ComponentType<Record<string, unknown>>;
  export const DialogFooter: ComponentType<Record<string, unknown>>;
  export const DialogHeader: ComponentType<Record<string, unknown>>;
  export const DialogTitle: ComponentType<Record<string, unknown>>;
  export const DialogTrigger: ComponentType<Record<string, unknown>>;
  export const DialogClose: ComponentType<Record<string, unknown>>;
}

declare module '@/components/ui/alert' {
  import type { ComponentType } from 'react';
  export const Alert: ComponentType<Record<string, unknown>>;
  export const AlertTitle: ComponentType<Record<string, unknown>>;
  export const AlertDescription: ComponentType<Record<string, unknown>>;
}

declare module '@/components/ui/skeleton' {
  import type { ComponentType } from 'react';
  export const Skeleton: ComponentType<Record<string, unknown>>;
}

declare module '@/components/ui/dropdown-menu' {
  import type { ComponentType } from 'react';
  export const DropdownMenu: ComponentType<Record<string, unknown>>;
  export const DropdownMenuContent: ComponentType<Record<string, unknown>>;
  export const DropdownMenuItem: ComponentType<Record<string, unknown>>;
  export const DropdownMenuSeparator: ComponentType<Record<string, unknown>>;
  export const DropdownMenuTrigger: ComponentType<Record<string, unknown>>;
}

declare module '@/components/ui/avatar' {
  import type { ComponentType } from 'react';
  export const Avatar: ComponentType<Record<string, unknown>>;
  export const AvatarFallback: ComponentType<Record<string, unknown>>;
}

declare module '@/components/ui/table' {
  import type { ReactNode } from 'react';
  export const Table: (props: { children?: ReactNode; className?: string }) => JSX.Element;
  export const TableHeader: (props: { children?: ReactNode; className?: string }) => JSX.Element;
  export const TableBody: (props: { children?: ReactNode; className?: string }) => JSX.Element;
  export const TableFooter: (props: { children?: ReactNode; className?: string }) => JSX.Element;
  export const TableRow: (props: { children?: ReactNode; className?: string }) => JSX.Element;
  export const TableHead: (props: { children?: ReactNode; className?: string }) => JSX.Element;
  export const TableCell: (props: { children?: ReactNode; className?: string; colSpan?: number }) => JSX.Element;
  export const TableCaption: (props: { children?: ReactNode; className?: string }) => JSX.Element;
}
