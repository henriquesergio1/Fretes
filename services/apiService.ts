
import { Veiculo, Carga, ParametroValor, ParametroTaxa, MotivoSubstituicao, Lancamento, NewLancamento, VehicleCheckResult, VehicleConflict, CargaCheckResult, CargaReactivation } from '../types.ts';
import * as mockApi from '../api/mockData.ts';
import Papa from 'papaparse';

// =============================================================================
// CONFIGURAÇÃO DE MODO (VIA INJEÇÃO HTML)
// =============================================================================

// Declaração para o TypeScript
declare global {
    interface Window {
        __FRETE_MODO_MOCK__?: boolean;
    }
}

// 1. Função para ler preferência do LocalStorage (Prioridade Máxima - Override do Usuário)
const getStoredMode = (): boolean | null => {
    try {
        const stored = localStorage.getItem('APP_MODE');
        if (stored === 'MOCK') return true;
        if (stored === 'API') return false;
    } catch (e) {
        console.warn('[API SETUP] LocalStorage inacessível:', e);
    }
    return null;
};

// 2. Configuração do HTML (index.html define true, index.prod.html define false)
const getHtmlConfig = (): boolean => {
    if (typeof window !== 'undefined' && window.__FRETE_MODO_MOCK__ !== undefined) {
        return window.__FRETE_MODO_MOCK__;
    }
    // Fallback de segurança: se não estiver definido no HTML, assume API Real (Produção)
    return false;
};

// 3. Determinação Final
// Se o usuário escolheu manualmente, usa a escolha. Se não, usa a config do arquivo HTML.
const USE_MOCK = getStoredMode() ?? getHtmlConfig();

const API_BASE_URL = '/api';

console.log(`[API SERVICE] Inicializando...`);
console.log(`[API SERVICE] HTML Config (window.__FRETE_MODO_MOCK__): ${getHtmlConfig()}`);
console.log(`[API SERVICE] LocalStorage Config: ${getStoredMode() === null ? 'Nenhuma' : (getStoredMode() ? 'Forçar MOCK' : 'Forçar API')}`);
console.log(`[API SERVICE] MODO FINAL ATIVO: ${USE_MOCK ? 'MOCK (Dados Falsos)' : 'API REAL (Backend)'}`);

// 4. Exportações para controle manual via UI
export const toggleMode = (mode: 'MOCK' | 'API') => {
    console.log(`[API SERVICE] Trocando modo para ${mode} e recarregando...`);
    localStorage.setItem('APP_MODE', mode);
    window.location.reload();
};

export const getCurrentMode = () => USE_MOCK ? 'MOCK' : 'API';

// =============================================================================
// UTILITÁRIOS API REAL
// =============================================================================

const handleResponse = async (response: Response) => {
    if (!response.ok) {
        let errorMessage = response.statusText;
        try {
            const errorData = await response.json();
            if (errorData && errorData.message) errorMessage = errorData.message;
        } catch (e) {}
        
        throw new Error(`Erro na API (${response.status}): ${errorMessage}`);
    }
    if (response.status === 204) return;
    return response.json();
};

const apiRequest = async (endpoint: string, method: 'POST' | 'PUT' | 'DELETE', body?: any) => {
    const cleanUrl = API_BASE_URL.replace(/\/$/, '');
    const cleanEndpoint = endpoint.replace(/^\//, '');
    const url = `${cleanUrl}/${cleanEndpoint}`;
    
    const options: RequestInit = {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
    };
    
    try {
        const response = await fetch(url, options);
        return handleResponse(response);
    } catch (error: any) {
        console.error(`[API ERROR] Falha ao conectar em ${url}:`, error);
        throw error; 
    }
};

const apiGet = async (endpoint: string) => {
    const cleanUrl = API_BASE_URL.replace(/\/$/, '');
    const cleanEndpoint = endpoint.replace(/^\//, '');
    const url = `${cleanUrl}/${cleanEndpoint}`;

    try {
        const response = await fetch(url);
        return handleResponse(response);
    } catch (error: any) {
        console.error(`[API ERROR] Falha ao buscar dados de ${url}:`, error);
        throw error;
    }
};

// =============================================================================
// IMPLEMENTAÇÃO DA API REAL
// =============================================================================

const RealService = {
    getVeiculos: (): Promise<Veiculo[]> => apiGet('/veiculos'),
    
    getCargas: async (params?: { veiculoCod?: string, data?: string }): Promise<Carga[]> => {
        let cargas: Carga[] = await apiGet('/cargas-manuais');
        if (params) {
            if (params.data) {
                // CORREÇÃO: Normalizar a data vinda do banco (remove T00:00:00.000Z se existir)
                cargas = cargas.filter(c => {
                    if (!c.DataCTE) return false;
                    const dbDate = String(c.DataCTE).split('T')[0];
                    return dbDate === params.data;
                });
            }
            if (params.veiculoCod) {
                // CORREÇÃO: Normalizar espaços e case para garantir match (ex: "69 " == "69")
                const targetCod = String(params.veiculoCod).trim().toUpperCase();
                cargas = cargas.filter(c => 
                    String(c.COD_VEICULO).trim().toUpperCase() === targetCod
                );
            }
        }
        return cargas.filter(c => !c.Excluido);
    },
    
    getCargasManuais: (): Promise<Carga[]> => apiGet('/cargas-manuais'),
    getParametrosValores: (): Promise<ParametroValor[]> => apiGet('/parametros-valores'),
    getParametrosTaxas: (): Promise<ParametroTaxa[]> => apiGet('/parametros-taxas'),
    getMotivosSubstituicao: (): Promise<MotivoSubstituicao[]> => apiGet('/motivos-substituicao'),
    getLancamentos: (): Promise<Lancamento[]> => apiGet('/lancamentos'),

    createLancamento: (l: NewLancamento): Promise<Lancamento> => apiRequest('/lancamentos', 'POST', l),
    deleteLancamento: (id: number, motivo: string): Promise<void> => apiRequest(`/lancamentos/${id}`, 'PUT', { motivo }),
    
    createVeiculo: (v: Omit<Veiculo, 'ID_Veiculo'>): Promise<Veiculo> => apiRequest('/veiculos', 'POST', v),
    updateVeiculo: (id: number, v: Veiculo): Promise<Veiculo> => apiRequest(`/veiculos/${id}`, 'PUT', v),
    
    createCarga: (c: Omit<Carga, 'ID_Carga'>): Promise<Carga> => apiRequest('/cargas-manuais', 'POST', c),
    updateCarga: (id: number, c: Carga): Promise<Carga> => apiRequest(`/cargas-manuais/${id}`, 'PUT', c),
    deleteCarga: (id: number, motivo: string): Promise<void> => apiRequest(`/cargas-manuais/${id}`, 'PUT', { Excluido: true, MotivoExclusao: motivo }),
    
    createParametroValor: (p: Omit<ParametroValor, 'ID_Parametro'>): Promise<ParametroValor> => apiRequest('/parametros-valores', 'POST', p),
    updateParametroValor: (id: number, p: ParametroValor): Promise<ParametroValor> => apiRequest(`/parametros-valores/${id}`, 'PUT', p),
    // Agora usa PUT para exclusão lógica
    deleteParametroValor: (id: number, motivo: string): Promise<void> => apiRequest(`/parametros-valores/${id}`, 'PUT', { Excluido: true, MotivoExclusao: motivo }),
    
    createParametroTaxa: (p: Omit<ParametroTaxa, 'ID_Taxa'>): Promise<ParametroTaxa> => apiRequest('/parametros-taxas', 'POST', p),
    updateParametroTaxa: (id: number, p: ParametroTaxa): Promise<ParametroTaxa> => apiRequest(`/parametros-taxas/${id}`, 'PUT', p),
    // Agora usa PUT para exclusão lógica
    deleteParametroTaxa: (id: number, motivo: string): Promise<void> => apiRequest(`/parametros-taxas/${id}`, 'PUT', { Excluido: true, MotivoExclusao: motivo }),
    
    // Método Deprecado (Mantido para compatibilidade, mas redirecionando para o novo fluxo)
    importCargasFromERP: async (sIni: string, sFim: string): Promise<{ message: string; count: number }> => {
        // Este método agora faz o fluxo completo (apenas novas) se chamado diretamente, 
        // mas recomendamos usar checkCargasERP + syncCargasERP.
        // Para simplicidade, redirecionamos para a rota antiga se ela ainda existir ou adaptamos.
        // Vamos adaptar para chamar check e depois sync automaticamente (apenas novas)
        const check = await apiRequest('/cargas-erp/check', 'POST', { sIni, sFim });
        if (check.newCargas.length > 0) {
            return apiRequest('/cargas-erp/sync', 'POST', { newCargas: check.newCargas, cargasToReactivate: [] });
        }
        return { message: check.message, count: 0 };
    },

    // Novos métodos para Cargas ERP (Fluxo Check -> Sync)
    checkCargasERP: async (sIni: string, sFim: string): Promise<CargaCheckResult> => {
        return apiRequest('/cargas-erp/check', 'POST', { sIni, sFim });
    },

    syncCargasERP: async (newCargas: Carga[], cargasToReactivate: Carga[]): Promise<{ message: string, count: number }> => {
        return apiRequest('/cargas-erp/sync', 'POST', { newCargas, cargasToReactivate });
    },

    // Métodos para Veículos ERP
    checkVeiculosERP: async (): Promise<VehicleCheckResult> => {
        return apiGet('/veiculos-erp/check');
    },

    syncVeiculosERP: async (newVehicles: Veiculo[], vehiclesToUpdate: Veiculo[]): Promise<{ message: string, count: number }> => {
        return apiRequest('/veiculos-erp/sync', 'POST', { newVehicles, vehiclesToUpdate });
    },
    
    importData: async (file: File, type: string): Promise<any> => {
        throw new Error("A importação de CSV ainda não está implementada no backend real.");
    }
};

// =============================================================================
// IMPLEMENTAÇÃO DA API MOCK
// =============================================================================

const MockService = {
    getVeiculos: mockApi.getMockVeiculos,
    getCargas: mockApi.getMockCargas,
    getCargasManuais: mockApi.getMockCargasManuais,
    getParametrosValores: mockApi.getMockParametrosValores,
    getParametrosTaxas: mockApi.getMockParametrosTaxas,
    getMotivosSubstituicao: mockApi.getMockMotivosSubstituicao,
    getLancamentos: mockApi.getMockLancamentos,
    
    createLancamento: mockApi.createMockLancamento,
    deleteLancamento: mockApi.deleteMockLancamento,
    
    createVeiculo: mockApi.createMockVeiculo,
    updateVeiculo: mockApi.updateMockVeiculo,
    
    createCarga: mockApi.createMockCarga,
    updateCarga: mockApi.updateMockCarga,
    deleteCarga: mockApi.deleteMockCarga,
    
    createParametroValor: mockApi.createMockParametroValor,
    updateParametroValor: mockApi.updateMockParametroValor,
    deleteParametroValor: mockApi.deleteMockParametroValor,
    
    createParametroTaxa: mockApi.createMockParametroTaxa,
    updateParametroTaxa: mockApi.updateMockParametroTaxa,
    deleteParametroTaxa: mockApi.deleteMockParametroTaxa,
    
    importCargasFromERP: mockApi.importMockCargasFromERP,

    // Mock Cargas
    checkCargasERP: async (sIni: string, sFim: string): Promise<CargaCheckResult> => {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    newCargas: [
                        { ID_Carga: 0, NumeroCarga: 'NEW-ERP-001', Cidade: 'Mock City', ValorCTE: 1000, DataCTE: sIni, KM: 100, COD_VEICULO: 'MOCK001', Origem: 'ERP' }
                    ],
                    deletedCargas: [
                        {
                            erp: { ID_Carga: 0, NumeroCarga: 'DEL-ERP-002', Cidade: 'Old City', ValorCTE: 1200, DataCTE: sIni, KM: 120, COD_VEICULO: 'MOCK001', Origem: 'ERP' },
                            local: { ID_Carga: 99, NumeroCarga: 'DEL-ERP-002', Cidade: 'Old City', ValorCTE: 1100, DataCTE: sIni, KM: 120, COD_VEICULO: 'MOCK001', Origem: 'ERP', Excluido: true },
                            motivoExclusao: 'Excluído por engano no mock',
                            selected: false
                        }
                    ],
                    message: 'Check Mock Concluído',
                    missingVehicles: []
                });
            }, 1000);
        });
    },
    syncCargasERP: async (newCargas: Carga[], cargasToReactivate: Carga[]): Promise<{ message: string, count: number }> => {
         return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    message: `(MOCK) Sincronizado. ${newCargas.length} inseridas, ${cargasToReactivate.length} reativadas.`,
                    count: newCargas.length + cargasToReactivate.length
                });
            }, 1000);
        });
    },


    // Mock Veículos
    checkVeiculosERP: async (): Promise<VehicleCheckResult> => {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    newVehicles: [
                        { ID_Veiculo: 0, COD_Veiculo: 'V_ERP_NEW1', Placa: 'NEW-9999', TipoVeiculo: 'Truck', Motorista: 'Motorista ERP Novo', CapacidadeKG: 10000, Ativo: true }
                    ],
                    conflicts: [
                        {
                            local: { ID_Veiculo: 1, COD_Veiculo: 'TRUCK001', Placa: 'ABC-1234', TipoVeiculo: 'Carreta', Motorista: 'João da Silva', CapacidadeKG: 25000, Ativo: true, Origem: 'ERP' },
                            erp: { ID_Veiculo: 0, COD_Veiculo: 'TRUCK001', Placa: 'ABC-1234', TipoVeiculo: 'Carreta ERP', Motorista: 'João Atualizado ERP', CapacidadeKG: 26000, Ativo: true, Origem: 'ERP' },
                            action: 'skip'
                        }
                    ],
                    message: 'Verificação Mock concluída'
                });
            }, 1000);
        });
    },

    syncVeiculosERP: async (newVehicles: Veiculo[], vehiclesToUpdate: Veiculo[]): Promise<{ message: string, count: number }> => {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    message: `(MOCK) Importação concluída. ${newVehicles.length} inseridos, ${vehiclesToUpdate.length} atualizados.`,
                    count: newVehicles.length + vehiclesToUpdate.length
                });
            }, 1000);
        });
    },
    
    importData: async (file: File, type: string): Promise<{ message: string; count: number }> => {
        return new Promise((resolve, reject) => {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: (results: { data: any[] }) => {
                    console.log(`MOCK IMPORT ${type}:`, results.data);
                    resolve({ message: `(MOCK) Arquivo CSV processado.`, count: results.data.length });
                },
                error: (error: any) => reject(new Error('Erro ao ler o arquivo CSV: ' + error.message))
            });
        });
    }
};

// =============================================================================
// EXPORTAÇÕES
// =============================================================================

// A constante USE_MOCK já foi definida no topo do arquivo
export const getVeiculos = USE_MOCK ? MockService.getVeiculos : RealService.getVeiculos;
export const getCargas = USE_MOCK ? MockService.getCargas : RealService.getCargas;
export const getCargasManuais = USE_MOCK ? MockService.getCargasManuais : RealService.getCargasManuais;
export const getParametrosValores = USE_MOCK ? MockService.getParametrosValores : RealService.getParametrosValores;
export const getParametrosTaxas = USE_MOCK ? MockService.getParametrosTaxas : RealService.getParametrosTaxas;
export const getMotivosSubstituicao = USE_MOCK ? MockService.getMotivosSubstituicao : RealService.getMotivosSubstituicao;
export const getLancamentos = USE_MOCK ? MockService.getLancamentos : RealService.getLancamentos;

export const createLancamento = USE_MOCK ? MockService.createLancamento : RealService.createLancamento;
export const deleteLancamento = USE_MOCK ? MockService.deleteLancamento : RealService.deleteLancamento;

export const createVeiculo = USE_MOCK ? MockService.createVeiculo : RealService.createVeiculo;
export const updateVeiculo = USE_MOCK ? MockService.updateVeiculo : RealService.updateVeiculo;

export const createCarga = USE_MOCK ? MockService.createCarga : RealService.createCarga;
export const updateCarga = USE_MOCK ? MockService.updateCarga : RealService.updateCarga;
export const deleteCarga = USE_MOCK ? MockService.deleteCarga : RealService.deleteCarga;

export const createParametroValor = USE_MOCK ? MockService.createParametroValor : RealService.createParametroValor;
export const updateParametroValor = USE_MOCK ? MockService.updateParametroValor : RealService.updateParametroValor;
export const deleteParametroValor = USE_MOCK ? MockService.deleteParametroValor : RealService.deleteParametroValor;

export const createParametroTaxa = USE_MOCK ? MockService.createParametroTaxa : RealService.createParametroTaxa;
export const updateParametroTaxa = USE_MOCK ? MockService.updateParametroTaxa : RealService.updateParametroTaxa;
export const deleteParametroTaxa = USE_MOCK ? MockService.deleteParametroTaxa : RealService.deleteParametroTaxa;

export const importCargasFromERP = USE_MOCK ? MockService.importCargasFromERP : RealService.importCargasFromERP;
export const checkCargasERP = USE_MOCK ? MockService.checkCargasERP : RealService.checkCargasERP;
export const syncCargasERP = USE_MOCK ? MockService.syncCargasERP : RealService.syncCargasERP;

export const checkVeiculosERP = USE_MOCK ? MockService.checkVeiculosERP : RealService.checkVeiculosERP;
export const syncVeiculosERP = USE_MOCK ? MockService.syncVeiculosERP : RealService.syncVeiculosERP;

export const importData = USE_MOCK ? MockService.importData : RealService.importData;
