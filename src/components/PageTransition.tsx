import { useEffect, useState, type ReactNode } from 'react';

/**
 * Wraps page content and replays a short fade/slide-in animation whenever
 * the `pageKey` changes (i.e. when switching tabs).
 */
export function PageTransition({ pageKey, children }: { pageKey: string; children: ReactNode }) {
  const [shown, setShown] = useState(children);

  useEffect(() => {
    setShown(children);
  }, [pageKey, children]);

  return (
    <div key={pageKey} className="animate-page-in">
      {shown}
    </div>
  );
}
