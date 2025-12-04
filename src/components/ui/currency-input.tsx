import * as React from "react";
import { Input } from "./input";
import { cn } from "@/lib/utils";

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: string;
  onChange: (value: string) => void;
}

// Formata número para moeda brasileira (R$ 1.234.567,89)
const formatToBRL = (value: string): string => {
  // Remove tudo exceto números
  const numbers = value.replace(/\D/g, '');
  
  if (!numbers) return '';
  
  // Converte para número e formata
  const numericValue = parseInt(numbers, 10);
  
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numericValue);
};

// Extrai valor numérico de string formatada
const parseFromBRL = (formatted: string): string => {
  const numbers = formatted.replace(/\D/g, '');
  return numbers || '';
};

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ className, value, onChange, placeholder = "R$ 0", ...props }, ref) => {
    const [displayValue, setDisplayValue] = React.useState(() => {
      if (value) {
        return formatToBRL(value);
      }
      return '';
    });

    // Sincroniza quando value externo muda
    React.useEffect(() => {
      if (value) {
        setDisplayValue(formatToBRL(value));
      } else {
        setDisplayValue('');
      }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      
      // Se está apagando tudo
      if (!inputValue) {
        setDisplayValue('');
        onChange('');
        return;
      }

      // Formata e atualiza
      const formatted = formatToBRL(inputValue);
      const numeric = parseFromBRL(inputValue);
      
      setDisplayValue(formatted);
      onChange(numeric);
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      // Seleciona todo o texto ao focar
      e.target.select();
    };

    return (
      <Input
        ref={ref}
        type="text"
        inputMode="numeric"
        className={cn("text-right", className)}
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        placeholder={placeholder}
        {...props}
      />
    );
  }
);

CurrencyInput.displayName = "CurrencyInput";

export { CurrencyInput };
