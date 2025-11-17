export interface Veiculo {
  ID_Veiculo: number;
  COD_Veiculo: string;
  Placa: string;
  TipoVeiculo: string;
  Motorista: string;
  CapacidadeKG: number;
  Ativo: boolean;
}

export interface Carga {
  ID_Carga: number;
  NumeroCarga: string;
  Cidade: string;
  ValorCTE: number;
  DataCTE: string;
  KM: number;
  COD_VEICULO: string;
  Origem?: 'ERP' | 'CSV' | 'Manual';
  Excluido?: boolean;
  MotivoExclusao?: string;
}

export interface ParametroValor {
  ID_Parametro: number;
  Cidade: string;
  TipoVeiculo: string;
  ValorBase: number;
  KM: number;
}

export interface ParametroTaxa {
  ID_Taxa: number;
  Cidade: string;
  Pedagio: number;
  Balsa: number;
  Ambiental: number;
  Chapa: number;
  Outras: number;
}

export interface MotivoSubstituicao {
  ID_Motivo: number;
  Descricao: string;
}

export interface Lancamento {
  ID_Lancamento: number;
  DataFrete: string;
  ID_Veiculo: number;
  Cargas: Carga[];
  Calculo: {
    CidadeBase: string;
    KMBase: number;
    ValorBase: number;
    Pedagio: number;
    Balsa: number;
    Ambiental: number;
    Chapa: number;
    Outras: number;
    ValorTotal: number;
  };
  Usuario: string;
  Motivo?: string;
  Excluido?: boolean;
  MotivoExclusao?: string;
}

export type NewLancamento = Omit<Lancamento, 'ID_Lancamento'>;