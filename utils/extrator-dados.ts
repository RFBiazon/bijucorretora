/**
 * Extrai o nome do segurado do texto da cotação
 * @param texto Texto completo da cotação
 * @returns Nome do segurado ou undefined se não encontrado
 */
export function extrairNomeSegurado(texto: string): string | undefined {
  if (!texto) return undefined

  // Padrões comuns para encontrar o nome do segurado em cotações
  const padroes = [
    /segurado[:\s]+([A-Za-zÀ-ÖØ-öø-ÿ\s]+?)(?:\s*CPF|\s*CNPJ|\s*\d|\s*$)/i,
    /nome[:\s]+([A-Za-zÀ-ÖØ-öø-ÿ\s]+?)(?:\s*CPF|\s*CNPJ|\s*\d|\s*$)/i,
    /proponente[:\s]+([A-Za-zÀ-ÖØ-öø-ÿ\s]+?)(?:\s*CPF|\s*CNPJ|\s*\d|\s*$)/i,
    /cliente[:\s]+([A-Za-zÀ-ÖØ-öø-ÿ\s]+?)(?:\s*CPF|\s*CNPJ|\s*\d|\s*$)/i,
  ]

  // Tenta cada padrão até encontrar um match
  for (const padrao of padroes) {
    const match = texto.match(padrao)
    if (match && match[1]) {
      // Limpa o nome encontrado
      let nome = match[1].trim()

      // Remove múltiplos espaços
      nome = nome.replace(/\s+/g, " ")

      // Limita o tamanho para evitar nomes muito longos que podem ser falsos positivos
      if (nome.length > 50) {
        nome = nome.substring(0, 50) + "..."
      }

      return nome
    }
  }

  return undefined
}

/**
 * Extrai o valor do prêmio do texto da cotação
 * @param texto Texto completo da cotação
 * @returns Valor do prêmio ou undefined se não encontrado
 */
export function extrairValorPremio(texto: string): number | undefined {
  if (!texto) return undefined

  // Padrões para encontrar o valor do prêmio
  const padroes = [/(prêmio|premio|custo total|valor total|total do seguro)[:\s]*R?\$?\s*([\d.,]+)/i, /R\$\s*([\d.,]+)/]

  // Tenta cada padrão até encontrar um match
  for (const padrao of padroes) {
    const match = texto.match(padrao)
    if (match) {
      // O segundo grupo de captura contém o valor
      const valorStr = match[2] || match[1]
      // Converte para número (formato brasileiro: ponto como separador de milhar, vírgula como decimal)
      return Number.parseFloat(valorStr.replace(".", "").replace(",", "."))
    }
  }

  return undefined
}

/**
 * Extrai a seguradora do texto da cotação
 * @param texto Texto completo da cotação
 * @returns Nome da seguradora ou "Desconhecida" se não encontrada
 */
export function extrairSeguradora(texto: string): string {
  if (!texto) return "Desconhecida"

  const texto_lower = texto.toLowerCase()

  if (texto_lower.includes("porto")) return "Porto Seguro"
  if (texto_lower.includes("azul")) return "Azul Seguros"
  if (texto_lower.includes("hdi")) return "HDI Seguros"
  if (texto_lower.includes("liberty")) return "Liberty"
  if (texto_lower.includes("allianz")) return "Allianz"
  if (texto_lower.includes("bradesco")) return "Bradesco"
  if (texto_lower.includes("tokio") || texto_lower.includes("tókio")) return "Tokio Marine"
  if (texto_lower.includes("mapfre")) return "Mapfre"
  if (texto_lower.includes("zurich")) return "Zurich"
  if (texto_lower.includes("sompo")) return "Sompo"
  if (texto_lower.includes("suhai")) return "Suhai"

  return "Desconhecida"
}
