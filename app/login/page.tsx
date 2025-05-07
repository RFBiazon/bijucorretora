"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });
    setLoading(false);
    if (error) {
      toast({
        title: "Erro ao entrar",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Login realizado com sucesso!",
        variant: "success",
      });
      router.push("/");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md bg-black border border-gray-800">
        <CardHeader>
          <CardTitle>Entrar</CardTitle>
          <CardDescription>Digite seu e-mail e senha para acessar sua conta.</CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin} autoComplete="on">
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="senha">Senha</Label>
              <Input
                id="senha"
                type="password"
                placeholder="Sua senha"
                value={senha}
                onChange={e => setSenha(e.target.value)}
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </Button>
            <div className="w-full text-center text-sm text-muted-foreground">
              <a href="#" className="hover:underline">Esqueceu sua senha?</a>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
} 