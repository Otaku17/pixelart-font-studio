import { useEffect, useState } from 'react';
import { useEditorStore } from '../state/store';

export function Toast() {
  const message = useEditorStore((s) => s.toastMessage);
  const clearToast = useEditorStore((s) => s.clearToast);
  const [visible, setVisible] = useState(false);
  const [text, setText] = useState('');

  useEffect(() => {
    if (!message) return;
    setText(message);
    setVisible(true);
    const showTimer = setTimeout(() => setVisible(false), 2200);
    const clearTimer = setTimeout(() => clearToast(), 2500);
    return () => {
      clearTimeout(showTimer);
      clearTimeout(clearTimer);
    };
  }, [message, clearToast]);

  return <div className={`toast${visible ? ' show' : ''}`}>{text}</div>;
}
