import type { CSSProperties, ReactElement, ReactNode, RefCallback, RefObject } from 'react';

export type ModalStyle = CSSProperties & { [key: `--${string}`]: string | number };

export interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Required accessible dialog heading. */
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  closeLabel?: string;
  closeOnEscape?: boolean;
  closeOnBackdrop?: boolean;
  initialFocusRef?: RefObject<HTMLElement | null>;
  /** Opening trigger; recommended for consistent pointer focus restoration in Safari. */
  returnFocusRef?: RefObject<HTMLElement | null>;
  effect?: 'default' | 'in' | 'out' | 'up' | 'down' | 'left' | 'right';
  className?: string;
  windowClassName?: string;
  style?: ModalStyle;
}

export function Modal(props: ModalProps): ReactElement | null;

export interface AppearOptions {
  root?: Element | Document | null;
  rootMargin?: string;
  threshold?: number | number[];
  /** Stop after the first intersection; visible and appeared then remain true. */
  once?: boolean;
}

export interface AppearResult<T extends Element> {
  ref: RefCallback<T>;
  visible: boolean;
  appeared: boolean;
}

export function useAppear<T extends Element = HTMLDivElement>(options?: AppearOptions): AppearResult<T>;

export interface SheetItem { id: string; label: ReactNode; content: ReactNode; disabled?: boolean; }
export interface SheetsProps {
  items: SheetItem[]; value?: string; defaultValue?: string; onValueChange?: (value: string) => void;
  label?: string; orientation?: 'horizontal' | 'vertical'; className?: string; style?: ModalStyle;
}
export function Sheets(props: SheetsProps): ReactElement;
export interface DropdownItem {
  id: string; label?: ReactNode; href?: string; disabled?: boolean; divider?: boolean;
  keepOpen?: boolean; onSelect?: () => void;
}
export interface DropdownProps {
  trigger: ReactNode; items: DropdownItem[]; open?: boolean; defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void; label?: string; disabled?: boolean; className?: string; style?: ModalStyle;
}
export function Dropdown(props: DropdownProps): ReactElement;
export interface AutocompleteProps<T> {
  value: string; onValueChange: (value: string) => void; onSelect: (item: T) => void;
  loadData?: (query: string, context: { signal: AbortSignal }) => Promise<T[]>;
  items?: T[]; getLabel?: (item: T) => string; getKey?: (item: T) => string | number;
  renderItem?: (item: T) => ReactNode; label: string; minLength?: number; debounce?: number;
  disabled?: boolean; placeholder?: string; name?: string; className?: string; style?: ModalStyle;
  loadingContent?: ReactNode; emptyContent?: ReactNode; errorContent?: ReactNode;
  inputProps?: Omit<import('react').InputHTMLAttributes<HTMLInputElement>,
    'value' | 'defaultValue' | 'onChange' | 'onFocus' | 'onBlur' | 'onKeyDown' | 'id' | 'role' | 'name' | 'disabled' | 'placeholder'>;
}
export function Autocomplete<T = string>(props: AutocompleteProps<T>): ReactElement;
export interface SliderProps {
  children: ReactNode; value?: number; defaultValue?: number; onValueChange?: (index: number) => void;
  gap?: number; rubber?: boolean; resetOnMouseout?: boolean; touch?: boolean; label?: string; className?: string; style?: ModalStyle;
}
export function Slider(props: SliderProps): ReactElement;
export interface LoadMoreOptions<T> {
  loadPage: (page: number, context: { signal: AbortSignal }) => Promise<{ items: T[]; hasMore: boolean }>;
  initialPage?: number; root?: Element | Document | null; rootMargin?: string; resetKey?: unknown; enabled?: boolean;
}
export function useLoadMore<T>(options: LoadMoreOptions<T>): {
  ref: RefCallback<HTMLElement>; items: T[]; loading: boolean; hasMore: boolean; error: unknown; loadMore: () => Promise<void>;
};
export function useMediaQuery(query: string, serverValue?: boolean): boolean;
export function useHover(): { hovered: boolean; bind: {
  onPointerEnter: import('react').PointerEventHandler<HTMLElement>; onPointerLeave: import('react').PointerEventHandler<HTMLElement>;
} };
export function useSticky<T extends HTMLElement = HTMLDivElement>(options?: { root?: Element | Document | null; rootMargin?: string }): { ref: RefCallback<T>; stuck: boolean };
export function useScrollProgress<T extends HTMLElement = HTMLDivElement>(options?: {
  root?: HTMLElement | null; start?: number | string; end?: number | string;
}): { ref: RefCallback<T>; progress: number };
export function LazyImage(props: import('react').ImgHTMLAttributes<HTMLImageElement>): ReactElement;
export function ScrollLink(props: import('react').AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string; offset?: number; behavior?: ScrollBehavior;
}): ReactElement;
