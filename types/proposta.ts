export interface Endereco {
  cep: string
  bairro: string
  cidade: string
  estado: string
  numero: string
  logradouro: string
  complemento: string
}

export interface Segurado {
  cpf: string
  nome: string
  email: string
  endereco: Endereco
  telefone: string
  profissao: string
  reside_em: string
  nascimento: string
  estado_civil: string
  renda_mensal: string
  possui_garagem: string
}

export interface Veiculo {
  placa: string
  cambio: string
  chassi: string
  kit_gas: string
  zero_km: string
  blindado: string
  categoria: string
  ano_modelo: string
  codigo_fipe: string
  combustivel: string
  cep_pernoite: string
  marca_modelo: string
  ano_fabricacao: string
  finalidade_uso: string
  dispositivos_antifurto: string
  quantidade_passageiros: string
}

export interface Corretor {
  nome: string
  email: string
  susep: string
  telefone: string
}

export interface Proposta {
  ramo: string
  numero: string
  apolice: string
  codigo_ci: string
  renovacao: string
  tipo_seguro: string
  classe_bonus: string
  vigencia_fim: string
  cia_seguradora: string
  processo_susep: string
  vigencia_inicio: string
}

export interface Cobertura {
  tipo: string
  premio: string
  franquia: string
  limite_indenizacao: string
}

export interface Assistencia {
  carro_reserva: {
    porte: string
    quantidade_dias: string
  }
  assistencia_24h: string
  protecoes_adicionais: {
    franquia: string
    descricao: string
  }[]
}

export interface Valores {
  iof: string
  preco_total: string
  parcelamento: {
    quantidade: string
    valor_parcela: string
  }
  preco_liquido: string
  forma_pagamento: string
}

export interface DadosProposta {
  valores: Valores
  veiculo: Veiculo
  corretor: Corretor
  proposta: Proposta
  segurado: Segurado
  coberturas: Cobertura[]
  assistencias: Assistencia
}

export interface PropostaProcessada {
  id: string
  status: string
  resultado: DadosProposta
  created_at: string
  updated_at: string
}
