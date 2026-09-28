import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AuthPasswordField({
  id,
  value,
  onChange,
  newPassword = false,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  newPassword?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Senha</Label>
      <div className="relative">
        <Input
          id={id}
          type={visible ? "text" : "password"}
          required
          minLength={newPassword ? 6 : undefined}
          autoComplete={newPassword ? "new-password" : "current-password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={newPassword ? "Crie sua senha" : "Digite sua senha"}
          aria-describedby={newPassword ? `${id}-hint` : undefined}
          className="h-12 rounded-xl pr-12 text-base"
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-xl text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {visible ? (
            <EyeOff className="size-5" aria-hidden />
          ) : (
            <Eye className="size-5" aria-hidden />
          )}
        </button>
      </div>
      {newPassword && (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          Use pelo menos 6 caracteres. Combine letras, números e símbolos.
        </p>
      )}
    </div>
  );
}
