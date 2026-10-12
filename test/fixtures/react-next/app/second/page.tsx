import Link from 'next/link';

export default function Page() {
  return <main><p className="eyebrow">X / REACT</p><h1>Вторая страница</h1>
    <p>После перехода окна закрыты, прокрутка и фокус свободны.</p>
    <Link href="/">Вернуться к проверкам</Link></main>;
}
