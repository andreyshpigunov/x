import type { ReactNode } from 'react';
import '@andreyshpigunov/x/styles/modal.css';
import './site.css';

export const metadata = { title: 'X · React: локальная проверка' };

export default function Layout({ children }: { children: ReactNode }) {
  return <html lang="ru"><body>{children}</body></html>;
}
