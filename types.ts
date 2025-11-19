
export interface Veiculo {
  ID_Veiculo: number;
  COD_Veiculo: string;
  Placa: string;
  TipoVeiculo: string;
  Motorista: string;
  CapacidadeKG: number;
  Ativo: boolean;
  Origem?: 'ERP' | 'CSV' | 'Manual';
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
  MotivoAlteracao?: string;
}

export interface ParametroValor {
  ID_Parametro: number;
  Cidade: string;
  TipoVeiculo: string;
  ValorBase: number;
  KM: number;
  Excluido?: boolean;
  MotivoExclusao?: string;
  MotivoAlteracao?: string;
}

export interface ParametroTaxa {
  ID_Taxa: number;
  Cidade: string;
  Pedagio: number;
  Balsa: number;
  Ambiental: number;
  Chapa: number;
  Outras: number;
  Excluido?: boolean;
  MotivoExclusao?: string;
  MotivoAlteracao?: string;
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

export interface SystemConfig {
    companyName: string;
    logoUrl: string;
}

// Interfaces para Importação de Veículos
export interface VehicleConflict {
    erp: Veiculo;
    local: Veiculo;
    action: 'overwrite' | 'skip';
}

export interface VehicleCheckResult {
    newVehicles: Veiculo[];
    conflicts: VehicleConflict[];
    message: string;
}

// Interfaces para Importação de Cargas
export interface CargaReactivation {
    erp: Carga;
    local: Carga;
    motivoExclusao: string;
    selected: boolean;
}

export interface CargaCheckResult {
    newCargas: Carga[];
    deletedCargas: CargaReactivation[];
    message: string;
    missingVehicles: string[];
}

// Interface de Usuário
export interface Usuario {
    ID_Usuario: number;
    Nome: string;
    Usuario: string;
    Perfil: 'Admin' | 'Operador';
    Ativo: boolean;
    Senha?: string; // Opcional, usado apenas no envio
}

export interface AuthResponse {
    user: Usuario;
    token: string;
}
