import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface SignupFormProps {
  onSubmit: (data: { email: string; password: string; fullName: string; phone?: string }) => Promise<void>;
  isLoading: boolean;
  formatPhone: (value: string) => string;
}

export function SignupForm({ onSubmit, isLoading, formatPhone }: SignupFormProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!fullName || fullName.length < 3) {
      newErrors.fullName = 'Nome deve ter no mínimo 3 caracteres';
    }
    
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'E-mail inválido';
    }
    
    if (phone && !/^\(\d{2}\)\s?\d{4,5}-?\d{4}$/.test(phone)) {
      newErrors.phone = 'Telefone inválido. Use o formato (XX) XXXXX-XXXX';
    }
    
    if (!password || password.length < 6) {
      newErrors.password = 'Senha deve ter no mínimo 6 caracteres';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    await onSubmit({
      email,
      password,
      fullName,
      phone: phone || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="signup-fullname" className="text-sm font-medium text-primary-foreground block">
          Nome Completo
        </label>
        <input 
          id="signup-fullname"
          type="text" 
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="João da Silva"
          autoComplete="off"
          className="flex h-10 w-full rounded-md border px-3 py-2 text-sm bg-primary-foreground/10 border-primary-foreground/30 text-primary-foreground placeholder:text-primary-foreground/50 focus:outline-none focus:ring-2 focus:ring-accent"
        />
        {errors.fullName && (
          <p className="text-sm text-destructive">{errors.fullName}</p>
        )}
      </div>

      <div className="space-y-2">
        <label htmlFor="signup-email" className="text-sm font-medium text-primary-foreground block">
          E-mail Corporativo
        </label>
        <input 
          id="signup-email"
          type="email" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seu.email@empresa.com.br"
          autoComplete="off"
          className="flex h-10 w-full rounded-md border px-3 py-2 text-sm bg-primary-foreground/10 border-primary-foreground/30 text-primary-foreground placeholder:text-primary-foreground/50 focus:outline-none focus:ring-2 focus:ring-accent"
        />
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email}</p>
        )}
      </div>

      <div className="space-y-2">
        <label htmlFor="signup-phone" className="text-sm font-medium text-primary-foreground block">
          Telefone (opcional)
        </label>
        <input 
          id="signup-phone"
          type="tel" 
          value={phone}
          onChange={(e) => setPhone(formatPhone(e.target.value))}
          placeholder="(21) 99999-9999"
          autoComplete="off"
          className="flex h-10 w-full rounded-md border px-3 py-2 text-sm bg-primary-foreground/10 border-primary-foreground/30 text-primary-foreground placeholder:text-primary-foreground/50 focus:outline-none focus:ring-2 focus:ring-accent"
        />
        {errors.phone && (
          <p className="text-sm text-destructive">{errors.phone}</p>
        )}
      </div>
      
      <div className="space-y-2">
        <label htmlFor="signup-password" className="text-sm font-medium text-primary-foreground block">
          Senha
        </label>
        <input 
          id="signup-password"
          type="password" 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="new-password"
          className="flex h-10 w-full rounded-md border px-3 py-2 text-sm bg-primary-foreground/10 border-primary-foreground/30 text-primary-foreground placeholder:text-primary-foreground/50 focus:outline-none focus:ring-2 focus:ring-accent"
        />
        {errors.password && (
          <p className="text-sm text-destructive">{errors.password}</p>
        )}
      </div>

      <Button 
        type="submit" 
        className="w-full bg-accent hover:bg-accent/90 text-primary font-semibold"
        disabled={isLoading}
      >
        {isLoading ? 'Processando...' : 'Cadastrar'}
      </Button>
    </form>
  );
}
