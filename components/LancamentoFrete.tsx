
import React, { useState, useEffect, useMemo, useCallback, useContext } from 'react';
import { Veiculo, Carga, Lancamento, MotivoSubstituicao, NewLancamento } from '../types.ts';
import * as api from '../services/apiService.ts';
import { DataContext } from '../context/DataContext.tsx';
import { ArrowLeftIcon, ArrowRightIcon, CheckCircleIcon, ExclamationIcon, SpinnerIcon, XCircleIcon, PencilIcon } from './icons.tsx';

interface LancamentoFreteProps {
    setView: (view: 'relatorios') => void;
}

// Helper component for form steps
const Step: React.FC<{
    title: string;
    stepNumber: number;
    currentStep: number;
    isEditing: boolean;
    onStepClick: (step: number) => void;
}> = ({ title, stepNumber, currentStep, isEditing, onStepClick }) => {
    const isActive = currentStep === stepNumber;
    const isClickable = isEditing || stepNumber < currentStep;

    const handleClick = () => {
        if (isClickable) {
            onStepClick(stepNumber);
        }
    };

    return (
        <div
            className={`flex items-center transition-opacity ${isClickable ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
            onClick={handleClick}
            role={isClickable ? 'button' : undefined}
            tabIndex={isClickable ? 0 : -1}
            onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && isClickable) handleClick(); }}
            aria-disabled={!isClickable}
        >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${isActive ? 'bg-sky-500' : 'bg-slate-600'}`}>
                {stepNumber}
            </div>
            <div className={`ml-3 text-sm font-medium ${isActive ? 'text-sky-400' : 'text-slate-400'}`}>{title}</div>
        </div>
    );
};

// Modal Component for substitution reason
const SubstituicaoModal: React.FC<{
    motivos: MotivoSubstituicao[];
    onConfirm: (motivoId: number) => void;
    onCancel: () => void;
    isOpen: boolean;
}> = ({ motivos, onConfirm, onCancel, isOpen }) => {
    const [selectedMotivo, setSelectedMotivo] = useState<number | null>(null);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-md">
                <div className="flex items-center mb-4">
                    <ExclamationIcon className="w-8 h-8 text-yellow-400 mr-3" />
                    <h2 className="text-xl font-bold text-white">Carga Duplicada Detectada</h2>
                </div>
                <p className="text-slate-300 mb-6">Uma ou mais cargas selecionadas já foram lançadas. Para continuar, selecione um motivo para a substituição.</p>
                <select
                    className="w-full bg-slate-700 text-white border border-slate-600 rounded-md p-2 focus:ring-sky-500 focus:border-sky-500"
                    onChange={(e) => setSelectedMotivo(Number(e.target.value))}
                    defaultValue=""
                >
                    <option value="" disabled>Selecione um motivo...</option>
                    {motivos.map(motivo => (
                        <option key={motivo.ID_Motivo} value={motivo.ID_Motivo}>{motivo.Descricao}</option>
                    ))}
                </select>
                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={onCancel} className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-md transition duration-200">
                        Cancelar
                    </button>
                    <button 
                        onClick={() => selectedMotivo && onConfirm(selectedMotivo)}
                        disabled={!selectedMotivo}
                        className="bg-sky-600 hover:bg-sky-500 disabled:bg-sky-800 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-md transition duration-200"
                    >
                        Confirmar Substituição
                    </button>
                </div>
            </div>
        </div>
    );
};

// Modal para Motivo de Alteração Manual
const ManualReasonModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (motivo: string) => void;
}> = ({ isOpen, onClose, onConfirm }) => {
    const [motivo, setMotivo] = useState('');

    useEffect(() => {
        if (isOpen) setMotivo('');
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-md">
                <div className="flex items-start mb-4">
                    <PencilIcon className="w-8 h-8 text-yellow-400 mr-3 shrink-0" />
                    <div>
                        <h2 className="text-xl font-bold text-white">Alteração Manual de Valores</h2>
                        <p className="text-slate-300 mt-1 text-sm">Você está prestes a sobrescrever os valores calculados automaticamente. Informe o motivo para liberar a edição.</p>
                    </div>
                </div>
                <textarea
                    className="w-full bg-slate-700 text-white border border-slate-600 rounded-md p-2 focus:ring-yellow-500 focus:border-yellow-500"
                    rows={3}
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    placeholder="Ex: Acordo comercial diferenciado..."
                />
                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={onClose} className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-md transition duration-200">
                        Cancelar
                    </button>
                    <button
                        onClick={() => onConfirm(motivo)}
                        disabled={!motivo.trim()}
                        className="bg-yellow-600 hover:bg-yellow-500 disabled:bg-yellow-800 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-md transition duration-200"
                    >
                        Liberar Edição
                    </button>
                </div>
            </div>
        </div>
    );
};

export const LancamentoFrete: React.FC<LancamentoFreteProps> = ({ setView }) => {
    const { veiculos, parametrosValores, parametrosTaxas, editingLancamento, setEditingLancamento, lancamentos, addLancamento, updateLancamento } = useContext(DataContext);
    const [step, setStep] = useState(1);
    const [cargasDisponiveis, setCargasDisponiveis] = useState<Carga[]>([]);
    const [motivos, setMotivos] = useState<MotivoSubstituicao[]>([]);
    
    const [selectedVeiculoId, setSelectedVeiculoId] = useState<number | null>(null);
    const [dataFrete, setDataFrete] = useState<string>(new Date().toISOString().split('T')[0]);
    const [selectedCargas, setSelectedCargas] = useState<Carga[]>([]);
    const [motivoEdicao, setMotivoEdicao] = useState('');

    const [loading, setLoading] = useState({ cargas: false, save: false });
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [pendingLancamento, setPendingLancamento] = useState<NewLancamento | null>(null);

    // Estados para Modo Manual
    const [isManualMode, setIsManualMode] = useState(false);
    const [isManualReasonModalOpen, setIsManualReasonModalOpen] = useState(false);
    const [manualValues, setManualValues] = useState({
        ValorBase: 0,
        Pedagio: 0,
        Balsa: 0,
        Outras: 0
    });
    const [motivoManual, setMotivoManual] = useState('');

    const isEditing = useMemo(() => !!editingLancamento, [editingLancamento]);

    useEffect(() => {
        if (isEditing && editingLancamento) {
            setDataFrete(editingLancamento.DataFrete);
            setSelectedVeiculoId(editingLancamento.ID_Veiculo);
            setSelectedCargas(editingLancamento.Cargas);
            setStep(1);
        }
        return () => {
            if (isEditing) {
                setEditingLancamento(null);
            }
        };
    }, [editingLancamento, isEditing, setEditingLancamento]);
    
    useEffect(() => {
        if (isEditing && editingLancamento) {
            const veiculo = veiculos.find(v => v.ID_Veiculo === editingLancamento.ID_Veiculo);
            if(veiculo){
                 api.getCargas({ veiculoCod: veiculo.COD_Veiculo, data: editingLancamento.DataFrete })
                    .then(setCargasDisponiveis)
                    .catch(() => setError('Não foi possível buscar as cargas para edição.'));
            }
        }
    }, [isEditing, editingLancamento, veiculos]);

    useEffect(() => {
        api.getMotivosSubstituicao()
            .then(setMotivos)
            .catch(() => setError('Falha ao carregar motivos de substituição.'));
    }, []);

    const activeVeiculos = useMemo(() => veiculos.filter(v => v.Ativo), [veiculos]);
    const selectedVeiculo = useMemo(() => veiculos.find(v => v.ID_Veiculo === selectedVeiculoId), [veiculos, selectedVeiculoId]);
    
    const lancadasIds = useMemo(() => {
        const ids = new Set<number>();
        lancamentos
            .filter(l => !l.Excluido && (!isEditing || l.ID_Lancamento !== editingLancamento?.ID_Lancamento))
            .forEach(l => l.Cargas.forEach(c => ids.add(c.ID_Carga)));
        return ids;
    }, [lancamentos, isEditing, editingLancamento]);

    const handleSearchCargas = useCallback(async () => {
        if (!selectedVeiculo || !dataFrete) return;

        setLoading(prev => ({ ...prev, cargas: true }));
        setError(null);
        
        try {
            const cargasData = await api.getCargas({ veiculoCod: selectedVeiculo.COD_Veiculo, data: dataFrete });
            setCargasDisponiveis(cargasData);
            
            if (isEditing) {
                const availableCargaIds = new Set(cargasData.map(c => c.ID_Carga));
                setSelectedCargas(prev => prev.filter(c => availableCargaIds.has(c.ID_Carga)));
            } else {
                setSelectedCargas([]);
            }
            setStep(2);
            // Reset manual mode when searching new loads
            setIsManualMode(false);
            setMotivoManual('');
        } catch (err: any) {
            setError(err.message || 'Falha ao buscar cargas.');
        } finally {
            setLoading(prev => ({ ...prev, cargas: false }));
        }
    }, [dataFrete, selectedVeiculo, isEditing]);

    const handleToggleCarga = (carga: Carga) => {
        setSelectedCargas(prev => {
            const newSelection = prev.some(c => c.ID_Carga === carga.ID_Carga) 
                ? prev.filter(c => c.ID_Carga !== carga.ID_Carga) 
                : [...prev, carga];
            
            // Se alterar as cargas, sai do modo manual para recalcular
            if (isManualMode) {
                setIsManualMode(false);
                setMotivoManual('');
            }
            return newSelection;
        });
    };

    // Cálculo Automático (Memoizado)
    const calculoAutomatico = useMemo(() => {
        if (selectedCargas.length === 0 || !selectedVeiculo) return null;
        const veiculoParams = parametrosValores.filter(p => p.TipoVeiculo === selectedVeiculo.TipoVeiculo);
        const cargaMaisDistante = selectedCargas.reduce((max, carga) => (carga.KM > max.KM ? carga : max), selectedCargas[0]);
        const valorBaseParams = veiculoParams.find(p => p.Cidade === cargaMaisDistante.Cidade) || veiculoParams.find(p => p.Cidade === 'Qualquer');
        const valorBase = valorBaseParams?.ValorBase || 0;
        let totalTaxas = { Pedagio: 0, Balsa: 0, Ambiental: 0, Chapa: 0, Outras: 0 };
        const cidadesUnicas = [...new Set(selectedCargas.map(c => c.Cidade))];
        cidadesUnicas.forEach(cidade => {
            const taxaCidade = parametrosTaxas.find(t => t.Cidade === cidade);
            if (taxaCidade) Object.keys(totalTaxas).forEach(key => totalTaxas[key as keyof typeof totalTaxas] += taxaCidade[key as keyof typeof totalTaxas]);
        });
        const valorTotal = valorBase + Object.values(totalTaxas).reduce((sum, val) => sum + val, 0);
        return { CidadeBase: cargaMaisDistante.Cidade, KMBase: cargaMaisDistante.KM, ValorBase: valorBase, ...totalTaxas, ValorTotal: valorTotal };
    }, [selectedCargas, selectedVeiculo, parametrosValores, parametrosTaxas]);

    // Lógica de Valores Finais (Automático vs Manual)
    const valoresFinais = useMemo(() => {
        if (isManualMode && calculoAutomatico) {
            const total = manualValues.ValorBase + manualValues.Pedagio + manualValues.Balsa + manualValues.Outras;
            return {
                ...calculoAutomatico, // Mantém cidade base e KM
                ValorBase: manualValues.ValorBase,
                Pedagio: manualValues.Pedagio,
                Balsa: manualValues.Balsa,
                Outras: manualValues.Outras,
                Ambiental: 0, // Zerado no modo manual
                Chapa: 0,     // Zerado no modo manual
                ValorTotal: total
            };
        }
        return calculoAutomatico;
    }, [isManualMode, manualValues, calculoAutomatico]);
    
    const resetForm = useCallback(() => {
        setStep(1);
        setSelectedVeiculoId(null);
        setSelectedCargas([]);
        setCargasDisponiveis([]);
        setSuccessMessage(null);
        setError(null);
        setEditingLancamento(null);
        setMotivoEdicao('');
        setIsManualMode(false);
        setMotivoManual('');
    }, [setEditingLancamento]);

    // Handlers para Modo Manual
    const handleOpenManualModal = () => {
        if (!calculoAutomatico) return;
        setIsManualReasonModalOpen(true);
    };

    const handleConfirmManual = (reason: string) => {
        if (calculoAutomatico) {
            // Soma Ambiental + Chapa + Outras Originais no campo "Outras" para edição simplificada
            const outrasConsolidado = calculoAutomatico.Outras + calculoAutomatico.Ambiental + calculoAutomatico.Chapa;
            
            setManualValues({
                ValorBase: calculoAutomatico.ValorBase,
                Pedagio: calculoAutomatico.Pedagio,
                Balsa: calculoAutomatico.Balsa,
                Outras: outrasConsolidado
            });
            setMotivoManual(reason);
            setIsManualMode(true);
            setIsManualReasonModalOpen(false);
        }
    };

    const handleManualChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setManualValues(prev => ({
            ...prev,
            [name]: parseFloat(value) || 0
        }));
    };

    const submitLancamento = useCallback(async (lancamento: NewLancamento | Lancamento) => {
        setLoading(prev => ({...prev, save: true}));
        setError(null);
        setSuccessMessage(null);

        try {
            if (isEditing && editingLancamento) {
                await updateLancamento({ ...lancamento, ID_Lancamento: editingLancamento.ID_Lancamento } as Lancamento);
                setSuccessMessage("Lançamento atualizado com sucesso!");
                setTimeout(() => {
                    resetForm();
                    setView('relatorios');
                }, 2000);
                return;
            }

            const newCargaIds = new Set(lancamento.Cargas.map(c => c.ID_Carga));
            const isDuplicate = lancamentos.some(
                l => !l.Excluido && l.Cargas.some(c => newCargaIds.has(c.ID_Carga))
            );

            if (isDuplicate && !lancamento.Motivo) {
                setPendingLancamento(lancamento as NewLancamento);
                setIsModalOpen(true);
                return;
            }

            await addLancamento(lancamento as NewLancamento);
            setSuccessMessage(`Lançamento de frete criado com sucesso!`);
            setTimeout(() => resetForm(), 3000);

        } catch (err: any) {
            setError(err.message || 'Erro desconhecido ao salvar lançamento.');
        } finally {
            setLoading(prev => ({...prev, save: false}));
        }
    }, [isEditing, editingLancamento, lancamentos, resetForm, setView, addLancamento, updateLancamento]);


    const handleConfirmarLancamento = () => {
        if (!selectedVeiculoId || !valoresFinais) return;

        // Validação de Valor Zerado
        if (valoresFinais.ValorTotal <= 0) {
            setError("Não é possível salvar um lançamento com valor total zero. Verifique os parâmetros ou use a edição manual.");
            return;
        }

        // Constrói o objeto de lançamento
        let finalMotivo = motivoEdicao;
        
        // Se houve ajuste manual, concatena o motivo
        if (isManualMode && motivoManual) {
            const prefixo = finalMotivo ? `${finalMotivo} | ` : '';
            finalMotivo = `${prefixo}Ajuste Manual de Valores: ${motivoManual}`;
        }

        const lancamentoData: NewLancamento = {
            DataFrete: dataFrete,
            ID_Veiculo: selectedVeiculoId,
            Cargas: selectedCargas,
            Calculo: valoresFinais,
            Usuario: 'usuario.logado',
            Motivo: finalMotivo // Passa o motivo composto
        };

        submitLancamento(lancamentoData);
    };

    const handleConfirmSubstituicao = (motivoId: number) => {
        const motivo = motivos.find(m => m.ID_Motivo === motivoId);
        if (pendingLancamento && motivo) {
            const lancamentoComMotivo = { ...pendingLancamento, Motivo: motivo.Descricao };
            setIsModalOpen(false);
            setPendingLancamento(null);
            submitLancamento(lancamentoComMotivo);
        }
    };
    
    const handleCancelEdit = () => {
        resetForm();
        setView('relatorios');
    };

    const renderStepContent = () => {
        switch (step) {
            case 1:
                return (
                    <div>
                        <h3 className="text-lg font-semibold text-white mb-4">1. Selecione o Veículo e a Data</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="veiculo" className="block text-sm font-medium text-slate-300 mb-1">Veículo</label>
                                <select id="veiculo" value={selectedVeiculoId || ''} onChange={(e) => setSelectedVeiculoId(Number(e.target.value))} className="w-full bg-slate-700 text-white border border-slate-600 rounded-md p-2 focus:ring-sky-500 focus:border-sky-500">
                                    <option value="" disabled>Selecione um veículo</option>
                                    {activeVeiculos.map(v => (
                                        <option key={v.ID_Veiculo} value={v.ID_Veiculo}>
                                            {v.COD_Veiculo} - {v.Placa} - {v.Motorista}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="dataFrete" className="block text-sm font-medium text-slate-300 mb-1">Data do Frete</label>
                                <input type="date" id="dataFrete" value={dataFrete} onChange={(e) => setDataFrete(e.target.value)} className="w-full bg-slate-700 text-white border border-slate-600 rounded-md p-2 focus:ring-sky-500 focus:border-sky-500" />
                            </div>
                        </div>
                         {activeVeiculos.length === 0 && (
                            <div className="mt-4 p-3 bg-yellow-900/50 text-yellow-200 border border-yellow-700/50 rounded-md flex items-center">
                                <ExclamationIcon className="w-5 h-5 mr-2"/> Nenhum veículo ativo encontrado. Importe ou cadastre na página de 'Veículos'.
                            </div>
                        )}
                    </div>
                );
            case 2:
                return (
                    <div>
                        <h3 className="text-lg font-semibold text-white mb-4">2. Selecione as Cargas</h3>
                        <div className="bg-slate-800 rounded-lg p-4 max-h-96 overflow-y-auto">
                            {cargasDisponiveis.length > 0 ? (
                                <table className="w-full text-sm text-left text-slate-300">
                                    <thead className="text-xs text-slate-400 uppercase bg-slate-700">
                                        <tr>
                                            <th scope="col" className="p-3 w-12"></th>
                                            <th scope="col" className="p-3">Nº Carga</th>
                                            <th scope="col" className="p-3">Cidade</th>
                                            <th scope="col" className="p-3">Valor CTE</th>
                                            <th scope="col" className="p-3">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {cargasDisponiveis.map(carga => {
                                            const isLancada = lancadasIds.has(carga.ID_Carga);
                                            return (
                                                <tr key={carga.ID_Carga} className="bg-slate-800 border-b border-slate-700 hover:bg-slate-700 cursor-pointer" onClick={() => handleToggleCarga(carga)}>
                                                    <td className="p-3">
                                                        <input type="checkbox" readOnly checked={selectedCargas.some(c => c.ID_Carga === carga.ID_Carga)} className="w-4 h-4 text-sky-600 bg-slate-700 border-slate-500 rounded focus:ring-sky-500" />
                                                    </td>
                                                    <td className="p-3 font-medium text-white">{carga.NumeroCarga}</td>
                                                    <td className="p-3">{carga.Cidade}</td>
                                                    <td className="p-3">{carga.ValorCTE.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                                                    <td className="p-3">
                                                        {isLancada && (
                                                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-500/20 text-yellow-300">
                                                                Já Lançada
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            ) : (<p className="text-center text-slate-400">Nenhuma carga disponível para os critérios selecionados.</p>)}
                        </div>
                    </div>
                );
            case 3:
                const isZeroValue = valoresFinais && valoresFinais.ValorTotal === 0;
                return (
                    <div>
                        <h3 className="text-lg font-semibold text-white mb-4">3. Resumo e Cálculo</h3>
                        <div className="bg-slate-800 rounded-lg p-6 grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
                            <div>
                                <h4 className="font-bold text-sky-400 mb-3">Cargas Selecionadas ({selectedCargas.length})</h4>
                                <ul className="space-y-2 text-sm max-h-48 overflow-y-auto pr-2">
                                    {selectedCargas.map(c => (
                                        <li key={c.ID_Carga} className="flex justify-between p-2 bg-slate-700 rounded-md">
                                            <span>{c.NumeroCarga} ({c.Cidade})</span>
                                            <span className="font-semibold">{c.ValorCTE.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            {valoresFinais && (
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between items-center mb-3">
                                        <h4 className="font-bold text-sky-400">Cálculo do Frete</h4>
                                        <button 
                                            onClick={handleOpenManualModal}
                                            className={`text-xs px-2 py-1 rounded border transition-colors ${isManualMode ? 'bg-yellow-600 text-white border-yellow-500' : 'text-sky-400 border-sky-500 hover:bg-sky-900/30'}`}
                                            title={isManualMode ? "Valores definidos manualmente" : "Sobrescrever valores calculados"}
                                        >
                                            {isManualMode ? 'Modo Manual Ativo' : 'Definir Manualmente'}
                                        </button>
                                    </div>
                                    
                                    <div className="flex justify-between py-2 border-b border-slate-700">
                                        <span className="text-slate-400">Cidade Base (KM):</span> 
                                        <span className="font-mono">{valoresFinais.CidadeBase} ({valoresFinais.KMBase} km)</span>
                                    </div>

                                    {/* Campos de Valor - Condicional: Texto ou Input */}
                                    {isManualMode ? (
                                        <>
                                            <div className="flex justify-between items-center py-1 border-b border-slate-700">
                                                <label htmlFor="ValorBase" className="text-slate-400">Valor Base:</label>
                                                <input type="number" name="ValorBase" value={manualValues.ValorBase} onChange={handleManualChange} className="w-32 bg-slate-700 text-right text-white border border-slate-600 rounded p-1 text-sm" />
                                            </div>
                                            <div className="flex justify-between items-center py-1 border-b border-slate-700">
                                                <label htmlFor="Pedagio" className="text-slate-400">Total Pedágio:</label>
                                                <input type="number" name="Pedagio" value={manualValues.Pedagio} onChange={handleManualChange} className="w-32 bg-slate-700 text-right text-white border border-slate-600 rounded p-1 text-sm" />
                                            </div>
                                            <div className="flex justify-between items-center py-1 border-b border-slate-700">
                                                <label htmlFor="Balsa" className="text-slate-400">Total Balsa:</label>
                                                <input type="number" name="Balsa" value={manualValues.Balsa} onChange={handleManualChange} className="w-32 bg-slate-700 text-right text-white border border-slate-600 rounded p-1 text-sm" />
                                            </div>
                                            <div className="flex justify-between items-center py-1 border-b border-slate-700">
                                                <label htmlFor="Outras" className="text-slate-400">Outras Taxas:</label>
                                                <input type="number" name="Outras" value={manualValues.Outras} onChange={handleManualChange} className="w-32 bg-slate-700 text-right text-white border border-slate-600 rounded p-1 text-sm" />
                                            </div>
                                            <div className="text-xs text-slate-500 italic text-right mt-1">
                                                * Ambiental e Chapa foram somados em "Outras Taxas".
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="flex justify-between py-2 border-b border-slate-700"><span className="text-slate-400">Valor Base:</span> <span className="font-mono">{valoresFinais.ValorBase.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>
                                            <div className="flex justify-between py-2 border-b border-slate-700"><span className="text-slate-400">Total Pedágio:</span> <span className="font-mono">{valoresFinais.Pedagio.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>
                                            <div className="flex justify-between py-2 border-b border-slate-700"><span className="text-slate-400">Total Balsa:</span> <span className="font-mono">{valoresFinais.Balsa.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>
                                            <div className="flex justify-between py-2 border-b border-slate-700"><span className="text-slate-400">Outras Taxas:</span> <span className="font-mono">{(valoresFinais.Ambiental + valoresFinais.Chapa + valoresFinais.Outras).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>
                                        </>
                                    )}

                                    <div className="flex justify-between pt-3 text-lg">
                                        <span className="font-bold text-white">VALOR TOTAL:</span> 
                                        <span className={`font-bold ${isZeroValue ? 'text-red-500' : 'text-green-400'}`}>{valoresFinais.ValorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                    </div>
                                    
                                    {isZeroValue && !isManualMode && (
                                        <div className="mt-4 p-3 bg-red-900/50 text-red-200 border border-red-700/50 rounded-md flex items-start">
                                            <ExclamationIcon className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0"/>
                                            <div>
                                                <p className="font-bold">Valor do Frete Zerado!</p>
                                                <p className="text-xs mt-1">
                                                    Não foi encontrado um valor base para <b>{valoresFinais.CidadeBase}</b> com o tipo de veículo <b>{selectedVeiculo?.TipoVeiculo}</b>.
                                                </p>
                                                <p className="text-xs mt-1">
                                                    Cadastre os valores nos Parâmetros ou use o botão <b>"Definir Manualmente"</b> acima.
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                             {isEditing && (
                                <div className="md:col-span-2">
                                    <label htmlFor="motivoEdicao" className="block text-sm font-medium text-yellow-300 mb-1">Motivo da Alteração de Cadastro (Obrigatório)</label>
                                    <select
                                        id="motivoEdicao"
                                        value={motivoEdicao}
                                        onChange={(e) => setMotivoEdicao(e.target.value)}
                                        className="w-full bg-slate-700 text-white border border-slate-600 rounded-md p-2 focus:ring-yellow-500 focus:border-yellow-500"
                                    >
                                        <option value="" disabled>Selecione um motivo...</option>
                                        {motivos.map(m => <option key={m.ID_Motivo} value={m.Descricao}>{m.Descricao}</option>)}
                                    </select>
                                </div>
                            )}
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="bg-slate-900 p-4 sm:p-6 md:p-8 rounded-lg shadow-2xl">
            <SubstituicaoModal isOpen={isModalOpen} motivos={motivos} onConfirm={handleConfirmSubstituicao} onCancel={() => setIsModalOpen(false)} />
            <ManualReasonModal isOpen={isManualReasonModalOpen} onClose={() => setIsManualReasonModalOpen(false)} onConfirm={handleConfirmManual} />
            
            <h2 className="text-2xl font-bold text-white mb-2">{isEditing ? 'Editar Lançamento de Frete' : 'Lançamento de Frete'}</h2>
            <p className="text-slate-400 mb-8">{isEditing ? 'Ajuste os dados do frete e salve as alterações.' : 'Siga as etapas para registrar um novo frete.'}</p>

            <div className="flex justify-between items-center mb-8 p-4 bg-slate-800 rounded-md">
                <Step
                    title="Veículo & Data"
                    stepNumber={1}
                    currentStep={step}
                    isEditing={isEditing}
                    onStepClick={setStep}
                />
                <div className="flex-grow h-px bg-slate-600 mx-4"></div>
                <Step
                    title="Seleção de Cargas"
                    stepNumber={2}
                    currentStep={step}
                    isEditing={isEditing}
                    onStepClick={setStep}
                />
                <div className="flex-grow h-px bg-slate-600 mx-4"></div>
                <Step
                    title="Resumo & Salvar"
                    stepNumber={3}
                    currentStep={step}
                    isEditing={isEditing}
                    onStepClick={setStep}
                />
            </div>

            <div className="min-h-[250px]">
                {renderStepContent()}
            </div>
            
            {error && <div className="mt-4 p-3 bg-red-900 text-red-200 border border-red-700 rounded-md flex items-center"><XCircleIcon className="w-5 h-5 mr-2"/> {error}</div>}
            {successMessage && <div className="mt-4 p-3 bg-green-900 text-green-200 border border-green-700 rounded-md flex items-center"><CheckCircleIcon className="w-5 h-5 mr-2"/> {successMessage}</div>}

            <div className="mt-8 pt-6 border-t border-slate-700 flex justify-between items-center">
                <div>
                     <button
                        onClick={() => setStep(s => s - 1)}
                        disabled={step === 1 || loading.save}
                        className="bg-slate-600 hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-md transition duration-200 flex items-center"
                    >
                        <ArrowLeftIcon className="w-5 h-5 mr-2" />
                        Anterior
                    </button>
                    {isEditing && (
                         <button onClick={handleCancelEdit} className="ml-4 bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-4 rounded-md transition duration-200 flex items-center">
                            Cancelar Edição
                        </button>
                    )}
                </div>

                {step < 3 && (
                    <button
                        onClick={step === 1 ? handleSearchCargas : () => setStep(3)}
                        disabled={(step === 1 && !selectedVeiculoId) || (step === 2 && selectedCargas.length === 0) || loading.cargas}
                        className="bg-sky-600 hover:bg-sky-500 disabled:bg-sky-800 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-md transition duration-200 flex items-center"
                    >
                        {loading.cargas ? <SpinnerIcon className="w-5 h-5 mr-2" /> : <ArrowRightIcon className="w-5 h-5 mr-2" />}
                        {step === 1 ? "Buscar Cargas" : "Calcular"}
                    </button>
                )}
                {step === 3 && (
                    <button
                        onClick={handleConfirmarLancamento}
                        disabled={
                            loading.save || 
                            !!successMessage || 
                            (isEditing && !motivoEdicao) ||
                            (valoresFinais?.ValorTotal === 0)
                        }
                        className="bg-green-600 hover:bg-green-500 disabled:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-md transition duration-200 flex items-center"
                        title={valoresFinais?.ValorTotal === 0 ? "Não é possível salvar com valor zerado" : "Salvar Lançamento"}
                    >
                        {loading.save ? <SpinnerIcon className="w-5 h-5 mr-2" /> : <CheckCircleIcon className="w-5 h-5 mr-2" />}
                        {loading.save ? "Salvando..." : (isEditing ? 'Atualizar Lançamento' : 'Confirmar e Salvar')}
                    </button>
                )}
            </div>
        </div>
    );
};
