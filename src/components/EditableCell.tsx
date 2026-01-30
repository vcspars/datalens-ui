import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle } from "lucide-react";

interface EditableCellProps {
  value: any;
  rowIndex: number;
  columnId: string;
  isEditing: boolean;
  onEdit: (rowIndex: number, columnId: string, value: any) => void;
  onSave: (rowIndex: number, columnId: string, newValue: any) => void;
  onCancel: () => void;
  align?: "left" | "center" | "right";
  format?: "currency" | "percentage";
}

function formatDisplayValue(
  value: any,
  align?: "left" | "center" | "right",
  format?: "currency" | "percentage"
): string {
  if (value === null || value === undefined) return "";
  const str = String(value).trim();
  if (str === "") return "";

  const num = Number(value);
  if (!Number.isNaN(num) && typeof value !== "boolean") {
    if (format === "currency") {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(num);
    }
    if (format === "percentage") {
      return new Intl.NumberFormat("en-US", {
        style: "percent",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(num);
    }
    // Thousands separator for numeric right-aligned
    if (align === "right" && Number.isFinite(num)) {
      return new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 6,
      }).format(num);
    }
  }

  return str;
}

const alignClass = {
  left: "text-left justify-start",
  center: "text-center justify-center",
  right: "text-right justify-end",
};

export default function EditableCell({
  value,
  rowIndex,
  columnId,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  align = "left",
  format,
}: EditableCellProps) {
  const [localValue, setLocalValue] = useState(value ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalValue(value ?? "");
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const displayText = formatDisplayValue(value, align, format);
  const alignmentClass = alignClass[align] || alignClass.left;

  const handleClick = () => {
    if (!isEditing) {
      onEdit(rowIndex, columnId, value);
    }
  };

  const handleSave = () => {
    onSave(rowIndex, columnId, localValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      onCancel();
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1 w-full min-w-0">
        <Input
          ref={inputRef}
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          className="h-8 text-sm flex-1 min-w-0"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 flex-shrink-0"
          onClick={handleSave}
          title="Save"
        >
          <CheckCircle2 className="h-4 w-4 text-green-600" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 flex-shrink-0"
          onClick={onCancel}
          title="Cancel"
        >
          <XCircle className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center min-h-[2rem] px-2 py-1 rounded border border-transparent hover:border-border cursor-pointer text-sm ${alignmentClass}`}
      onClick={handleClick}
      title="Click to edit"
    >
      <span className="truncate block w-full">{displayText || "\u00a0"}</span>
    </div>
  );
}
