import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://kpfxsmqshvqrzpuwycww.supabase.co"
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtwZnhzbXFzaHZxcnpwdXd5Y3d3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM4NTYyNTgsImV4cCI6MjA1OTQzMjI1OH0.At0_KNHm7ZpGNXfuJIgsgRl-_ZbeO2BgcQm-AjG87UA"

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
