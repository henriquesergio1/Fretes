import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Veiculo, ParametroValor, ParametroTaxa, Carga, Lancamento, NewLancamento } from '../types';
import * as api from '../services/apiService';
import { API_MODE } from '../api.config';

interface DataContextType {
    veiculos: Veiculo[];
    parametrosValores: ParametroValor[];
    parametrosTaxas: ParametroTaxa[];
    cargas: Carga[]; // Manterá apenas as cargas manuais para a tela de gestão
    lancamentos: Lancamento[];
    tiposVeiculo: string[];
    cidades: string[];
    editingLancamento: Lancamento | null;
    loading: boolean;
    error: string | null;

    setEditingLancamento: (lancamento: Lancamento | null) => void;
    reloadData: (dataType: 'veiculos' | 'cargas' | 'parametrosValores' | 'parametrosTaxas' | 'lancamentos' | 'all') => Promise<void>;
    
    // CRUD operations
    addLancamento: (lancamento: NewLancamento) => Promise<Lancamento>;
    updateLancamento: (lancamento: Lancamento) => Promise<Lancamento>;
    deleteLancamento: (id: number, motivo: string) => Promise<void>;
    
    addVeiculo: (veiculo: Omit<Veiculo, 'ID_Veiculo'>) => Promise<void>;
    updateVeiculo: (veiculo: Veiculo) => Promise<void>;

    addCarga: (carga: Omit<Carga, 'ID_Carga'>) => Promise<void>;
    updateCarga: (carga: Carga) => Promise<void>;
    deleteCarga: (id: number, motivo: string) => Promise<void>;

    addParametroValor: (param: Omit<ParametroValor, 'ID_Parametro'>) => Promise<void>;
    updateParametroValor: (param: ParametroValor) => Promise<void>;
    deleteParametroValor: (id: number) => Promise<void>;
    
    addParametroTaxa: (param: Omit<ParametroTaxa, 'ID_Taxa'>) => Promise<void>;
    updateParametroTaxa: (param: ParametroTaxa) => Promise<void>;
    deleteParametroTaxa: (id: number) => Promise<void>;
}

export const DataContext = createContext<DataContextType>({} as DataContextType);

export const DataProvider: React.FC<{children: ReactNode}> = ({ children }) => {
    const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
    const [parametrosValores, setParametrosValores] = useState<ParametroValor[]>([]);
    const [parametrosTaxas, setParametrosTaxas] = useState<ParametroTaxa[]>([]);
    const [cargas, setCargas] = useState<Carga[]>([]); // Cargas manuais
    const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
    
    const [tiposVeiculo, setTiposVeiculo] = useState<string[]>([]);
    const [cidades, setCidades] = useState<string[]>([]);

    const [editingLancamento, setEditingLancamento] = useState<Lancamento | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadInitialData = useCallback(async () => {
        try {
            setError(null);
            setLoading(true);
            const [veiculosData, pValoresData, pTaxasData, cargasManuaisData, lancamentosData] = await Promise.all([
                api.getVeiculos(),
                api.getParametrosValores(),
                api.getParametrosTaxas(),
                api.getCargasManuais(),
                api.getLancamentos(),
            ]);
            setVeiculos(veiculosData);
            setParametrosValores(pValoresData);
            setParametrosTaxas(pTaxasData);
            setCargas(cargasManuaisData);
            setLancamentos(lancamentosData);
        } catch (err: any) {
            console.error("Erro ao carregar dados:", err);
            const errorMessage = API_MODE === 'api' 
                ? 'Falha ao conectar com o backend. Verifique se a API está em execução.' 
                : 'Falha ao carregar dados fictícios.';
            setError(`${errorMessage} Detalhe: ${err.message}`);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadInitialData();
    }, [loadInitialData]);

    useEffect(() => {
        const allTipos = [...new Set(veiculos.map(v => v.TipoVeiculo))].sort();
        const allCidades = [...new Set([
            ...cargas.map(c => c.Cidade),
            ...parametrosValores.map(p => p.Cidade),
            ...parametrosTaxas.map(t => t.Cidade)
        ])].filter(Boolean).sort();
        setTiposVeiculo(allTipos);
        setCidades(allCidades);
    }, [veiculos, cargas, parametrosValores, parametrosTaxas]);

    const reloadData = useCallback(async (dataType: 'veiculos' | 'cargas' | 'parametrosValores' | 'parametrosTaxas' | 'lancamentos' | 'all') => {
        if (dataType === 'all') {
            await loadInitialData();
            return;
        }
        try {
            switch (dataType) {
                case 'veiculos': setVeiculos(await api.getVeiculos()); break;
                case 'cargas': setCargas(await api.getCargasManuais()); break;
                case 'parametrosValores': setParametrosValores(await api.getParametrosValores()); break;
                case 'parametrosTaxas': setParametrosTaxas(await api.getParametrosTaxas()); break;
                case 'lancamentos': setLancamentos(await api.getLancamentos()); break;
            }
        } catch (err: any) {
            setError(`Falha ao recarregar dados de ${dataType}: ${err.message}`);
        }
    }, [loadInitialData]);
    
    // --- CRUD Handlers ---

    const addLancamento = async (lancamento: NewLancamento): Promise<Lancamento> => {
        const newLancamento = await api.createLancamento(lancamento);
        await reloadData('lancamentos');
        return newLancamento;
    };

    const updateLancamento = async (lancamento: Lancamento): Promise<Lancamento> => {
        // A API agora suporta exclusão. A lógica de criar um novo e excluir o antigo é mantida.
        const novoLancamento = await addLancamento(lancamento);
        await deleteLancamento(lancamento.ID_Lancamento, lancamento.Motivo || 'Substituição por edição.');
        return novoLancamento;
    };

    const deleteLancamento = async (id: number, motivo: string) => {
        await api.deleteLancamento(id, motivo);
        await reloadData('lancamentos');
    };
    
    const addVeiculo = async (veiculo: Omit<Veiculo, 'ID_Veiculo'>) => {
        await api.createVeiculo(veiculo);
        await reloadData('veiculos');
    };
    const updateVeiculo = async (veiculo: Veiculo) => {
        await api.updateVeiculo(veiculo.ID_Veiculo, veiculo);
        await reloadData('veiculos');
    };

    const addCarga = async (carga: Omit<Carga, 'ID_Carga'>) => {
        const cargaComOrigem = { ...carga, Origem: carga.Origem || 'Manual' } as Omit<Carga, 'ID_Carga'>;
        await api.createCarga(cargaComOrigem);
        await reloadData('cargas');
    };
    const updateCarga = async (carga: Carga) => {
        await api.updateCarga(carga.ID_Carga, carga);
        await reloadData('cargas');
    };
    const deleteCarga = async (id: number, motivo: string) => {
        await api.deleteCarga(id, motivo);
        await reloadData('cargas');
    };

    const addParametroValor = async (param: Omit<ParametroValor, 'ID_Parametro'>) => {
        await api.createParametroValor(param);
        await reloadData('parametrosValores');
    };
    const updateParametroValor = async (param: ParametroValor) => {
        await api.updateParametroValor(param.ID_Parametro, param);
        await reloadData('parametrosValores');
    };
    const deleteParametroValor = async (id: number) => {
        await api.deleteParametroValor(id);
        await reloadData('parametrosValores');
    };

    const addParametroTaxa = async (param: Omit<ParametroTaxa, 'ID_Taxa'>) => {
        await api.createParametroTaxa(param);
        await reloadData('parametrosTaxas');
    };
    const updateParametroTaxa = async (param: ParametroTaxa) => {
        await api.updateParametroTaxa(param.ID_Taxa, param);
        await reloadData('parametrosTaxas');
    };
    const deleteParametroTaxa = async (id: number) => {
        await api.deleteParametroTaxa(id);
        await reloadData('parametrosTaxas');
    };

    return (
        <DataContext.Provider value={{
            veiculos,
            parametrosValores,
            parametrosTaxas,
            cargas,
            lancamentos,
            tiposVeiculo,
            cidades,
            editingLancamento,
            loading,
            error,
            setEditingLancamento,
            reloadData,
            addLancamento,
            updateLancamento,
            deleteLancamento,
            addVeiculo,
            updateVeiculo,
            addCarga,
            updateCarga,
            deleteCarga,
            addParametroValor,
            updateParametroValor,
            deleteParametroValor,
            addParametroTaxa,
            updateParametroTaxa,
            deleteParametroTaxa
        }}>
            {children}
        </DataContext.Provider>
    );
};