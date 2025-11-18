import React, { useState, useMemo, useContext, useEffect } from 'react';
import { DataContext } from '../context/DataContext.tsx';
import { Lancamento, Veiculo } from '../types.ts';
import { PencilIcon, ChevronDownIcon, ChevronUpIcon, TrashIcon, ExclamationIcon } from './icons.tsx';

interface RelatoriosProps {
    setView: (view: 'lancamento') => void;
}

const initialFilters = {
    startDate: '',
    endDate: '',
    veiculoId: 'all',
};

// --- Modal Component for Deletion ---
const DeletionModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (motivo: string) => void;
}> = ({ isOpen, onClose, onConfirm }) => {
    const [motivo, setMotivo] = useState('');

    useEffect(() => {
        if (isOpen) {
            setMotivo(''); // Reset motivo when modal opens
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleConfirm = () => {
        if (motivo.trim()) {
            onConfirm(motivo);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-md">
                <div className="flex items-start mb-4">
                    <ExclamationIcon className="w-8 h-8 text-yellow-400 mr-3 shrink-0" />
                    <div>
                        <h2 className="text-xl font-bold text-white">Confirmar Exclusão</h2>
                        <p className="text-slate-300 mt-1">Este lançamento será removido dos relatórios. Por favor, informe o motivo da exclusão para fins de auditoria.</p>
                    </div>
                </div>
                <textarea
                    className="w-full bg-slate-700 text-white border border-slate-600 rounded-md p-2 focus:ring-red-500 focus:border-red-500"
                    rows={3}
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    placeholder="Digite o motivo da exclusão..."
                />
                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={onClose} className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-md transition duration-200">
                        Cancelar
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!motivo.trim()}
                        className="bg-red-600 hover:bg-red-500 disabled:bg-red-800 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-md transition duration-200"
                    >
                        Excluir Lançamento
                    </button>
                </div>
            </div>
        </div>
    );
};

export const Relatorios: React.FC<RelatoriosProps> = ({ setView }) => {
    const { lancamentos, deleteLancamento, veiculos, setEditingLancamento } = useContext(DataContext);
    const [filters, setFilters] = useState(initialFilters);
    const [expandedRows, setExpandedRows] = useState<number[]>([]);
    const [showOnlyExcluded, setShowOnlyExcluded] = useState(false);
    
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [lancamentoToDelete, setLancamentoToDelete] = useState<Lancamento | null>(null);

    const [filteredLancamentos, setFilteredLancamentos] = useState<Lancamento[]>([]);

    useEffect(() => {
        let result = lancamentos;
        
        result = result.filter(l => showOnlyExcluded ? l.Excluido : !l.Excluido);

        if (filters.startDate) {
            result = result.filter(l => new Date(l.DataFrete) >= new Date(filters.startDate + 'T00:00:00'));
        }
        if (filters.endDate) {
            result = result.filter(l => new Date(l.DataFrete) <= new Date(filters.endDate + 'T00:00:00'));
        }
        if (filters.veiculoId !== 'all') {
            result = result.filter(l => l.ID_Veiculo === Number(filters.veiculoId));
        }

        setFilteredLancamentos(result);
        setExpandedRows([]);
    }, [filters, showOnlyExcluded, lancamentos]);


    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const clearFilters = () => {
        setFilters(initialFilters);
        setShowOnlyExcluded(false);
    };

    const getVeiculoInfo = (id: number): Veiculo | undefined => {
        return veiculos.find(v => v.ID_Veiculo === id);
    };

    const handleEdit = (e: React.MouseEvent, lancamento: Lancamento) => {
        e.stopPropagation();
        setEditingLancamento(lancamento);
        setView('lancamento');
    };

    const toggleRow = (index: number) => {
        setExpandedRows(prev => 
            prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
        );
    };

    const handleDeleteClick = (e: React.MouseEvent, lancamento: Lancamento) => {
        e.stopPropagation();
        setLancamentoToDelete(lancamento);
        setIsDeleteModalOpen(true);
    };

    const handleCloseDeleteModal = () => {
        setIsDeleteModalOpen(false);
        setLancamentoToDelete(null);
    };

    const handleConfirmDelete = async (motivo: string) => {
        if (!lancamentoToDelete) return;
        
        try {
            await deleteLancamento(lancamentoToDelete.ID_Lancamento, motivo);
        } catch(error) {
            alert("Falha ao excluir lançamento: " + error);
        } finally {
            handleCloseDeleteModal();
        }
    };


    return (
        <div className="space-y-8">
            <DeletionModal
                isOpen={isDeleteModalOpen}
                onClose={handleCloseDeleteModal}
                onConfirm={handleConfirmDelete}
            />
            <div>
                <h2 className="text-2xl font-bold text-white mb-2">Relatório de Lançamentos</h2>
                <p className="text-slate-400">Consulte o histórico de fretes lançados com filtros detalhados.</p>
            </div>

            {/* Filter Section */}
            <div className="bg-slate-800 p-4 rounded-lg shadow-lg">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                    <div>
                        <label htmlFor="startDate" className="block text-sm font-medium text-slate-300 mb-1">Data Início</label>
                        <input type="date" name="startDate" id="startDate" value={filters.startDate} onChange={handleFilterChange} className="w-full bg-slate-700 text-white border border-slate-600 rounded-md p-2 text-sm focus:ring-sky-500 focus:border-sky-500" />
                    </div>
                    <div>
                        <label htmlFor="endDate" className="block text-sm font-medium text-slate-300 mb-1">Data Fim</label>
                        <input type="date" name="endDate" id="endDate" value={filters.endDate} onChange={handleFilterChange} className="w-full bg-slate-700 text-white border border-slate-600 rounded-md p-2 text-sm focus:ring-sky-500 focus:border-sky-500" />
                    </div>
                    <div>
                        <label htmlFor="veiculoId" className="block text-sm font-medium text-slate-300 mb-1">Veículo</label>
                        <select name="veiculoId" id="veiculoId" value={filters.veiculoId} onChange={handleFilterChange} className="w-full bg-slate-700 text-white border border-slate-600 rounded-md p-2 text-sm focus:ring-sky-500 focus:border-sky-500">
                            <option value="all">Todos os Veículos</option>
                            {veiculos.map(v => <option key={v.ID_Veiculo} value={v.ID_Veiculo}>{v.Placa} - {v.Motorista}</option>)}
                        </select>
                    </div>
                    <div>
                         <div className="flex items-center mb-2">
                            <input 
                                type="checkbox" 
                                id="showOnlyExcluded" 
                                checked={showOnlyExcluded} 
                                onChange={(e) => setShowOnlyExcluded(e.target.checked)}
                                className="h-4 w-4 rounded border-slate-500 bg-slate-700 text-sky-600 focus:ring-sky-500"
                            />
                            <label htmlFor="showOnlyExcluded" className="ml-2 text-sm text-slate-300">
                                Exibir apenas excluídos
                            </label>
                         </div>
                         <div className="flex gap-2">
                            <button onClick={clearFilters} className="w-full bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-md transition duration-200 text-sm">Limpar</button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Results Table */}
            <div className="bg-slate-800 rounded-lg shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-300">
                        <thead className="text-xs text-slate-400 uppercase bg-slate-700">
                            <tr>
                                <th scope="col" className="p-4 w-12"><span className="sr-only">Expandir</span></th>
                                <th scope="col" className="p-4">Data Frete</th>
                                <th scope="col" className="p-4">Veículo</th>
                                <th scope="col" className="p-4">Motorista</th>
                                <th scope="col" className="p-4">Cidades</th>
                                <th scope="col" className="p-4">Valor Total</th>
                                <th scope="col" className="p-4">
                                    {showOnlyExcluded ? 'Motivo Exclusão' : 'Motivo Subst.'}
                                </th>
                                <th scope="col" className="p-4 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredLancamentos.map((lancamento, index) => {
                                const veiculo = getVeiculoInfo(lancamento.ID_Veiculo);
                                const cidades = lancamento.Cargas.map(c => c.Cidade).join(', ');
                                const isExpanded = expandedRows.includes(index);
                                
                                const rowClasses = showOnlyExcluded
                                    ? "bg-red-900/10 hover:bg-red-900/20 cursor-pointer"
                                    : "bg-slate-800 border-b border-slate-700 hover:bg-slate-700/50 cursor-pointer";

                                return (
                                    <React.Fragment key={lancamento.ID_Lancamento}>
                                        <tr className={rowClasses} onClick={() => toggleRow(index)}>
                                            <td className="p-4 text-center">
                                                <button className="text-slate-400">
                                                    {isExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
                                                </button>
                                            </td>
                                            <td className="p-4 whitespace-nowrap">{new Date(lancamento.DataFrete + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                                            <td className="p-4 font-medium text-white whitespace-nowrap">{veiculo?.Placa || 'N/A'}</td>
                                            <td className="p-4">{veiculo?.Motorista || 'N/A'}</td>
                                            <td className="p-4 max-w-xs truncate" title={cidades}>{cidades}</td>
                                            <td className="p-4 font-mono text-green-400 whitespace-nowrap">{lancamento.Calculo.ValorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                                            <td className="p-4">
                                                {showOnlyExcluded ? (
                                                     lancamento.MotivoExclusao && (
                                                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-500/20 text-red-300">
                                                            {lancamento.MotivoExclusao}
                                                        </span>
                                                    )
                                                ) : (
                                                    lancamento.Motivo && (
                                                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-500/20 text-yellow-300">
                                                            {lancamento.Motivo}
                                                        </span>
                                                    )
                                                )}
                                            </td>
                                            <td className="p-4 text-center">
                                                <div className="flex items-center justify-center gap-4">
                                                    <button onClick={(e) => handleEdit(e, lancamento)} disabled={showOnlyExcluded} className="text-sky-400 hover:text-sky-300 disabled:text-slate-600 disabled:cursor-not-allowed" title="Editar Lançamento">
                                                        <PencilIcon className="w-5 h-5"/>
                                                    </button>
                                                    <button onClick={(e) => handleDeleteClick(e, lancamento)} disabled={showOnlyExcluded} className="text-red-400 hover:text-red-300 disabled:text-slate-600 disabled:cursor-not-allowed" title="Excluir Lançamento">
                                                        <TrashIcon className="w-5 h-5"/>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                        {isExpanded && (
                                            <tr className={showOnlyExcluded ? 'bg-red-900/10' : 'bg-slate-900/50'}>
                                                <td colSpan={8} className="p-0">
                                                    <div className="p-4 m-4 bg-slate-800/50 rounded-md">
                                                        <h4 className="text-md font-semibold text-slate-300 mb-3">Cargas do Lançamento</h4>
                                                        <table className="w-full text-sm">
                                                            <thead className="text-xs text-slate-400 uppercase">
                                                                <tr>
                                                                    <th className="p-2 text-left">Nº Carga</th>
                                                                    <th className="p-2 text-left">Cidade</th>
                                                                    <th className="p-2 text-left">Valor CTE</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {lancamento.Cargas.map(carga => (
                                                                    <tr key={carga.ID_Carga} className="border-t border-slate-700">
                                                                        <td className="p-2 font-medium text-white">{carga.NumeroCarga}</td>
                                                                        <td className="p-2">{carga.Cidade}</td>
                                                                        <td className="p-2 font-mono">{carga.ValorCTE.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
                {filteredLancamentos.length === 0 && (
                    <div className="text-center p-8 text-slate-400">
                        Nenhum lançamento encontrado para os filtros aplicados.
                    </div>
                )}
            </div>
        </div>
    );
};