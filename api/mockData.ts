import { Veiculo, Carga, ParametroValor, ParametroTaxa, MotivoSubstituicao, Lancamento, NewLancamento } from '../types';

// --- MOCK DATA ---
// Simula o estado do banco de dados para desenvolvimento offline.

// Veículos
const mockVeiculos: Veiculo[] = [
    { ID_Veiculo: 1, COD_Veiculo: 'TRUCK001', Placa: 'ABC-1234', TipoVeiculo: 'Carreta', Motorista: 'João da Silva', CapacidadeKG: 25000, Ativo: true },
    { ID_Veiculo: 2, COD_Veiculo: 'TRUCK002', Placa: 'DEF-5678', TipoVeiculo: 'Truck', Motorista: 'Maria Oliveira', CapacidadeKG: 12000, Ativo: true },
    { ID_Veiculo: 3, COD_Veiculo: 'VAN001', Placa: 'GHI-9012', TipoVeiculo: 'VUC', Motorista: 'Pedro Martins', CapacidadeKG: 3000, Ativo: false },
    { ID_Veiculo: 4, COD_Veiculo: 'TRUCK003', Placa: 'JKL-3456', TipoVeiculo: 'Carreta', Motorista: 'Carlos Pereira', CapacidadeKG: 27000, Ativo: true },
];

// Cargas (Manuais e do ERP)
let mockCargas: Carga[] = [
    { ID_Carga: 1, NumeroCarga: 'ERP-77890', Cidade: 'Belo Horizonte', ValorCTE: 1200.50, DataCTE: '2024-05-20', KM: 350, COD_VEICULO: 'TRUCK001', Origem: 'ERP' },
    { ID_Carga: 2, NumeroCarga: 'ERP-77891', Cidade: 'Rio de Janeiro', ValorCTE: 1850.00, DataCTE: '2024-05-21', KM: 450, COD_VEICULO: 'TRUCK001', Origem: 'ERP' },
    { ID_Carga: 3, NumeroCarga: 'ERP-77892', Cidade: 'Curitiba', ValorCTE: 2200.75, DataCTE: '2024-05-22', KM: 850, COD_VEICULO: 'TRUCK003', Origem: 'ERP' },
    { ID_Carga: 4, NumeroCarga: 'MAN-001', Cidade: 'Campinas', ValorCTE: 500.00, DataCTE: '2024-05-23', KM: 95, COD_VEICULO: 'TRUCK002', Origem: 'Manual' },
    { ID_Carga: 5, NumeroCarga: 'MAN-002', Cidade: 'Santos', ValorCTE: 450.00, DataCTE: '2024-05-24', KM: 75, COD_VEICULO: 'TRUCK002', Excluido: true, MotivoExclusao: 'Lançamento duplicado', Origem: 'Manual' },
    { ID_Carga: 6, NumeroCarga: 'CSV-001', Cidade: 'Goiania', ValorCTE: 3100.00, DataCTE: '2024-05-25', KM: 950, COD_VEICULO: 'TRUCK003', Origem: 'CSV' },
];

// Parâmetros de Valor
const mockParametrosValores: ParametroValor[] = [
    { ID_Parametro: 1, Cidade: 'Qualquer', TipoVeiculo: 'Carreta', ValorBase: 1500, KM: 0 },
    { ID_Parametro: 2, Cidade: 'Qualquer', TipoVeiculo: 'Truck', ValorBase: 1000, KM: 0 },
    { ID_Parametro: 3, Cidade: 'Qualquer', TipoVeiculo: 'VUC', ValorBase: 500, KM: 0 },
    { ID_Parametro: 4, Cidade: 'Belo Horizonte', TipoVeiculo: 'Carreta', ValorBase: 2200, KM: 350 },
    { ID_Parametro: 5, Cidade: 'Rio de Janeiro', TipoVeiculo: 'Carreta', ValorBase: 1800, KM: 450 },
    { ID_Parametro: 6, Cidade: 'Curitiba', TipoVeiculo: 'Carreta', ValorBase: 1750, KM: 850 },
];

// Parâmetros de Taxas
const mockParametrosTaxas: ParametroTaxa[] = [
    { ID_Taxa: 1, Cidade: 'Belo Horizonte', Pedagio: 50.50, Balsa: 0, Ambiental: 0, Chapa: 100, Outras: 10 },
    { ID_Taxa: 2, Cidade: 'Rio de Janeiro', Pedagio: 75.00, Balsa: 0, Ambiental: 20, Chapa: 150, Outras: 0 },
    { ID_Taxa: 3, Cidade: 'Curitiba', Pedagio: 120.00, Balsa: 0, Ambiental: 0, Chapa: 0, Outras: 30 },
    { ID_Taxa: 4, Cidade: 'Campinas', Pedagio: 25.00, Balsa: 0, Ambiental: 0, Chapa: 0, Outras: 0 },
];

// Motivos de Substituição
const mockMotivosSubstituicao: MotivoSubstituicao[] = [
    { ID_Motivo: 1, Descricao: 'Correção de valor' },
    { ID_Motivo: 2, Descricao: 'Alteração de rota' },
    { ID_Motivo: 3, Descricao: 'Lançamento indevido' },
    { ID_Motivo: 4, Descricao: 'Outro' },
];

// Lançamentos
let mockLancamentos: Lancamento[] = [
    {
        ID_Lancamento: 1,
        DataFrete: '2024-05-21',
        ID_Veiculo: 1,
        Cargas: [mockCargas[0], mockCargas[1]],
        Calculo: { CidadeBase: 'Rio de Janeiro', KMBase: 450, ValorBase: 1800, Pedagio: 125.50, Balsa: 0, Ambiental: 20, Chapa: 250, Outras: 10, ValorTotal: 2205.50 },
        Usuario: 'sistema',
        Excluido: false,
    },
    {
        ID_Lancamento: 2,
        DataFrete: '2024-05-22',
        ID_Veiculo: 4,
        Cargas: [mockCargas[2]],
        Calculo: { CidadeBase: 'Curitiba', KMBase: 850, ValorBase: 1750, Pedagio: 120.00, Balsa: 0, Ambiental: 0, Chapa: 0, Outras: 30, ValorTotal: 1900.00 },
        Usuario: 'sistema',
        Motivo: 'Correção de valor',
        Excluido: false,
    },
     {
        ID_Lancamento: 3,
        DataFrete: '2024-05-20',
        ID_Veiculo: 1,
        Cargas: [mockCargas[0]],
        Calculo: { CidadeBase: 'Belo Horizonte', KMBase: 350, ValorBase: 2200, Pedagio: 50.50, Balsa: 0, Ambiental: 0, Chapa: 100, Outras: 10, ValorTotal: 2360.50 },
        Usuario: 'sistema',
        Excluido: true,
        MotivoExclusao: 'Lançamento incorreto.'
    },
];

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));


// --- Funções Mock ---
export const getMockVeiculos = async (): Promise<Veiculo[]> => {
    await delay(100);
    return Promise.resolve([...mockVeiculos]);
};

export const getMockCargas = async (params?: { veiculoCod?: string, data?: string }): Promise<Carga[]> => {
    await delay(100);
    let cargas = [...mockCargas];
    if (params) {
        if (params.data) {
            cargas = cargas.filter(c => c.DataCTE === params.data);
        }
        if (params.veiculoCod) {
            cargas = cargas.filter(c => c.COD_VEICULO === params.veiculoCod);
        }
    }
    return Promise.resolve(cargas);
};

export const getMockCargasManuais = async (): Promise<Carga[]> => {
    await delay(100);
    return Promise.resolve(mockCargas);
};

export const getMockParametrosValores = async (): Promise<ParametroValor[]> => {
    await delay(100);
    return Promise.resolve([...mockParametrosValores]);
};

export const getMockParametrosTaxas = async (): Promise<ParametroTaxa[]> => {
    await delay(100);
    return Promise.resolve([...mockParametrosTaxas]);
};

export const getMockMotivosSubstituicao = async (): Promise<MotivoSubstituicao[]> => {
    return Promise.resolve([...mockMotivosSubstituicao]);
};

export const getMockLancamentos = async (): Promise<Lancamento[]> => {
    await delay(150);
    return Promise.resolve([...mockLancamentos]);
};

export const importMockCargasFromERP = async (startDate: string, endDate: string): Promise<{ message: string; count: number }> => {
    await delay(1500);
    const count = Math.floor(Math.random() * 10) + 1; // Simulate importing 1 to 10 cargas
    const newCargas: Carga[] = Array.from({ length: count }, (_, i) => ({
        ID_Carga: Math.max(...mockCargas.map(c => c.ID_Carga)) + 1 + i,
        NumeroCarga: `ERP-SIM-${Math.floor(Math.random() * 10000)}`,
        Cidade: ['Sao Paulo', 'Goiania', 'Brasilia'][Math.floor(Math.random() * 3)],
        ValorCTE: Math.random() * 2000 + 500,
        DataCTE: startDate,
        KM: Math.random() * 500 + 50,
        COD_VEICULO: ['TRUCK001', 'TRUCK002', 'TRUCK003'][Math.floor(Math.random() * 3)],
        Origem: 'ERP',
    }));
    mockCargas.push(...newCargas);
    console.log(`MOCK IMPORT: Adicionando ${count} cargas entre ${startDate} e ${endDate}`);
    return { message: `${count} novas cargas importadas do ERP com sucesso.`, count };
};

export const createMockVeiculo = async (veiculo: Omit<Veiculo, 'ID_Veiculo'>): Promise<Veiculo> => {
    await delay(100);
    const newId = Math.max(0, ...mockVeiculos.map(v => v.ID_Veiculo)) + 1;
    const newVeiculo: Veiculo = { ...veiculo, ID_Veiculo: newId };
    mockVeiculos.push(newVeiculo);
    return Promise.resolve(newVeiculo);
};

export const updateMockVeiculo = async (id: number, veiculo: Veiculo): Promise<Veiculo> => {
    await delay(100);
    const index = mockVeiculos.findIndex(v => v.ID_Veiculo === id);
    if (index === -1) return Promise.reject(new Error("Veículo não encontrado"));
    mockVeiculos[index] = { ...veiculo };
    return Promise.resolve(mockVeiculos[index]);
};

export const createMockCarga = async (carga: Omit<Carga, 'ID_Carga'>): Promise<Carga> => {
    await delay(100);
    const newId = Math.max(0, ...mockCargas.map(c => c.ID_Carga)) + 1;
    const newCarga: Carga = { ...carga, ID_Carga: newId, Origem: carga.Origem || 'Manual' };
    mockCargas.push(newCarga);
    return Promise.resolve(newCarga);
};

export const updateMockCarga = async (id: number, carga: Carga): Promise<Carga> => {
    await delay(100);
    const index = mockCargas.findIndex(c => c.ID_Carga === id);
    if (index === -1) return Promise.reject(new Error("Carga não encontrada"));
    mockCargas[index] = { ...carga };
    return Promise.resolve(mockCargas[index]);
};

export const deleteMockCarga = async (id: number, motivo: string): Promise<void> => {
    await delay(100);
    const index = mockCargas.findIndex(c => c.ID_Carga === id);
    if (index === -1) return Promise.reject(new Error("Carga não encontrada"));
    mockCargas[index].Excluido = true;
    mockCargas[index].MotivoExclusao = motivo;
    return Promise.resolve();
};

export const createMockParametroValor = async (param: Omit<ParametroValor, 'ID_Parametro'>): Promise<ParametroValor> => {
    await delay(100);
    const newId = Math.max(0, ...mockParametrosValores.map(p => p.ID_Parametro)) + 1;
    const newParam: ParametroValor = { ...param, ID_Parametro: newId };
    mockParametrosValores.push(newParam);
    return Promise.resolve(newParam);
};

export const updateMockParametroValor = async (id: number, param: ParametroValor): Promise<ParametroValor> => {
    await delay(100);
    const index = mockParametrosValores.findIndex(p => p.ID_Parametro === id);
    if (index === -1) return Promise.reject(new Error("Parâmetro não encontrado"));
    mockParametrosValores[index] = { ...param };
    return Promise.resolve(mockParametrosValores[index]);
};

export const deleteMockParametroValor = async (id: number): Promise<void> => {
    await delay(100);
    const index = mockParametrosValores.findIndex(p => p.ID_Parametro === id);
    if (index === -1) return Promise.reject(new Error("Parâmetro não encontrado"));
    mockParametrosValores.splice(index, 1);
    return Promise.resolve();
};

export const createMockParametroTaxa = async (param: Omit<ParametroTaxa, 'ID_Taxa'>): Promise<ParametroTaxa> => {
    await delay(100);
    const newId = Math.max(0, ...mockParametrosTaxas.map(p => p.ID_Taxa)) + 1;
    const newParam: ParametroTaxa = { ...param, ID_Taxa: newId };
    mockParametrosTaxas.push(newParam);
    return Promise.resolve(newParam);
};

export const updateMockParametroTaxa = async (id: number, param: ParametroTaxa): Promise<ParametroTaxa> => {
    await delay(100);
    const index = mockParametrosTaxas.findIndex(p => p.ID_Taxa === id);
    if (index === -1) return Promise.reject(new Error("Taxa não encontrada"));
    mockParametrosTaxas[index] = { ...param };
    return Promise.resolve(mockParametrosTaxas[index]);
};

export const deleteMockParametroTaxa = async (id: number): Promise<void> => {
    await delay(100);
    const index = mockParametrosTaxas.findIndex(p => p.ID_Taxa === id);
    if (index === -1) return Promise.reject(new Error("Taxa não encontrada"));
    mockParametrosTaxas.splice(index, 1);
    return Promise.resolve();
};

export const createMockLancamento = async (lancamento: NewLancamento): Promise<Lancamento> => {
    await delay(100);
    const newId = Math.max(0, ...mockLancamentos.map(l => l.ID_Lancamento)) + 1;
    const newLancamento: Lancamento = { ...lancamento, ID_Lancamento: newId };
    mockLancamentos.push(newLancamento);
    return Promise.resolve(newLancamento);
};

export const deleteMockLancamento = async (id: number, motivo: string): Promise<void> => {
    await delay(100);
    const index = mockLancamentos.findIndex(l => l.ID_Lancamento === id);
    if (index === -1) return Promise.reject(new Error("Lançamento não encontrado"));
    mockLancamentos[index].Excluido = true;
    mockLancamentos[index].MotivoExclusao = motivo;
    return Promise.resolve();
};
