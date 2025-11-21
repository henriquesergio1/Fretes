
import React, { useState, useContext, useEffect } from 'react';
import { DataContext } from '../context/DataContext.tsx';
import { GestaoUsuarios } from './GestaoUsuarios.tsx';
import { CogIcon, UserGroupIcon, PhotographIcon, CheckCircleIcon } from './icons.tsx';
import { getCurrentMode, toggleMode } from '../services/apiService.ts';

// --- Componente de Marca/Identidade Visual ---
const SystemBranding: React.FC = () => {
    const { systemConfig, updateSystemConfig } = useContext(DataContext);
    const [name, setName] = useState(systemConfig.companyName);
    const [logo, setLogo] = useState(systemConfig.logoUrl);
    const [isSaved, setIsSaved] = useState(false);

    useEffect(() => {
        setName(systemConfig.companyName);
        setLogo(systemConfig.logoUrl);
    }, [systemConfig]);

    const handleSave = () => {
        updateSystemConfig({ companyName: name, logoUrl: logo });
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2000);
    };

    return (
        <div className="bg-slate-800 p-6 rounded-lg shadow-lg border border-slate-700">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Nome da Empresa</label>
                        <input 
                            type="text" 
                            value={name} 
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-slate-700 text-white border border-slate-600 rounded-md p-2 focus:ring-sky-500 focus:border-sky-500"
                            placeholder="Ex: Minha Transportadora"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">URL do Logo (Imagem)</label>
                        <input 
                            type="text" 
                            value={logo} 
                            onChange={(e) => setLogo(e.target.value)}
                            className="w-full bg-slate-700 text-white border border-slate-600 rounded-md p-2 focus:ring-sky-500 focus:border-sky-500"
                            placeholder="https://exemplo.com/logo.png"
                        />
                        <p className="text-xs text-slate-500 mt-1">Recomendado: Imagem PNG transparente, quadrada ou horizontal.</p>
                    </div>
                    <button 
                        onClick={handleSave}
                        className="bg-sky-600 hover:bg-sky-500 text-white font-bold py-2 px-4 rounded-md transition duration-200 flex items-center"
                    >
                        {isSaved ? <CheckCircleIcon className="w-5 h-5 mr-2" /> : null}
                        {isSaved ? 'Salvo!' : 'Salvar Configurações'}
                    </button>
                </div>

                {/* Preview Area */}
                <div className="bg-slate-900 rounded-lg p-6 flex flex-col items-center justify-center border border-slate-700">
                    <p className="text-xs text-slate-500 mb-4 uppercase tracking-wider">Pré-visualização do Menu</p>
                    <div className="bg-slate-800 w-48 p-4 rounded-md border border-slate-700 flex flex-col items-center">
                         {logo ? (
                            <img src={logo} alt="Logo Preview" className="h-12 object-contain mb-2" onError={(e) => (e.currentTarget.style.display = 'none')} />
                        ) : (
                             <div className="h-12 w-12 bg-slate-700 rounded-full flex items-center justify-center mb-2">
                                <CogIcon className="h-8 w-8 text-slate-500"/>
                             </div>
                        )}
                        {name && <span className="text-white font-bold text-center text-sm">{name}</span>}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Componente de Controle de Sistema (Mock/API) ---
const SystemControl: React.FC = () => {
    const currentMode = getCurrentMode();
    const isMock = currentMode === 'MOCK';

    return (
        <div className="bg-slate-800 p-6 rounded-lg shadow-lg border border-slate-700">
            <div className="flex flex-col sm:flex-row items-center justify-between bg-slate-900/50 p-4 rounded-md border border-slate-700">
                <div className="mb-4 sm:mb-0">
                    <p className="text-sm text-slate-300">Modo Atual:</p>
                    <p className={`text-xl font-bold ${isMock ? 'text-yellow-400' : 'text-green-400'}`}>
                        {isMock ? 'MOCK (Dados Falsos)' : 'API REAL (Produção)'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                        {isMock 
                            ? 'O sistema está usando dados locais simulados. Nenhuma alteração será salva no banco real.' 
                            : 'O sistema está conectado ao servidor. Todas as alterações são permanentes.'}
                    </p>
                </div>

                <div className="flex gap-4">
                    <button 
                        onClick={() => toggleMode('API')}
                        disabled={!isMock}
                        className={`px-4 py-2 rounded-md font-bold text-sm transition-colors ${!isMock ? 'bg-green-900/30 text-green-600 cursor-default border border-green-900/50' : 'bg-green-600 hover:bg-green-500 text-white'}`}
                    >
                        Usar API Real
                    </button>
                    <button 
                         onClick={() => toggleMode('MOCK')}
                         disabled={isMock}
                         className={`px-4 py-2 rounded-md font-bold text-sm transition-colors ${isMock ? 'bg-yellow-900/30 text-yellow-600 cursor-default border border-yellow-900/50' : 'bg-yellow-600 hover:bg-yellow-500 text-white'}`}
                    >
                        Usar Dados Mock
                    </button>
                </div>
            </div>
        </div>
    );
};

export const AdminPanel: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'users' | 'branding' | 'system'>('users');

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-white mb-2">Administração</h2>
                <p className="text-slate-400">Painel central para gestão de usuários e configurações do sistema.</p>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 border-b border-slate-700 overflow-x-auto">
                <button
                    onClick={() => setActiveTab('users')}
                    className={`px-6 py-3 text-sm font-medium rounded-t-lg transition-colors flex items-center whitespace-nowrap ${
                        activeTab === 'users'
                            ? 'bg-slate-800 text-sky-400 border-t border-l border-r border-slate-700'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                    }`}
                >
                    <UserGroupIcon className="w-5 h-5 mr-2" />
                    Usuários
                </button>
                <button
                    onClick={() => setActiveTab('branding')}
                    className={`px-6 py-3 text-sm font-medium rounded-t-lg transition-colors flex items-center whitespace-nowrap ${
                        activeTab === 'branding'
                            ? 'bg-slate-800 text-sky-400 border-t border-l border-r border-slate-700'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                    }`}
                >
                    <PhotographIcon className="w-5 h-5 mr-2" />
                    Identidade Visual
                </button>
                <button
                    onClick={() => setActiveTab('system')}
                    className={`px-6 py-3 text-sm font-medium rounded-t-lg transition-colors flex items-center whitespace-nowrap ${
                        activeTab === 'system'
                            ? 'bg-slate-800 text-sky-400 border-t border-l border-r border-slate-700'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                    }`}
                >
                    <CogIcon className="w-5 h-5 mr-2" />
                    Sistema
                </button>
            </div>

            {/* Content Area */}
            <div>
                {activeTab === 'users' && <GestaoUsuarios embedded={true} />}
                {activeTab === 'branding' && <SystemBranding />}
                {activeTab === 'system' && <SystemControl />}
            </div>
        </div>
    );
};
