export function extrairNomeSegurado(texto: string): string | null {
  if (!texto) return null

  // Padrão com emoji
  const padraoEmoji = /👤\s*Segurado:\s*([^\n]+)/i
  const matchEmoji = texto.match(padraoEmoji)
  if (matchEmoji && matchEmoji[1]) {
    return matchEmoji[1].trim()
  }

  // Padrão "Segurado:" ou "Nome do Segurado:"
  const padrao = /(?:Segurado|Nome do Segurado):\s*([^\n]+)/i
  const match = texto.match(padrao)
  if (match && match[1]) {
    return match[1].trim()
  }

  // Padrão "Segurado" seguido por nome
  const padraoSegurado = /Segurado[:\s]+([A-ZÀ-Ú\s]+(?:[A-ZÀ-Ú][a-zà-ú]+\s*)+)/
  const matchSegurado = texto.match(padraoSegurado)
  if (matchSegurado && matchSegurado[1]) {
    return matchSegurado[1].trim()
  }

  return null
}

export function extrairSeguradora(texto: string): string | null {
  if (!texto) return null

  const padrao = /(?:Seguradora|Cia):\s*([^\n]+)/i
  const match = texto.match(padrao)
  if (match && match[1]) {
    return match[1].trim()
  }

  // Tentar encontrar nomes de seguradoras conhecidas
  const seguradoras = [
    "Porto Seguro",
    "Bradesco",
    "SulAmérica",
    "Allianz",
    "Liberty",
    "HDI",
    "Tokio Marine",
    "Azul",
    "Mapfre",
    "Sompo",
    "Zurich",
    "Itaú",
  ]

  for (const seguradora of seguradoras) {
    if (texto.includes(seguradora)) {
      return seguradora
    }
  }

  return null
}

export function extrairValorPremio(texto: string): number | null {
  if (!texto) return null

  // Padrão para valores monetários com "Prêmio" ou "Valor" próximo
  const padraoPreco = /(?:Prêmio|Valor|Total)[^\d]*R?\$?\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/i
  const match = texto.match(padraoPreco)

  if (match && match[1]) {
    // Converter string para número
    const valorString = match[1].replace(".", "").replace(",", ".")
    return Number.parseFloat(valorString)
  }

  return null
}
