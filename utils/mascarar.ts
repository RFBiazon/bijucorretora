export function mascararCPF(cpf: string): string {
  if (!cpf) return ''
  // Remove tudo que não for número
  const numeros = cpf.replace(/\D/g, '')
  if (numeros.length !== 11) return cpf
  return numeros.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.***.***-$4')
} 