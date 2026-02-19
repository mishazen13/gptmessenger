// components/AutoSizeTextarea.tsx
import React from 'react';

type Props = {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  className?: string;
  maxRows?: number;
};

export const AutoSizeTextarea = ({ 
  value, 
  onChange, 
  placeholder, 
  className = '',
  maxRows = 5
}: Props) => {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    if (textareaRef.current) {
      // Сбрасываем высоту перед изменением
      textareaRef.current.style.height = 'auto';
      
      // Устанавливаем новую высоту на основе scrollHeight
      const scrollHeight = textareaRef.current.scrollHeight;
      const lineHeight = 24; // примерно 1.5rem
      const maxHeight = lineHeight * maxRows;
      
      textareaRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
      
      // Добавляем скролл если превышен maxRows
      if (scrollHeight > maxHeight) {
        textareaRef.current.style.overflowY = 'auto';
      } else {
        textareaRef.current.style.overflowY = 'hidden';
      }
    }
  }, [value, maxRows]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`resize-none overflow-hidden transition-all duration-200 ease-in-out ${className}`}
      rows={1}
    />
  );
};