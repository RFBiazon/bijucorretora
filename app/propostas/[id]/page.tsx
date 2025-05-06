"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { supabase } from "@/lib/supabase"
import type { DadosProposta, PropostaProcessada } from "@/types/proposta"
import {
  User,
  Car,
  Shield,
  Phone,
  Building,
  CreditCard,
  FileText,
  Save,
  ArrowLeft,
  Loader2,
  AlertCircle,
} from "lucide-react"
import { cloneDeep } from "lodash"

export default function PropostaDetalhesPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [proposta, setProposta] = useState<PropostaProcessada | null>(null)
  const [editedProposta, setEditedProposta] = useState<DadosProposta | null>(null)
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    const fetchProposta = async () => {
      if (!params.id) return

      try {
        setIsLoading(true)
        const { data, error } = await supabase.from("ocr_processamento").select("*").eq("id", params.id).maybeSingle()

        if (error) {
          throw error
        }

        if (data) {
          setProposta(data)
          setEditedProposta(cloneDeep(data.resultado))
        }
      } catch (error) {
        console.error("Erro ao buscar proposta:", error)
        toast({
          title: "Erro ao carregar proposta",
          description: "Não foi possível carregar os detalhes da proposta.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchProposta()
  }, [params.id, toast])

  const handleInputChange = (
    section: keyof DadosProposta,
    field: string,
    value: string,
    nestedField?: string,
    nestedSubField?: string,
  ) => {
    if (!editedProposta) return

    setEditedProposta((prev) => {
      if (!prev) return prev

      const updated = { ...prev }

      if (nestedField && nestedSubField) {
        // Handle deeply nested fields (e.g., segurado.endereco.cep)
        updated[section] = {
          ...updated[section],
          [nestedField]: {
            ...updated[section][nestedField],
            [nestedSubField]: value,
          },
        }
      } else if (nestedField) {
        // Handle nested fields (e.g., proposta.numero)
        updated[section] = {
          ...updated[section],
          [nestedField]: value,
        }
      } else {
        // Handle direct fields
        updated[section][field] = value
      }

      return updated
    })
  }

  const handleSave = async () => {
    if (!proposta || !editedProposta) return

    try {
      setIsSaving(true)

      const { error } = await supabase
        .from("ocr_processamento")
        .update({ resultado: editedProposta })
        .eq("id", proposta.id)

      if (error) {
        throw error
      }

      setProposta({
        ...proposta,
        resultado: editedProposta,
      })

      setIsEditing(false)
      toast({
        title: "Alterações salvas",
        description: "As alterações foram salvas com sucesso.",
      })
    } catch (error) {
      console.error("Erro ao salvar alterações:", error)
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as alterações. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="container py-8 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Carregando detalhes da proposta...</p>
        </div>
      </div>
    )
  }

  if (!proposta || !editedProposta) {
    return (
      <div className="container py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Proposta não encontrada</h3>
            <p className="text-muted-foreground text-center max-w-md mb-6">
              Não foi possível encontrar a proposta solicitada ou ela ainda está em processamento.
            </p>
            <Button onClick={() => router.push("/propostas")}>Voltar para propostas</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (proposta.status !== "concluido") {
    return (
      <div className="container py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <h3 className="text-xl font-semibold mb-2">Proposta em processamento</h3>
            <p className="text-muted-foreground text-center max-w-md mb-6">
              Esta proposta ainda está sendo processada. Por favor, aguarde alguns instantes e tente novamente.
            </p>
            <Button onClick={() => router.push("/propostas")}>Voltar para propostas</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Proposta {editedProposta.proposta.numero || "#" + proposta.id.substring(0, 8)}
          </h1>
          <p className="text-muted-foreground">
            {editedProposta.proposta.cia_seguradora || "Seguradora não identificada"}
          </p>
        </div>
        <div className="flex items-center gap-4 mt-4 md:mt-0">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)} disabled={isSaving}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Salvar alterações
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => router.push("/propostas")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
              <Button onClick={() => setIsEditing(true)}>Editar dados</Button>
            </>
          )}
        </div>
      </div>

      <Tabs defaultValue="proposta">
        <TabsList className="mb-6">
          <TabsTrigger value="proposta">
            <FileText className="h-4 w-4 mr-2" />
            Proposta
          </TabsTrigger>
          <TabsTrigger value="segurado">
            <User className="h-4 w-4 mr-2" />
            Segurado
          </TabsTrigger>
          <TabsTrigger value="veiculo">
            <Car className="h-4 w-4 mr-2" />
            Veículo
          </TabsTrigger>
          <TabsTrigger value="corretor">
            <Building className="h-4 w-4 mr-2" />
            Corretor
          </TabsTrigger>
          <TabsTrigger value="valores">
            <CreditCard className="h-4 w-4 mr-2" />
            Valores
          </TabsTrigger>
        </TabsList>

        <TabsContent value="proposta">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Informações Básicas</CardTitle>
                <CardDescription>Dados principais da proposta</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3">
                  <Label htmlFor="numero">Número da Proposta</Label>
                  <Input
                    id="numero"
                    value={editedProposta.proposta.numero || ""}
                    onChange={(e) => handleInputChange("proposta", "numero", e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="tipo_seguro">Tipo de Seguro</Label>
                  <Input
                    id="tipo_seguro"
                    value={editedProposta.proposta.tipo_seguro || ""}
                    onChange={(e) => handleInputChange("proposta", "tipo_seguro", e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="cia_seguradora">Seguradora</Label>
                  <Input
                    id="cia_seguradora"
                    value={editedProposta.proposta.cia_seguradora || ""}
                    onChange={(e) => handleInputChange("proposta", "cia_seguradora", e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-3">
                    <Label htmlFor="vigencia_inicio">Início da Vigência</Label>
                    <Input
                      id="vigencia_inicio"
                      value={editedProposta.proposta.vigencia_inicio || ""}
                      onChange={(e) => handleInputChange("proposta", "vigencia_inicio", e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="grid gap-3">
                    <Label htmlFor="vigencia_fim">Fim da Vigência</Label>
                    <Input
                      id="vigencia_fim"
                      value={editedProposta.proposta.vigencia_fim || ""}
                      onChange={(e) => handleInputChange("proposta", "vigencia_fim", e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Detalhes Adicionais</CardTitle>
                <CardDescription>Informações complementares</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3">
                  <Label htmlFor="ramo">Ramo</Label>
                  <Input
                    id="ramo"
                    value={editedProposta.proposta.ramo || ""}
                    onChange={(e) => handleInputChange("proposta", "ramo", e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="apolice">Apólice</Label>
                  <Input
                    id="apolice"
                    value={editedProposta.proposta.apolice || ""}
                    onChange={(e) => handleInputChange("proposta", "apolice", e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="codigo_ci">Código CI</Label>
                  <Input
                    id="codigo_ci"
                    value={editedProposta.proposta.codigo_ci || ""}
                    onChange={(e) => handleInputChange("proposta", "codigo_ci", e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="classe_bonus">Classe Bônus</Label>
                  <Input
                    id="classe_bonus"
                    value={editedProposta.proposta.classe_bonus || ""}
                    onChange={(e) => handleInputChange("proposta", "classe_bonus", e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Outras abas permanecem iguais */}
        <TabsContent value="segurado">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Dados Pessoais</CardTitle>
                <CardDescription>Informações do segurado</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3">
                  <Label htmlFor="nome">Nome</Label>
                  <Input
                    id="nome"
                    value={editedProposta.segurado.nome || ""}
                    onChange={(e) => handleInputChange("segurado", "nome", e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="cpf">CPF</Label>
                  <Input
                    id="cpf"
                    value={editedProposta.segurado.cpf || ""}
                    onChange={(e) => handleInputChange("segurado", "cpf", e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="nascimento">Data de Nascimento</Label>
                  <Input
                    id="nascimento"
                    value={editedProposta.segurado.nascimento || ""}
                    onChange={(e) => handleInputChange("segurado", "nascimento", e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="estado_civil">Estado Civil</Label>
                  <Input
                    id="estado_civil"
                    value={editedProposta.segurado.estado_civil || ""}
                    onChange={(e) => handleInputChange("segurado", "estado_civil", e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="profissao">Profissão</Label>
                  <Input
                    id="profissao"
                    value={editedProposta.segurado.profissao || ""}
                    onChange={(e) => handleInputChange("segurado", "profissao", e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Contato</CardTitle>
                  <CardDescription>Informações de contato</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      value={editedProposta.segurado.email || ""}
                      onChange={(e) => handleInputChange("segurado", "email", e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="grid gap-3">
                    <Label htmlFor="telefone">Telefone</Label>
                    <Input
                      id="telefone"
                      value={editedProposta.segurado.telefone || ""}
                      onChange={(e) => handleInputChange("segurado", "telefone", e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Endereço</CardTitle>
                  <CardDescription>Localização do segurado</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3">
                    <Label htmlFor="logradouro">Logradouro</Label>
                    <Input
                      id="logradouro"
                      value={editedProposta.segurado.endereco.logradouro || ""}
                      onChange={(e) =>
                        handleInputChange("segurado", "endereco", e.target.value, "endereco", "logradouro")
                      }
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-3">
                      <Label htmlFor="numero">Número</Label>
                      <Input
                        id="numero"
                        value={editedProposta.segurado.endereco.numero || ""}
                        onChange={(e) =>
                          handleInputChange("segurado", "endereco", e.target.value, "endereco", "numero")
                        }
                        disabled={!isEditing}
                      />
                    </div>
                    <div className="grid gap-3">
                      <Label htmlFor="complemento">Complemento</Label>
                      <Input
                        id="complemento"
                        value={editedProposta.segurado.endereco.complemento || ""}
                        onChange={(e) =>
                          handleInputChange("segurado", "endereco", e.target.value, "endereco", "complemento")
                        }
                        disabled={!isEditing}
                      />
                    </div>
                  </div>
                  <div className="grid gap-3">
                    <Label htmlFor="bairro">Bairro</Label>
                    <Input
                      id="bairro"
                      value={editedProposta.segurado.endereco.bairro || ""}
                      onChange={(e) => handleInputChange("segurado", "endereco", e.target.value, "endereco", "bairro")}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-3">
                      <Label htmlFor="cidade">Cidade</Label>
                      <Input
                        id="cidade"
                        value={editedProposta.segurado.endereco.cidade || ""}
                        onChange={(e) =>
                          handleInputChange("segurado", "endereco", e.target.value, "endereco", "cidade")
                        }
                        disabled={!isEditing}
                      />
                    </div>
                    <div className="grid gap-3">
                      <Label htmlFor="estado">Estado</Label>
                      <Input
                        id="estado"
                        value={editedProposta.segurado.endereco.estado || ""}
                        onChange={(e) =>
                          handleInputChange("segurado", "endereco", e.target.value, "endereco", "estado")
                        }
                        disabled={!isEditing}
                      />
                    </div>
                  </div>
                  <div className="grid gap-3">
                    <Label htmlFor="cep">CEP</Label>
                    <Input
                      id="cep"
                      value={editedProposta.segurado.endereco.cep || ""}
                      onChange={(e) => handleInputChange("segurado", "endereco", e.target.value, "endereco", "cep")}
                      disabled={!isEditing}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="veiculo">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Informações Básicas</CardTitle>
                <CardDescription>Dados principais do veículo</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3">
                  <Label htmlFor="marca_modelo">Marca/Modelo</Label>
                  <Input
                    id="marca_modelo"
                    value={editedProposta.veiculo.marca_modelo || ""}
                    onChange={(e) => handleInputChange("veiculo", "marca_modelo", e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-3">
                    <Label htmlFor="ano_fabricacao">Ano de Fabricação</Label>
                    <Input
                      id="ano_fabricacao"
                      value={editedProposta.veiculo.ano_fabricacao || ""}
                      onChange={(e) => handleInputChange("veiculo", "ano_fabricacao", e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="grid gap-3">
                    <Label htmlFor="ano_modelo">Ano do Modelo</Label>
                    <Input
                      id="ano_modelo"
                      value={editedProposta.veiculo.ano_modelo || ""}
                      onChange={(e) => handleInputChange("veiculo", "ano_modelo", e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="placa">Placa</Label>
                  <Input
                    id="placa"
                    value={editedProposta.veiculo.placa || ""}
                    onChange={(e) => handleInputChange("veiculo", "placa", e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="chassi">Chassi</Label>
                  <Input
                    id="chassi"
                    value={editedProposta.veiculo.chassi || ""}
                    onChange={(e) => handleInputChange("veiculo", "chassi", e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="codigo_fipe">Código FIPE</Label>
                  <Input
                    id="codigo_fipe"
                    value={editedProposta.veiculo.codigo_fipe || ""}
                    onChange={(e) => handleInputChange("veiculo", "codigo_fipe", e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Características</CardTitle>
                <CardDescription>Detalhes do veículo</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3">
                  <Label htmlFor="combustivel">Combustível</Label>
                  <Input
                    id="combustivel"
                    value={editedProposta.veiculo.combustivel || ""}
                    onChange={(e) => handleInputChange("veiculo", "combustivel", e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="cambio">Câmbio</Label>
                  <Input
                    id="cambio"
                    value={editedProposta.veiculo.cambio || ""}
                    onChange={(e) => handleInputChange("veiculo", "cambio", e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="categoria">Categoria</Label>
                  <Input
                    id="categoria"
                    value={editedProposta.veiculo.categoria || ""}
                    onChange={(e) => handleInputChange("veiculo", "categoria", e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="grid gap-3">
                    <Label htmlFor="kit_gas">Kit Gás</Label>
                    <Input
                      id="kit_gas"
                      value={editedProposta.veiculo.kit_gas || ""}
                      onChange={(e) => handleInputChange("veiculo", "kit_gas", e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="grid gap-3">
                    <Label htmlFor="blindado">Blindado</Label>
                    <Input
                      id="blindado"
                      value={editedProposta.veiculo.blindado || ""}
                      onChange={(e) => handleInputChange("veiculo", "blindado", e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="grid gap-3">
                    <Label htmlFor="zero_km">Zero KM</Label>
                    <Input
                      id="zero_km"
                      value={editedProposta.veiculo.zero_km || ""}
                      onChange={(e) => handleInputChange("veiculo", "zero_km", e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="finalidade_uso">Finalidade de Uso</Label>
                  <Input
                    id="finalidade_uso"
                    value={editedProposta.veiculo.finalidade_uso || ""}
                    onChange={(e) => handleInputChange("veiculo", "finalidade_uso", e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="coberturas">
          <div className="space-y-6">
            {editedProposta.coberturas &&
              editedProposta.coberturas.map((cobertura, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle>{cobertura.tipo || `Cobertura ${index + 1}`}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-3">
                      <Label htmlFor={`cobertura-tipo-${index}`}>Tipo</Label>
                      <Input
                        id={`cobertura-tipo-${index}`}
                        value={cobertura.tipo || ""}
                        onChange={(e) => {
                          const newCoberturas = [...editedProposta.coberturas]
                          newCoberturas[index] = { ...newCoberturas[index], tipo: e.target.value }
                          setEditedProposta({ ...editedProposta, coberturas: newCoberturas })
                        }}
                        disabled={!isEditing}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-3">
                        <Label htmlFor={`cobertura-franquia-${index}`}>Franquia</Label>
                        <Input
                          id={`cobertura-franquia-${index}`}
                          value={cobertura.franquia || ""}
                          onChange={(e) => {
                            const newCoberturas = [...editedProposta.coberturas]
                            newCoberturas[index] = { ...newCoberturas[index], franquia: e.target.value }
                            setEditedProposta({ ...editedProposta, coberturas: newCoberturas })
                          }}
                          disabled={!isEditing}
                        />
                      </div>
                      <div className="grid gap-3">
                        <Label htmlFor={`cobertura-limite-${index}`}>Limite de Indenização</Label>
                        <Input
                          id={`cobertura-limite-${index}`}
                          value={cobertura.limite_indenizacao || ""}
                          onChange={(e) => {
                            const newCoberturas = [...editedProposta.coberturas]
                            newCoberturas[index] = { ...newCoberturas[index], limite_indenizacao: e.target.value }
                            setEditedProposta({ ...editedProposta, coberturas: newCoberturas })
                          }}
                          disabled={!isEditing}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>

        <TabsContent value="assistencias">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Carro Reserva</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-3">
                    <Label htmlFor="carro-reserva-porte">Porte</Label>
                    <Input
                      id="carro-reserva-porte"
                      value={editedProposta.assistencias?.carro_reserva?.porte || ""}
                      onChange={(e) => {
                        setEditedProposta({
                          ...editedProposta,
                          assistencias: {
                            ...editedProposta.assistencias,
                            carro_reserva: {
                              ...editedProposta.assistencias.carro_reserva,
                              porte: e.target.value,
                            },
                          },
                        })
                      }}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="grid gap-3">
                    <Label htmlFor="carro-reserva-dias">Quantidade de Dias</Label>
                    <Input
                      id="carro-reserva-dias"
                      value={editedProposta.assistencias?.carro_reserva?.quantidade_dias || ""}
                      onChange={(e) => {
                        setEditedProposta({
                          ...editedProposta,
                          assistencias: {
                            ...editedProposta.assistencias,
                            carro_reserva: {
                              ...editedProposta.assistencias.carro_reserva,
                              quantidade_dias: e.target.value,
                            },
                          },
                        })
                      }}
                      disabled={!isEditing}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Assistência 24h</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  <Label htmlFor="assistencia-24h">Descrição</Label>
                  <Input
                    id="assistencia-24h"
                    value={editedProposta.assistencias?.assistencia_24h || ""}
                    onChange={(e) => {
                      setEditedProposta({
                        ...editedProposta,
                        assistencias: {
                          ...editedProposta.assistencias,
                          assistencia_24h: e.target.value,
                        },
                      })
                    }}
                    disabled={!isEditing}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="corretor">
          <Card>
            <CardHeader>
              <CardTitle>Dados do Corretor</CardTitle>
              <CardDescription>Informações do corretor responsável</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3">
                <Label htmlFor="corretor-nome">Nome</Label>
                <Input
                  id="corretor-nome"
                  value={editedProposta.corretor?.nome || ""}
                  onChange={(e) => handleInputChange("corretor", "nome", e.target.value)}
                  disabled={!isEditing}
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="corretor-susep">SUSEP</Label>
                <Input
                  id="corretor-susep"
                  value={editedProposta.corretor?.susep || ""}
                  onChange={(e) => handleInputChange("corretor", "susep", e.target.value)}
                  disabled={!isEditing}
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="corretor-email">Email</Label>
                <Input
                  id="corretor-email"
                  value={editedProposta.corretor?.email || ""}
                  onChange={(e) => handleInputChange("corretor", "email", e.target.value)}
                  disabled={!isEditing}
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="corretor-telefone">Telefone</Label>
                <Input
                  id="corretor-telefone"
                  value={editedProposta.corretor?.telefone || ""}
                  onChange={(e) => handleInputChange("corretor", "telefone", e.target.value)}
                  disabled={!isEditing}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="valores">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Valores</CardTitle>
                <CardDescription>Informações financeiras</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3">
                  <Label htmlFor="preco-total">Preço Total</Label>
                  <Input
                    id="preco-total"
                    value={editedProposta.valores?.preco_total || ""}
                    onChange={(e) => handleInputChange("valores", "preco_total", e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="preco-liquido">Preço Líquido</Label>
                  <Input
                    id="preco-liquido"
                    value={editedProposta.valores?.preco_liquido || ""}
                    onChange={(e) => handleInputChange("valores", "preco_liquido", e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="iof">IOF</Label>
                  <Input
                    id="iof"
                    value={editedProposta.valores?.iof || ""}
                    onChange={(e) => handleInputChange("valores", "iof", e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pagamento</CardTitle>
                <CardDescription>Forma de pagamento e parcelamento</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3">
                  <Label htmlFor="forma-pagamento">Forma de Pagamento</Label>
                  <Input
                    id="forma-pagamento"
                    value={editedProposta.valores?.forma_pagamento || ""}
                    onChange={(e) => handleInputChange("valores", "forma_pagamento", e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-3">
                    <Label htmlFor="parcelas-quantidade">Quantidade de Parcelas</Label>
                    <Input
                      id="parcelas-quantidade"
                      value={editedProposta.valores?.parcelamento?.quantidade || ""}
                      onChange={(e) => {
                        setEditedProposta({
                          ...editedProposta,
                          valores: {
                            ...editedProposta.valores,
                            parcelamento: {
                              ...editedProposta.valores.parcelamento,
                              quantidade: e.target.value,
                            },
                          },
                        })
                      }}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="grid gap-3">
                    <Label htmlFor="parcelas-valor">Valor da Parcela</Label>
                    <Input
                      id="parcelas-valor"
                      value={editedProposta.valores?.parcelamento?.valor_parcela || ""}
                      onChange={(e) => {
                        setEditedProposta({
                          ...editedProposta,
                          valores: {
                            ...editedProposta.valores,
                            parcelamento: {
                              ...editedProposta.valores.parcelamento,
                              valor_parcela: e.target.value,
                            },
                          },
                        })
                      }}
                      disabled={!isEditing}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="todas" className="space-y-4">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader className="pb-2">
                    <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                  </CardContent>
                  <CardFooter>
                    <div className="h-9 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : propostasFiltradas.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {propostasFiltradas.map((proposta) => renderPropostaCard(proposta))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                {searchTerm ? (
                  <>
                    <Search className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Nenhuma proposta encontrada</h3>
                    <p className="text-muted-foreground text-center max-w-md mb-6">
                      Não encontramos propostas correspondentes à sua busca. Tente outros termos.
                    </p>
                    <Button variant="outline" onClick={() => setSearchTerm("")}>
                      Limpar busca
                    </Button>
                  </>
                ) : (
                  <>
                    <FilePlus className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Nenhuma proposta encontrada</h3>
                    <p className="text-muted-foreground text-center max-w-md mb-6">
                      Você ainda não tem propostas processadas. Envie um PDF para começar.
                    </p>
                    <Button asChild>
                      <Link href="/propostas/upload">
                        <FileUpload className="mr-2 h-4 w-4" />
                        Nova Proposta
                      </Link>
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}