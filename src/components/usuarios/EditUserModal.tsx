import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save } from "lucide-react";

interface UserToEdit {
  id: string;
  full_name: string;
  phone: string | null;
  email: string;
  creci: string | null;
}

interface EditUserModalProps {
  user: UserToEdit | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: { id: string; full_name: string; phone: string; email: string; creci: string }) => void;
  isPending: boolean;
}

export function EditUserModal({ user, open, onOpenChange, onSave, isPending }: EditUserModalProps) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [creci, setCreci] = useState("");

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || "");
      setPhone(user.phone || "");
      setEmail(user.email || "");
      setCreci(user.creci || "");
    }
  }, [user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    onSave({ id: user.id, full_name: fullName, phone, email, creci });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Corretor</DialogTitle>
          <DialogDescription>Atualize os dados profissionais do corretor.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nome Completo</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>WhatsApp</Label>
            <Input type="tel" placeholder="(21) 99999-9999" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>E-mail</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>CRECI</Label>
            <Input placeholder="CRECI-RJ 12345" value={creci} onChange={(e) => setCreci(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</>
            ) : (
              <><Save className="mr-2 h-4 w-4" />Salvar Alterações</>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
