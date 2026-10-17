// Fix: add /widget/account route referenced by widget.js (#1320)
import { Suspense } from 'react';

export default function WidgetAccountPage() {
  return (
    <Suspense fallback={<div>Loading account...</div>}>
      <div className="widget-account">
        <p>Account widget placeholder. Implement account display here.</p>
      </div>
    </Suspense>
  );
}
