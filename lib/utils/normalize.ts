import { z } from "zod"
import DOMPurify from 'isomorphic-dompurify'

export type PropostaJson = any;

const PropostaSchema = z.object({
  id: z.string().optional(),
  status: z.string().optional(),
  tipo_documento: z.enum(["proposta", "apolice", "endosso", "cancelado"]).optional(),
  valores: z.object({
    iof: z.string().optional(),
    preco_total: z.string().optional(),
    preco_liquido: z.string().optional(),
    forma_pagamento: z.string().optional(),
    parcelamento: z.object({
      quantidade: z.string().optional(),
      valor_parcela: z.string().optional(),
    }).optional(),
  }).optional().nullable(),
  veiculo: z.object({}).optional().nullable(),
  corretor: z.object({}).optional().nullable(),
  proposta: z.object({}).optional().nullable(),
  segurado: z.object({}).optional().nullable(),
  coberturas: z.array(z.any()).optional().nullable(),
  assistencias: z.object({}).optional().nullable(),
  clausulas: z.array(z.any()).optional().nullable(),
  criado_em: z.any().optional(),
  resultado: z.any().optional(),
  created_at: z.any().optional(),
}).passthrough() // Permite campos adicionais

export function normalizarProposta(json: PropostaJson) {
  try {
    const validatedData = PropostaSchema.parse(json);

    // Use sempre o resultado para os campos detalhados
    const base = validatedData.resultado && typeof validatedData.resultado === 'object'
      ? validatedData.resultado
      : {};

    return {
      id: validatedData.id ?? "",
      status: validatedData.status ?? "",
      tipo_documento: (validatedData.tipo_documento as "proposta" | "apolice" | "endosso" | "cancelado") ?? "proposta",
      valores: {
        iof: base.valores?.iof ?? "Não informado",
        preco_total: base.valores?.preco_total ?? "Não informado",
        preco_liquido: base.valores?.preco_liquido ?? "Não informado",
        forma_pagamento: base.valores?.forma_pagamento ?? "Não informado",
        parcelamento: {
          quantidade: base.valores?.parcelamento?.quantidade ?? "1",
          valor_parcela: base.valores?.parcelamento?.valor_parcela ?? base.valores?.preco_total ?? "Não informado",
        },
      },
      veiculo: {
        placa: base.veiculo?.placa ?? "Não informado",
        marca_modelo: base.veiculo?.marca_modelo ?? "Não informado",
        ano_modelo: base.veiculo?.ano_modelo ?? "Não informado",
        ano_fabricacao: base.veiculo?.ano_fabricacao ?? "Não informado",
        chassi: base.veiculo?.chassi ?? "Não informado",
        combustivel: base.veiculo?.combustivel ?? "Não informado",
        finalidade_uso: base.veiculo?.finalidade_uso ?? "Não informado",
        zero_km: base.veiculo?.zero_km ?? "Não",
        blindado: base.veiculo?.blindado ?? "Não",
        kit_gas: base.veiculo?.kit_gas ?? "Não",
        cambio: base.veiculo?.cambio ?? "Não informado",
        quantidade_passageiros: base.veiculo?.quantidade_passageiros ?? "Não informado",
        dispositivos_antifurto: base.veiculo?.dispositivos_antifurto ?? "Não informado",
        categoria: base.veiculo?.categoria ?? "Não informado",
        codigo_fipe: base.veiculo?.codigo_fipe ?? "Não informado",
        cep_pernoite: base.veiculo?.cep_pernoite ?? "Não informado",
      },
      corretor: {
        nome: base.corretor?.nome ?? "Não informado",
        susep: base.corretor?.susep ?? "Não informado",
        telefone: base.corretor?.telefone ?? "Não informado",
        email: base.corretor?.email ?? "Não informado",
      },
      proposta: {
        numero: base.proposta?.numero ?? "Não informado",
        apolice: base.proposta?.apolice ?? "Não informado",
        cia_seguradora: base.proposta?.cia_seguradora ?? "Não informado",
        tipo_seguro: base.proposta?.tipo_seguro ?? "Não informado",
        ramo: base.proposta?.ramo ?? "Não informado",
        codigo_ci: base.proposta?.codigo_ci ?? "Não informado",
        renovacao: base.proposta?.renovacao ?? "Não informado",
        classe_bonus: base.proposta?.classe_bonus ?? "Não informado",
        vigencia_inicio: base.proposta?.vigencia_inicio ?? "Não informado",
        vigencia_fim: base.proposta?.vigencia_fim ?? "Não informado",
        processo_susep: base.proposta?.processo_susep ?? "Não informado",
      },
      segurado: {
        nome: base.segurado?.nome ?? "Não informado",
        cpf: base.segurado?.cpf ?? "Não informado",
        email: base.segurado?.email ?? "Não informado",
        telefone: base.segurado?.telefone ?? "Não informado",
        profissao: base.segurado?.profissao ?? "Não informado",
        reside_em: base.segurado?.reside_em ?? "Não informado",
        nascimento: base.segurado?.nascimento ?? "Não informado",
        estado_civil: base.segurado?.estado_civil ?? "Não informado",
        renda_mensal: base.segurado?.renda_mensal ?? "Não informado",
        possui_garagem: base.segurado?.possui_garagem ?? "Não informado",
        endereco: {
          cep: base.segurado?.endereco?.cep ?? "Não informado",
          logradouro: base.segurado?.endereco?.logradouro ?? "Não informado",
          numero: base.segurado?.endereco?.numero ?? "Não informado",
          complemento: base.segurado?.endereco?.complemento ?? "Não informado",
          bairro: base.segurado?.endereco?.bairro ?? "Não informado",
          cidade: base.segurado?.endereco?.cidade ?? "Não informado",
          estado: base.segurado?.endereco?.estado ?? "Não informado",
        },
      },
      coberturas: Array.isArray(base.coberturas) ? base.coberturas : [],
      assistencias: {
        carro_reserva: {
          porte: base.assistencias?.carro_reserva?.porte ?? "Não informado",
          quantidade_dias: base.assistencias?.carro_reserva?.quantidade_dias ?? "Não informado",
        },
        assistencia_24h: base.assistencias?.assistencia_24h ?? "Não informado",
        protecoes_adicionais: Array.isArray(base.assistencias?.protecoes_adicionais) 
          ? base.assistencias.protecoes_adicionais 
          : [],
      },
      clausulas: Array.isArray(base.clausulas) ? base.clausulas : [],
      criado_em: validatedData.criado_em ?? validatedData.created_at ?? null,
    };
  } catch (error) {
    console.error("Erro ao normalizar proposta:", error);
    // Retorna um objeto com valores padrão em caso de erro
    return {
      id: json.id ?? "",
      status: json.status ?? "",
      tipo_documento: "proposta" as const,
      valores: {
        iof: "Não informado",
        preco_total: "Não informado",
        preco_liquido: "Não informado",
        forma_pagamento: "Não informado",
        parcelamento: {
          quantidade: "1",
          valor_parcela: "Não informado",
        },
      },
      veiculo: {
        placa: "Não informado",
        marca_modelo: "Não informado",
        ano_modelo: "Não informado",
        ano_fabricacao: "Não informado",
        chassi: "Não informado",
        combustivel: "Não informado",
        finalidade_uso: "Não informado",
        zero_km: "Não",
        blindado: "Não",
        kit_gas: "Não",
        cambio: "Não informado",
        quantidade_passageiros: "Não informado",
        dispositivos_antifurto: "Não informado",
        categoria: "Não informado",
        codigo_fipe: "Não informado",
        cep_pernoite: "Não informado",
      },
      corretor: {
        nome: "Não informado",
        susep: "Não informado",
        telefone: "Não informado",
        email: "Não informado",
      },
      proposta: {
        numero: "Não informado",
        apolice: "Não informado",
        cia_seguradora: "Não informado",
        tipo_seguro: "Não informado",
        ramo: "Não informado",
        codigo_ci: "Não informado",
        renovacao: "Não informado",
        classe_bonus: "Não informado",
        vigencia_inicio: "Não informado",
        vigencia_fim: "Não informado",
        processo_susep: "Não informado",
      },
      segurado: {
        nome: "Não informado",
        cpf: "Não informado",
        email: "Não informado",
        telefone: "Não informado",
        profissao: "Não informado",
        reside_em: "Não informado",
        nascimento: "Não informado",
        estado_civil: "Não informado",
        renda_mensal: "Não informado",
        possui_garagem: "Não informado",
        endereco: {
          cep: "Não informado",
          logradouro: "Não informado",
          numero: "Não informado",
          complemento: "Não informado",
          bairro: "Não informado",
          cidade: "Não informado",
          estado: "Não informado",
        },
      },
      coberturas: [],
      assistencias: {
        carro_reserva: {
          porte: "Não informado",
          quantidade_dias: "Não informado",
        },
        assistencia_24h: "Não informado",
        protecoes_adicionais: [],
      },
      clausulas: [],
      criado_em: json.criado_em ?? json.created_at ?? null,
    };
  }
}

export function formatarValorMonetario(valor: string): number {
  if (!valor || valor === "Não informado") return 0;
  
  // Remove R$, pontos e espaços, substitui vírgula por ponto
  const valorNumerico = valor
    .replace(/[R$\s.]/g, "")
    .replace(",", ".");
    
  return parseFloat(valorNumerico) || 0;
}

export function formatarData(data: string): string {
  if (!data || data === "Não informado") return "Não informado";
  
  try {
    // Tenta converter a data para o formato brasileiro
    const [dia, mes, ano] = data.split("/");
    if (dia && mes && ano) {
      return `${dia}/${mes}/${ano}`;
    }
    return data;
  } catch {
    return data;
  }
}

export function sanitizarDados(dados: string): string {
  return DOMPurify.sanitize(dados)
} 