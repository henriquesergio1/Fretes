
import React, { useState, useMemo, useContext, useEffect } from 'react';
import { Veiculo } from '../types.ts';
import { DataContext } from '../context/DataContext.tsx';
import { PlusCircleIcon, PencilIcon, XCircleIcon, CheckCircleIcon } from './icons.tsx';

// --- Tag Component for Veiculo Origin ---
const OrigemTag: React.FC<{ origem?: 'ERP' | 'CSV' | 'Manual' }> = ({ origem }) => {
    if (!origem) return null;

    const styles = {
        ERP: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
        CSV: 'bg-orange-500/20 text-orange-300 border border-orange-500/30',
        Manual: 'bg-green-500/20 text-green-300 border border-green-500/30',
    };

    return (
        <span className={`ml-2 px-2 py-0.5 text-xs font-semibold rounded-full ${styles[origem] || styles.Manual}`}>
            {origem}
        </span>
    );
};

// --- Modal Component for Editing/Creating Vehicles ---
const VeiculoModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (veiculo: Veiculo) => void;
    veiculo: Veiculo | null;
}> = ({ isOpen, onClose, onSave, veiculo }) => {
    
    const { tiposVeiculo } = useContext(DataContext);
    const [formData, setFormData] = useState<Veiculo | null>(null);
    const [isManualType, setIsManualType] = useState(false);

    useEffect(() => {
        // Initialize form data when veiculo prop changes
        setFormData(veiculo);
        setIsManualType(false); // Reset manual type mode when opening modal
    }, [veiculo]);

    if (!isOpen || !formData) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox' && e.target instanceof HTMLInputElement) {
             setFormData({ ...formData, [name]: e.target.checked });
        } else {
             setFormData({ ...formData, [name]: value });
        }
    };

    const handleSaveClick = () => {
        if (!formData.Placa || !formData.TipoVeiculo) {
            alert("Placa e Tipo de Veículo são obrigatórios.");
            return;
        }
        const processedData: Veiculo = {
            ...formData,
            CapacidadeKG: parseFloat(String(formData.CapacidadeKG)) || 0,
        };
        onSave(processedData);
    };

    const toggleManualType = () => {
        const novoModo = !isManualType;
        setIsManualType(novoModo);
        // Se mudar para modo manual, limpa o campo para o usuário digitar
        // Se voltar para lista, limpa também para forçar seleção
        setFormData({ ...formData, TipoVeiculo: '' });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-lg">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-white">
                        {formData.ID_Veiculo ? 'Editar Veículo' : 'Cadastrar Novo Veículo'}
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white">
                        <XCircleIcon className="w-8 h-8"/>
                    </button>
                </div>

                <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="Placa" className="block text-sm font-medium text-slate-300 mb-1">Placa *</label>
                            <input type="text" name="Placa" id="Placa" value={formData.Placa} onChange={handleChange} className="w-full bg-slate-700 text-white border border-slate-600 rounded-md p-2 focus:ring-sky-500 focus:border-sky-500" placeholder="AAA-0000" />
                        </div>
                        <div>
                            <label htmlFor="COD_Veiculo" className="block text-sm font-medium text-slate-300 mb-1">Código (ERP)</label>
                            <input type="text" name="COD_Veiculo" id="COD_Veiculo" value={formData.COD_Veiculo} onChange={handleChange} className="w-full bg-slate-700 text-white border border-slate-600 rounded-md p-2 focus:ring-sky-500 focus:border-sky-500" placeholder="Ex: VEC001" />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="Motorista" className="block text-sm font-medium text-slate-300 mb-1">Motorista</label>
                        <input type="text" name="Motorista" id="Motorista" value={formData.Motorista} onChange={handleChange} className="w-full bg-slate-700 text-white border border-slate-600 rounded-md p-2 focus:ring-sky-500 focus:border-sky-500" />
                    </div>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="TipoVeiculo" className="block text-sm font-medium text-slate-300 mb-1">Tipo de Veículo *</label>
                            <div className="flex gap-2">
                                {isManualType ? (
                                    <input 
                                        type="text" 
                                        name="TipoVeiculo" 
                                        id="TipoVeiculo" 
                                        value={formData.TipoVeiculo} 
                                        onChange={handleChange} 
                                        className="w-full bg-slate-700 text-white border border-slate-600 rounded-md p-2 focus:ring-sky-500 focus:border-sky-500 animate-pulse-once"
                                        placeholder="Digite novo tipo (Ex: VUC)" 
                                        autoFocus
                                    />
                                ) : (
                                    <select 
                                        name="TipoVeiculo" 
                                        id="TipoVeiculo" 
                                        value={formData.TipoVeiculo} 
                                        onChange={handleChange} 
                                        className="w-full bg-slate-700 text-white border border-slate-600 rounded-md p-2 focus:ring-sky-500 focus:border-sky-500"
                                    >
                                        <option value="">Selecione...</option>
                                        {tiposVeiculo.map(tipo => (
                                            <option key={tipo} value={tipo}>{tipo}</option>
                                        ))}
                                    </select>
                                )}
                                <button 
                                    type="button"
                                    onClick={toggleManualType}
                                    className={`p-2 rounded-md transition-colors border ${isManualType ? 'bg-slate-600 hover:bg-slate-500 text-white border-slate-500' : 'bg-sky-600 hover:bg-sky-500 text-white border-sky-500'}`}
                                    title={isManualType ? "Cancelar e voltar para lista" : "Adicionar novo tipo manualmente"}
                                >
                                    {isManualType ? <XCircleIcon className="w-5 h-5"/> : <PlusCircleIcon className="w-5 h-5"/>}
                                </button>
                            </div>
                            {isManualType && <p className="text-xs text-sky-400 mt-1">Digite o novo tipo para cadastrá-lo.</p>}
                        </div>
                        <div>
                            <label htmlFor="CapacidadeKG" className="block text-sm font-medium text-slate-300 mb-1">Capacidade (KG)</label>
                            <input type="number" name="CapacidadeKG" id="CapacidadeKG" value={formData.CapacidadeKG} onChange={handleChange} className="w-full bg-slate-700 text-white border border-slate-600 rounded-md p-2 focus:ring-sky-500 focus:border-sky-500" />
                        </div>
                    </div>
                     <div className="flex items-center mt-2">
                        <input type="checkbox" name="Ativo" id="Ativo" checked={formData.Ativo} onChange={handleChange} className="h-4 w-4 rounded border-slate-500 bg-slate-700 text-sky-600 focus:ring-sky-500" />
                        <label htmlFor="Ativo" className="ml-2 block text-sm text-slate-300">Veículo Ativo</label>
                    </div>
                </div>

                <div className="mt-8 flex justify-end space-x-3">
                    <button onClick={onClose} className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-md transition duration-200">
                        Cancelar
                    </button>
                    <button onClick={handleSaveClick} className="bg-sky-600 hover:bg-sky-500 text-white font-bold py-2 px-4 rounded-md transition duration-200 flex items-center">
                        <CheckCircleIcon className="w-5 h-5 mr-2" />
                        Salvar Veículo
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Main Component for Vehicle Management ---
export const GestaoVeiculos: React.FC = () => {
    const { veiculos, addVeiculo, updateVeiculo } = useContext(DataContext);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingVeiculo, setEditingVeiculo] = useState<Veiculo | null>(null);

    const filteredVeiculos = useMemo(() => {
        if (!searchTerm) return veiculos;
        return veiculos.filter(v => 
            v.Placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
            v.Motorista.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [veiculos, searchTerm]);

    const handleOpenModalForNew = () => {
        setEditingVeiculo({
            ID_Veiculo: 0, // Temp ID for new vehicle
            COD_Veiculo: '',
            Placa: '',
            TipoVeiculo: '',
            Motorista: '',
            CapacidadeKG: 0,
            Ativo: true,
            Origem: 'Manual'
        });
        setIsModalOpen(true);
    };

    const handleOpenModalForEdit = (veiculo: Veiculo) => {
        setEditingVeiculo(veiculo);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingVeiculo(null);
    };

    const handleSaveVeiculo = async (veiculoToSave: Veiculo) => {
        try {
            if (veiculoToSave.ID_Veiculo === 0) {
                await addVeiculo(veiculoToSave);
            } else {
                await updateVeiculo(veiculoToSave);
            }
            handleCloseModal();
        } catch (error) {
            alert("Erro ao salvar veículo: " + error);
        }
    };

    return (
        <div className="space-y-8">
            <VeiculoModal 
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onSave={handleSaveVeiculo}
                veiculo={editingVeiculo}
            />
            <div>
                <h2 className="text-2xl font-bold text-white mb-2">Gestão de Veículos</h2>
                <p className="text-slate-400">Consulte, cadastre e edite os veículos da sua frota.</p>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <input
                    type="text"
                    placeholder="Buscar por Placa ou Motorista..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full sm:w-1/2 bg-slate-700 text-white border border-slate-600 rounded-md p-2 focus:ring-sky-500 focus:border-sky-500"
                />
                <button onClick={handleOpenModalForNew} className="w-full sm:w-auto bg-sky-600 hover:bg-sky-500 text-white font-bold py-2 px-4 rounded-md transition duration-200 flex items-center justify-center">
                    <PlusCircleIcon className="w-5 h-5 mr-2" />
                    Cadastrar Novo Veículo
                </button>
            </div>

            <div className="bg-slate-800 rounded-lg shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-300">
                        <thead className="text-xs text-slate-400 uppercase bg-slate-700">
                            <tr>
                                <th scope="col" className="p-4">Placa</th>
                                <th scope="col" className="p-4">Motorista</th>
                                <th scope="col" className="p-4">Tipo</th>
                                <th scope="col" className="p-4">Capacidade</th>
                                <th scope="col" className="p-4">Status</th>
                                <th scope="col" className="p-4"><span className="sr-only">Ações</span></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredVeiculos.map(veiculo => (
                                <tr key={veiculo.ID_Veiculo} className="bg-slate-800 border-b border-slate-700 hover:bg-slate-700/50">
                                    <td className="p-4 font-medium text-white">
                                        {veiculo.Placa}
                                        <OrigemTag origem={veiculo.Origem} />
                                    </td>
                                    <td className="p-4">{veiculo.Motorista}</td>
                                    <td className="p-4">{veiculo.TipoVeiculo}</td>
                                    <td className="p-4">{veiculo.CapacidadeKG.toLocaleString('pt-BR')} kg</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${veiculo.Ativo ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                                            {veiculo.Ativo ? 'Ativo' : 'Inativo'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right">
                                        <button onClick={() => handleOpenModalForEdit(veiculo)} className="text-sky-400 hover:text-sky-300">
                                            <PencilIcon className="w-5 h-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                 {filteredVeiculos.length === 0 && (
                    <div className="text-center p-8 text-slate-400">
                        Nenhum veículo encontrado.
                    </div>
                 )}
            </div>
        </div>
    );
};
