import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";

interface EditableCellProps {
  value: any;
  rowIndex: number;
  columnId: string;
  isEditing: boolean;
  onEdit: (rowIndex: number, columnId: string, value: any) => void;
  onSave: (rowIndex: number, columnId: string, newValue: any) => void;
  onCancel: () => void;
  align?: 'left' | 'center' | 'right';
  format?: 'currency' | 'percentage';
}

function formatDisplayValue(value: any, format?: 'currency' | 'percentage'): string {
  if (value === null || value === undefined) return '';
  const num = Number(value);
  if (format === 'currency' && !Number.isNaN(num)) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
  }
  if (format === 'percentage' && !Number.isNaN(num)) {
    return `${num.toFixed(2)}%`;
  }
  return String(value);
}

const EditableCell = React.memo<EditableCellProps>(({ 
  value, 
  rowIndex, 
  columnId, 
  isEditing, 
  onEdit, 
  onSave, 
  onCancel,
  align = 'left',
  format,
}) => {
  const [localValue, setLocalValue] = useState(value || "");

  useEffect(() => {
    setLocalValue(value || "");
  }, [value]);

  if (isEditing) {
    return (
      <Input
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={() => {
          onSave(rowIndex, columnId, localValue);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.currentTarget.blur();
          } else if (e.key === 'Escape') {
            setLocalValue(value || "");
            onCancel();
          }
        }}
        className="h-8 text-xs sm:text-sm"
        autoFocus
      />
    );
  }

  const alignClass = align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start';
  const displayValue = formatDisplayValue(value, format);

  return (
    <div
      className={`min-h-[32px] flex items-center cursor-text hover:bg-muted/50 px-1 rounded ${alignClass}`}
      onClick={() => onEdit(rowIndex, columnId, value)}
    >
      {value !== null && value !== undefined ? displayValue : (
        <span className="text-muted-foreground italic">Click to edit</span>
      )}
    </div>
  );
});

EditableCell.displayName = "EditableCell";

export default EditableCell;
