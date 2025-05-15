"use client";
import { Navbar } from "@/components/navbar";
import { usePathname } from "next/navigation";
import UploadQueueList from "@/components/upload-queue/UploadQueueList";

export default function LayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/login";
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {!isLogin && <Navbar />}
      <div className="flex-1 flex flex-col">{children}</div>
      {!isLogin && <UploadQueueList />}
      {!isLogin && (
        <footer className="sticky bottom-0 z-50 w-full border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-4 text-center">
          <p className="text-sm text-muted-foreground">
            © 2025 NeoSystemsAI Todos os direitos reservados.
          </p>
        </footer>
      )}
    </div>
  );
} 