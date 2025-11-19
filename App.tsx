
import React, { useState, useContext } from 'react';
import { LancamentoFrete } from './components/LancamentoFrete.tsx';
import { Dashboard } from './components/Dashboard.tsx';
import { Relatorios } from './components/Relatorios.tsx';
import { Importacao } from './components/Importacao.tsx';
import { GestaoVeiculos } from './components/GestaoVeiculos.tsx';
import { GestaoParametros } from './components/GestaoParametros.tsx';
import { GestaoCargas } from './components/GestaoCargas.tsx';
import { DataProvider, DataContext } from './context/DataContext.tsx';
import { ChartBarIcon, CogIcon, PlusCircleIcon, TruckIcon, DocumentReportIcon, CloudUploadIcon, BoxIcon, SpinnerIcon, XCircleIcon, ChevronDoubleLeftIcon, ChevronDoubleRightIcon } from './components/icons.tsx';

type View = 'dashboard' | 'lancamento' | 'veiculos' | 'cargas' | 'parametros' | 'relatorios' | 'importacao';

interface SidebarProps {
    activeView: View;
    setView: (view: View) => void;
    isCollapsed: boolean;
    setCollapsed: (collapsed: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, setView, isCollapsed, setCollapsed }) => {
    const { systemConfig } = useContext(DataContext);
    
    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: ChartBarIcon },
        { id: 'lancamento', label: 'Novo Lançamento', icon: PlusCircleIcon },
        { id: 'veiculos', label: 'Veículos', icon: TruckIcon },
        { id: 'cargas', label: 'Cargas', icon: BoxIcon },
        { id: 'relatorios', label: 'Relatórios', icon: DocumentReportIcon },
        { id: 'importacao', label: 'Importação', icon: CloudUploadIcon },
        { id: 'parametros', label: 'Parâmetros', icon: CogIcon },
    ] as const;

    return (
        <div className={`bg-slate-900 border-r border-slate-800 flex flex-col transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`}>
            {/* Dynamic Header */}
            <div className={`flex flex-col items-center justify-center border-b border-slate-800 transition-all duration-300 py-4 min-h-[5rem] ${isCollapsed ? 'px-2' : 'px-4'}`}>
                {systemConfig.logoUrl ? (
                    <>
                        <img 
                            src={systemConfig.logoUrl} 
                            alt="Logo" 
                            className={`object-contain transition-all duration-300 ${isCollapsed ? 'h-8 w-8' : 'h-12 max-w-full'}`} 
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                         <h1 className={`text-lg font-bold text-white mt-2 text-center transition-all duration-200 ${isCollapsed ? 'opacity-0 h-0 overflow-hidden mt-0' : 'opacity-100'}`}>
                            {systemConfig.companyName || 'Fretes'}
                        </h1>
                    </>
                ) : (
                    <div className="flex items-center justify-center">
                        <TruckIcon className="h-8 w-8 text-sky-500 shrink-0" />
                        <h1 className={`text-xl font-bold text-white ml-3 transition-opacity duration-200 ${isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>
                            {systemConfig.companyName || 'Fretes'}
                        </h1>
                    </div>
                )}
            </div>

            <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
                {navItems.map(item => (
                    <button
                        key={item.id}
                        onClick={() => setView(item.id)}
                        title={isCollapsed ? item.label : undefined}
                        className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200 ${isCollapsed ? 'justify-center' : ''} ${
                            activeView === item.id 
                                ? 'bg-sky-500 text-white' 
                                : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                        }`}
                    >
                        <item.icon className="h-5 w-5 shrink-0" />
                        <span className={`ml-3 transition-opacity whitespace-nowrap ${isCollapsed ? 'opacity-0 hidden' : 'opacity-100'}`}>{item.label}</span>
                    </button>
                ))}
            </nav>
            
            {/* System Info Footer */}
            <div className="border-t border-slate-800 p-4 bg-slate-900/50">
                <div className={`flex flex-col ${isCollapsed ? 'items-center' : ''}`}>
                    <p className="text-xs font-mono text-slate-500" title="Versão do Sistema">v1.0.14</p>
                    <div className={`transition-all duration-300 overflow-hidden ${isCollapsed ? 'h-0 opacity-0' : 'h-auto opacity-100 mt-1'}`}>
                        <p className="text-[10px] text-slate-600 uppercase tracking-wider">Dev</p>
                        <p className="text-xs text-slate-400 font-medium whitespace-nowrap">Sérgio Oliveira</p>
                    </div>
                </div>
            </div>

            <div className={`p-4 border-t border-slate-800 transition-all duration-300`}>
                <button 
                    onClick={() => setCollapsed(!isCollapsed)}
                    className="w-full flex items-center justify-center px-4 py-3 text-sm font-medium rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white transition-colors duration-200"
                    title={isCollapsed ? "Expandir menu" : "Recolher menu"}
                >
                    {isCollapsed ? <ChevronDoubleRightIcon className="h-5 w-5"/> : <ChevronDoubleLeftIcon className="h-5 w-5"/>}
                </button>
            </div>
        </div>
    );
};

const AppUI: React.FC = () => {
    const { loading, error } = useContext(DataContext);
    const [activeView, setActiveView] = useState<View>('dashboard');
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    const renderContent = () => {
        switch (activeView) {
            case 'lancamento':
                return <LancamentoFrete setView={setActiveView} />;
            case 'importacao':
                return <Importacao />;
            case 'dashboard':
                return <Dashboard />;
            case 'veiculos':
                return <GestaoVeiculos />;
            case 'cargas':
                return <GestaoCargas />;
            case 'relatorios':
                return <Relatorios setView={setActiveView} />;
            case 'parametros':
                return <GestaoParametros />;
            default:
                return <Dashboard />;
        }
    };
    
    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-slate-900">
                <div className="flex flex-col items-center text-slate-400">
                    <SpinnerIcon className="w-12 h-12 text-sky-500" />
                    <p className="mt-4 text-lg">Carregando dados...</p>
                </div>
            </div>
        );
    }

    if (error) {
         return (
            <div className="flex h-screen w-full items-center justify-center bg-slate-900 p-4">
                <div className="flex flex-col items-center text-center max-w-lg p-8 bg-slate-800 rounded-lg border border-red-700/50">
                    <XCircleIcon className="w-12 h-12 text-red-500" />
                    <h2 className="mt-4 text-xl font-bold text-white">Erro de Conexão</h2>
                    <p className="mt-2 text-slate-400">Não foi possível carregar os dados do sistema. Verifique se o serviço de backend está em execução e tente novamente.</p>
                    <p className="mt-4 text-xs text-slate-500 bg-slate-900 p-2 rounded-md font-mono">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-slate-800 text-slate-100">
            <Sidebar activeView={activeView} setView={setActiveView} isCollapsed={isSidebarCollapsed} setCollapsed={setIsSidebarCollapsed} />
            <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto bg-slate-800">
                <div className="max-w-7xl mx-auto">
                   {renderContent()}
                </div>
            </main>
        </div>
    );
};

const App: React.FC = () => {
    return (
        <DataProvider>
            <AppUI />
        </DataProvider>
    );
}

export default App;
