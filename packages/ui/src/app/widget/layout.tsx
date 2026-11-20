// Fix: widget layout must NOT include html/body tags (#1321)
import React from 'react';
export default function WidgetLayout({ children }: { children: React.ReactNode }) {
  return <div className='widget-container'>{children}</div>;
}
