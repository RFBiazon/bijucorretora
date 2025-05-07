export const formatarMaiusculas = (texto: string | null | undefined): string => {
  if (!texto) return ""
  return texto.toUpperCase()
}

export const formatarCamposProposta = (proposta: any) => {
  if (!proposta) return proposta

  const propostaFormatada = { ...proposta }

  // Formatar campos da proposta
  if (propostaFormatada.proposta) {
    propostaFormatada.proposta = {
      ...propostaFormatada.proposta,
      numero: formatarMaiusculas(propostaFormatada.proposta.numero),
      tipo_seguro: formatarMaiusculas(propostaFormatada.proposta.tipo_seguro),
      cia_seguradora: formatarMaiusculas(propostaFormatada.proposta.cia_seguradora),
      ramo: formatarMaiusculas(propostaFormatada.proposta.ramo),
      apolice: formatarMaiusculas(propostaFormatada.proposta.apolice),
      codigo_ci: formatarMaiusculas(propostaFormatada.proposta.codigo_ci),
      classe_bonus: formatarMaiusculas(propostaFormatada.proposta.classe_bonus),
    }
  }

  // Formatar campos do segurado
  if (propostaFormatada.segurado) {
    propostaFormatada.segurado = {
      ...propostaFormatada.segurado,
      nome: formatarMaiusculas(propostaFormatada.segurado.nome),
      profissao: formatarMaiusculas(propostaFormatada.segurado.profissao),
      endereco: {
        ...propostaFormatada.segurado.endereco,
        logradouro: formatarMaiusculas(propostaFormatada.segurado.endereco?.logradouro),
        bairro: formatarMaiusculas(propostaFormatada.segurado.endereco?.bairro),
        cidade: formatarMaiusculas(propostaFormatada.segurado.endereco?.cidade),
        estado: formatarMaiusculas(propostaFormatada.segurado.endereco?.estado),
      },
    }
  }

  // Formatar campos do veículo
  if (propostaFormatada.veiculo) {
    propostaFormatada.veiculo = {
      ...propostaFormatada.veiculo,
      marca_modelo: formatarMaiusculas(propostaFormatada.veiculo.marca_modelo),
      combustivel: formatarMaiusculas(propostaFormatada.veiculo.combustivel),
      cambio: formatarMaiusculas(propostaFormatada.veiculo.cambio),
      categoria: formatarMaiusculas(propostaFormatada.veiculo.categoria),
      finalidade_uso: formatarMaiusculas(propostaFormatada.veiculo.finalidade_uso),
    }
  }

  return propostaFormatada
}

export const capitalize = (texto: string | null | undefined): string => {
  if (!texto) return ""
  return texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase()
}

export const capitalizeWords = (texto: string | null | undefined): string => {
  if (!texto) return ""
  return texto
    .toLowerCase()
    .replace(/(?:^|\s|\b)([a-zà-ú])/g, (match) => match.toUpperCase())
}

export const formatarNomeSeguradora = (texto: string | null | undefined): string => {
  if (!texto) return ""
  let nome = texto.replace(/\s*S\.?\s*A\.?\s*$/i, "") // Remove S.A., S. A., S.A, etc. no final
  nome = nome.replace(/\bHDI\b/gi, "HDI") // HDI sempre maiúsculo
  // Unificação de nomes conhecidos
  const aliases: Record<string, string> = {
    "allianz": "Allianz Seguros",
    "allianz seguros": "Allianz Seguros",
    "allianz s.a": "Allianz Seguros",
    "allianz seguros s.a": "Allianz Seguros",
    "itaú": "Itaú Tradicional",
    "itaú tradicional": "Itaú Tradicional",
    "hdi": "HDI Seguros",
    "hdi seguros": "HDI Seguros",
    "bradesco auto/re companhia de seguros": "Bradesco Seguros",
    "bradesco auto re companhia de seguros": "Bradesco Seguros",
    "bradesco companhia de seguros": "Bradesco Seguros",
    "bradesco seguros": "Bradesco Seguros",
    "bradesco": "Bradesco Seguros",
  }
  let nomeKey = nome.toLowerCase().replace(/[^a-zà-ú0-9 ]/gi, "").trim()
  if (aliases[nomeKey]) {
    nome = aliases[nomeKey]
  }
  // Capitalizar as demais palavras
  nome = nome
    .toLowerCase()
    .replace(/(?:^|\s|\b)([a-zà-ú])/g, (match) => match.toUpperCase())
  // Corrigir HDI se ficou minúsculo
  nome = nome.replace(/Hdi/g, "HDI")
  // Corrigir Itaú (ú minúsculo)
  nome = nome.replace(/Ita[uú]/g, "Itaú")
  return nome.trim()
}

export const formatarNomeCorretor = (texto: string | null | undefined): string => {
  if (!texto) return ""
  const regex = /biju\s+corretora?\s*(de)?\s*seguros?\s*ltda?/i
  if (regex.test(texto) || /biju\s+corr\s+segs\s+ltda/i.test(texto)) {
    return "BIJU CORR SEGS LTDA"
  }
  return texto.toUpperCase()
} 