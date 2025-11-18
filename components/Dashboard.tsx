import React, { useContext, useMemo, useState } from 'react';
import { ChartBarIcon, TruckIcon, ExclamationIcon } from './icons.tsx';
import { DataContext } from '../context/DataContext.tsx';

// Reusable components for the page
const MetricCard: React.FC<{ title: string; value: string; icon: React.ReactNode; description: string; valueColor?: string }> = ({ title, value, icon, description, valueColor = 'text-white' }) => (
    <div className="bg-slate-800 p-6 rounded-lg shadow-lg flex items-start">
        <div className="bg-slate-700 p-3 rounded-md mr-4">
            {icon}
        </div>
        <div>
            <p className="text-sm text-slate-400">{title}</p>
            <p className={`text-2xl font-bold ${valueColor}`}>{value}</p>
            <p className="text-xs text-slate-500 mt-1">{description}</p>
        </div>
    </div>
);

const ReportCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
        <h3 className="text-lg font-semibold text-sky-400 mb-4">{title}</h3>
        {children}
    </div>
);

const ComparisonBarChart: React.FC<{ data: { label: string; receita: number; custo: number }[] }> = ({ data }) => {
    const maxValue = Math.max(...data.flatMap(d => [d.receita, d.custo]), 0);
    if (maxValue === 0) {
        return <p className="text-slate-500 text-center py-8">Não há dados suficientes para exibir o gráfico.</p>
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-end space-x-4 text-xs">
                <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-green-500 mr-2"></span>Receita (CTE)</div>
                <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-orange-500 mr-2"></span>Custo (Frete)</div>
            </div>
            {data.map(item => (
                <div key={item.label} className="flex flex-col text-sm space-y-2">
                    <div className="flex justify-between">
                        <div className="text-slate-300 truncate pr-2">{item.label}</div>
                        <div className="font-mono text-xs text-slate-400">
                           <span className="text-green-400">{item.receita.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL'})}</span> / <span className="text-orange-400">{item.custo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL'})}</span>
                        </div>
                    </div>
                    <div className="w-full bg-slate-700 rounded-md h-6 p-1 flex items-center space-x-1">
                        <div
                            className="bg-green-500 h-full rounded-sm"
                            style={{ width: `${(item.receita / maxValue) * 100}%` }}
                            title={`Receita: ${item.receita.toLocaleString('pt-BR')}`}
                        ></div>
                    </div>
                     <div className="w-full bg-slate-700 rounded-md h-6 p-1 flex items-center space-x-1 -mt-7">
                         <div
                            className="bg-orange-500 h-full rounded-sm opacity-80"
                            style={{ width: `${(item.custo / maxValue) * 100}%` }}
                            title={`Custo: ${item.custo.toLocaleString('pt-BR')}`}
                        ></div>
                    </div>
                </div>
            ))}
        </div>
    );
};

const SimpleBarChart: React.FC<{ data: { label: string; value: number }[] }> = ({ data }) => {
    const maxValue = Math.max(...data.map(d => d.value), 0);
    if (maxValue === 0) {
        return <p className="text-slate-500 text-center py-8">Nenhum frete realizado no período.</p>
    }

    return (
        <div className="space-y-4">
            {data.map(item => (
                <div key={item.label}>
                    <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-300 truncate pr-2">{item.label}</span>
                        <span className="font-mono text-slate-400">{item.value} frete{item.value > 1 ? 's' : ''}</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2.5">
                        <div
                            className="bg-sky-500 h-2.5 rounded-full"
                            style={{ width: `${(item.value / maxValue) * 100}%` }}
                        ></div>
                    </div>
                </div>
            ))}
        </div>
    );
};


export const Dashboard: React.FC = () => {
    const { lancamentos, veiculos } = useContext(DataContext);
    const [filterType, setFilterType] = useState('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const filteredLancamentos = useMemo(() => {
        const activeLancamentos = lancamentos.filter(l => !l.Excluido);
        
        if (filterType === 'all') {
            return activeLancamentos;
        }

        const now = new Date();
        now.setHours(0, 0, 0, 0);

        if (filterType === 'today') {
            const todayStr = now.toISOString().split('T')[0];
            return activeLancamentos.filter(l => l.DataFrete === todayStr);
        }

        if (filterType === 'last30') {
            const thirtyDaysAgo = new Date(now);
            thirtyDaysAgo.setDate(now.getDate() - 30);
            return activeLancamentos.filter(l => {
                const freteDate = new Date(l.DataFrete + 'T00:00:00');
                return freteDate >= thirtyDaysAgo;
            });
        }
        
        if (filterType === 'custom' && startDate && endDate) {
             return activeLancamentos.filter(l => {
                const freteDateStr = l.DataFrete;
                return freteDateStr >= startDate && freteDateStr <= endDate;
            });
        }

        return activeLancamentos;

    }, [lancamentos, filterType, startDate, endDate]);

    const dashboardData = useMemo(() => {
        const fretesAtivos = filteredLancamentos;

        const totalCustoFrete = fretesAtivos.reduce((acc, l) => acc + l.Calculo.ValorTotal, 0);
        
        const totalFaturadoCTE = fretesAtivos.reduce((acc, l) => {
            return acc + l.Cargas.reduce((cargaAcc, c) => cargaAcc + c.ValorCTE, 0);
        }, 0);
        
        const resultado = totalFaturadoCTE - totalCustoFrete;

        const motoristaMap = new Map<number, string>();
        veiculos.forEach(v => motoristaMap.set(v.ID_Veiculo, v.Motorista));

        const performanceMotoristas: { [key: string]: number } = {};
        fretesAtivos.forEach(l => {
            const motorista = motoristaMap.get(l.ID_Veiculo) || 'Desconhecido';
            performanceMotoristas[motorista] = (performanceMotoristas[motorista] || 0) + 1;
        });

        const topMotoristas = Object.entries(performanceMotoristas)
            .map(([label, value]) => ({ label, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);
        
        const porCidade = new Map<string, { receita: number, custo: number, count: number }>();
        fretesAtivos.forEach(l => {
            const custoTotalLancamento = l.Calculo.ValorTotal;
            l.Cargas.forEach(c => {
                const cidade = c.Cidade;
                 if (!porCidade.has(cidade)) {
                    porCidade.set(cidade, { receita: 0, custo: 0, count: 0 });
                }
                const stats = porCidade.get(cidade)!;
                stats.receita += c.ValorCTE;
                const receitaTotalCargas = l.Cargas.reduce((sum, carga) => sum + carga.ValorCTE, 0);
                if (receitaTotalCargas > 0) {
                     stats.custo += custoTotalLancamento * (c.ValorCTE / receitaTotalCargas);
                } else if (l.Cargas.length > 0) {
                     stats.custo += custoTotalLancamento / l.Cargas.length;
                }
                stats.count += 1;
            });
        });

        const top5Cidades = [...porCidade.entries()]
            .map(([label, values]) => ({ label, ...values }))
            .sort((a, b) => b.receita - a.receita)
            .slice(0, 5);


        return {
            totalFretes: fretesAtivos.length,
            totalFaturadoCTE,
            totalCustoFrete,
            resultado,
            topMotoristas,
            top5Cidades,
        };
    }, [filteredLancamentos, veiculos]);

    const resultadoColor = dashboardData.resultado >= 0 ? 'text-green-400' : 'text-red-400';

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-bold text-white mb-2">Dashboard</h2>
                <p className="text-slate-400">Visualize métricas e performance da operação.</p>
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                 <MetricCard 
                    title="Total Faturado (CTE)" 
                    value={dashboardData.totalFaturadoCTE.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    icon={<ChartBarIcon className="w-6 h-6 text-green-400"/>}
                    description="Receita total de fretes"
                />
                 <MetricCard 
                    title="Total Custo (Frete)" 
                    value={dashboardData.totalCustoFrete.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    icon={<ChartBarIcon className="w-6 h-6 text-orange-400"/>}
                    description="Custo total de fretes pagos"
                />
                 <MetricCard 
                    title="Resultado (Lucro)" 
                    value={dashboardData.resultado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    icon={<ChartBarIcon className={`w-6 h-6 ${dashboardData.resultado >= 0 ? 'text-green-400' : 'text-red-400'}`}/>}
                    description="Faturamento - Custo"
                    valueColor={resultadoColor}
                />
                 <MetricCard 
                    title="Total de Fretes" 
                    value={String(dashboardData.totalFretes)}
                    icon={<TruckIcon className="w-6 h-6 text-sky-400"/>}
                    description="Lançamentos no período"
                />
            </div>
            
            <div className="bg-slate-800 p-4 rounded-lg flex flex-wrap items-end gap-4">
                <span className="font-semibold text-slate-300 text-sm">Período:</span>
                 <div>
                    <label htmlFor="date-range" className="sr-only">Período</label>
                    <select id="date-range" value={filterType} onChange={(e) => setFilterType(e.target.value)} className="bg-slate-700 text-white border border-slate-600 rounded-md p-2 text-sm focus:ring-sky-500 focus:border-sky-500">
                        <option value="all">Período Completo</option>
                        <option value="today">Hoje</option>
                        <option value="last30">Últimos 30 dias</option>
                        <option value="custom">Personalizado</option>
                    </select>
                </div>
                {filterType === 'custom' && (
                    <>
                        <div>
                            <label htmlFor="startDate" className="block text-xs font-medium text-slate-400 mb-1">Início</label>
                            <input type="date" id="startDate" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-slate-700 text-white border border-slate-600 rounded-md p-2 text-sm focus:ring-sky-500 focus:border-sky-500" />
                        </div>
                         <div>
                            <label htmlFor="endDate" className="block text-xs font-medium text-slate-400 mb-1">Fim</label>
                            <input type="date" id="endDate" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-slate-700 text-white border border-slate-600 rounded-md p-2 text-sm focus:ring-sky-500 focus:border-sky-500" />
                        </div>
                    </>
                )}
            </div>

            {/* Reports Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <ReportCard title="Receita vs. Custo (Top 5 Cidades)">
                    <ComparisonBarChart data={dashboardData.top5Cidades} />
                </ReportCard>

                <ReportCard title="Top 5 Motoristas por Nº de Fretes">
                    <SimpleBarChart data={dashboardData.topMotoristas} />
                </ReportCard>
            </div>
        </div>
    );
};