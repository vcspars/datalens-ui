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
}

const EditableCell = React.memo<EditableCellProps>(({ 
  value, 
  rowIndex, 
  columnId, 
  isEditing, 
  onEdit, 
  onSave, 
  onCancel 
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

  return (
    <div
      className="min-h-[32px] flex items-center cursor-text hover:bg-muted/50 px-1 rounded"
      onClick={() => onEdit(rowIndex, columnId, value)}
    >
      {value !== null && value !== undefined ? String(value) : (
        <span className="text-muted-foreground italic">Click to edit</span>
      )}
    </div>
  );
});

EditableCell.displayName = "EditableCell";

export default EditableCell;
