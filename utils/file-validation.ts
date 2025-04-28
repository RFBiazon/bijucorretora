export interface ValidationResult {
  valid: boolean
  message?: string
}

export function validatePdfFile(file: File | null): ValidationResult {
  if (!file) {
    return { valid: false, message: "Nenhum arquivo selecionado" }
  }

  // Verificar tipo de arquivo
  if (file.type !== "application/pdf") {
    return { valid: false, message: "O arquivo deve ser um PDF" }
  }

  // Verificar tamanho (limite de 10MB)
  const maxSize = 10 * 1024 * 1024 // 10MB em bytes
  if (file.size > maxSize) {
    return {
      valid: false,
      message: "O arquivo é muito grande. O tamanho máximo é 10MB",
    }
  }

  return { valid: true }
}
