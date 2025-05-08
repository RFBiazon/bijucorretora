"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { AnimatedElement } from "@/components/AnimatedElement"
import { motion } from "framer-motion";

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
        variant: "default",
      });
      window.location.href = "/";
    }
  }

  return (
    <div className="container relative h-screen flex-col items-center justify-center grid lg:max-w-none lg:grid-cols-2 lg:px-0">
      <AnimatedElement index={0} className="relative hidden h-full flex-col bg-muted p-10 text-white lg:flex dark:border-r">
        <motion.div 
          className="absolute inset-0 bg-zinc-900"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{
            duration: 0.6,
            ease: [0.4, 0, 0.2, 1]
          }}
        />
        <motion.div 
          className="relative z-20 flex items-center text-lg font-medium"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.4,
            delay: 0.2,
            ease: [0.4, 0, 0.2, 1]
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mr-2 h-6 w-6"
          >
            <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
          </svg>
          NeoSystemsAI
        </motion.div>
        <motion.div 
          className="relative z-20 mt-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.4,
            delay: 0.4,
            ease: [0.4, 0, 0.2, 1]
          }}
        >
          <blockquote className="space-y-2">
            <p className="text-lg">
              &ldquo;Esta plataforma revolucionou a forma como gerenciamos nossas propostas de seguros, tornando o processo muito mais eficiente e organizado.&rdquo;
            </p>
            <footer className="text-sm">Dyego Almeida</footer>
          </blockquote>
        </motion.div>
      </AnimatedElement>
      <div className="lg:p-8">
        <AnimatedElement index={1} className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
          <motion.div 
            className="flex flex-col space-y-2 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.4,
              delay: 0.2,
              ease: [0.4, 0, 0.2, 1]
            }}
          >
            <h1 className="text-2xl font-semibold tracking-tight">
              Bem-vindo de volta
            </h1>
            <p className="text-sm text-muted-foreground">
              Entre com suas credenciais para acessar o sistema
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              duration: 0.4,
              delay: 0.3,
              ease: [0.4, 0, 0.2, 1]
            }}
          >
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
          </motion.div>
          <motion.p 
            className="px-8 text-center text-sm text-muted-foreground"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.4,
              delay: 0.4,
              ease: [0.4, 0, 0.2, 1]
            }}
          >
            Ao clicar em continuar, você concorda com nossos{" "}
            <a
              href="/terms"
              className="underline underline-offset-4 hover:text-primary"
            >
              Termos de Serviço
            </a>{" "}
            e{" "}
            <a
              href="/privacy"
              className="underline underline-offset-4 hover:text-primary"
            >
              Política de Privacidade
            </a>
            .
          </motion.p>
        </AnimatedElement>
      </div>
    </div>
  );
} 