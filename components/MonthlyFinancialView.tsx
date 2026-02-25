import React, { useState, useMemo } from 'react';
import { 
  Wallet, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  DollarSign, 
  Filter,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  PieChart
} from 'lucide-react';
import { Expense, Broker } from '../types.ts';

interface MonthlyFinancialViewProps {
  expenses: Expense[];
  onAddExpense: (expense: Expense) => void;
  onUpdateExpense: (expense: Expense) => void;
  onDeleteExpense: (id: string) => void;
  currentUser: Broker;
}

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const CATEGORIES = [
  'Aluguel', 'Energia', 'Água', 'Internet', 'Marketing', 
  'Salários', 'Impostos', 'Manutenção', 'Outros'
];

export const MonthlyFinancialView: React.FC<MonthlyFinancialViewProps> = ({
  expenses,
  onAddExpense,
  onUpdateExpense,
  onDeleteExpense,
  currentUser
}) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showAddModal, setShowAddModal] = useState(false);
  const [newExpense, setNewExpense] = useState<Partial<Expense>>({
    description: '',
    value: 0,
    category: 'Outros',
    dueDate: new Date().toISOString().split('T')[0],
    status: 'Pendente'
  });

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => e.month === selectedMonth && e.year === selectedYear);
  }, [expenses, selectedMonth, selectedYear]);

  const totals = useMemo(() => {
    const paid = filteredExpenses.filter(e => e.status === 'Pago').reduce((acc, e) => acc + e.value, 0);
    const pending = filteredExpenses.filter(e => e.status === 'Pendente').reduce((acc, e) => acc + e.value, 0);
    return { paid, pending, total: paid + pending };
  }, [filteredExpenses]);

  const handleAddExpense = () => {
    if (!newExpense.description || !newExpense.value) return;

    const expense: Expense = {
      id: Math.random().toString(36).substr(2, 9),
      brokerId: currentUser.id,
      description: newExpense.description,
      value: newExpense.value,
      category: newExpense.category || 'Outros',
      dueDate: newExpense.dueDate || new Date().toISOString().split('T')[0],
      status: newExpense.status as 'Pendente' | 'Pago',
      month: selectedMonth,
      year: selectedYear,
      updatedAt: new Date().toISOString(),
      paymentDate: newExpense.status === 'Pago' ? new Date().toISOString().split('T')[0] : undefined
    };

    onAddExpense(expense);
    setShowAddModal(false);
    setNewExpense({
      description: '',
      value: 0,
      category: 'Outros',
      dueDate: new Date().toISOString().split('T')[0],
      status: 'Pendente'
    });
  };

  const toggleStatus = (expense: Expense) => {
    const newStatus = expense.status === 'Pendente' ? 'Pago' : 'Pendente';
    onUpdateExpense({
      ...expense,
      status: newStatus,
      paymentDate: newStatus === 'Pago' ? new Date().toISOString().split('T')[0] : undefined,
      updatedAt: new Date().toISOString()
    });
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Controle Financeiro</h1>
          <p className="text-slate-500 font-medium">Gestão de despesas mensais e fluxo de caixa.</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center bg-white rounded-2xl border border-slate-200 p-1 shadow-sm">
            <button 
              onClick={() => setSelectedMonth(m => m === 1 ? 12 : m - 1)}
              className="p-2 hover:bg-slate-50 rounded-xl transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-slate-400" />
            </button>
            <div className="px-4 py-2 text-center min-w-[140px]">
              <span className="text-sm font-black text-slate-900 uppercase tracking-widest">
                {MONTHS[selectedMonth - 1]} {selectedYear}
              </span>
            </div>
            <button 
              onClick={() => setSelectedMonth(m => m === 12 ? 1 : m + 1)}
              className="p-2 hover:bg-slate-50 rounded-xl transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </button>
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="gold-gradient text-white px-6 py-3.5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:scale-105 transition-all flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Despesa</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex items-center space-x-6">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Pago</p>
            <p className="text-2xl font-black text-emerald-600">{formatCurrency(totals.paid)}</p>
          </div>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex items-center space-x-6">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-7 h-7" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">A Pagar</p>
            <p className="text-2xl font-black text-amber-600">{formatCurrency(totals.pending)}</p>
          </div>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex items-center space-x-6">
          <div className="w-14 h-14 rounded-2xl bg-slate-900 text-[#d4a853] flex items-center justify-center">
            <Wallet className="w-7 h-7" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Geral</p>
            <p className="text-2xl font-black text-slate-900">{formatCurrency(totals.total)}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#0f172a] text-slate-300 text-[10px] font-black uppercase tracking-[0.2em] border-b border-white/5">
                <th className="px-8 py-6">Descrição</th>
                <th className="px-8 py-6">Categoria</th>
                <th className="px-8 py-6">Vencimento</th>
                <th className="px-8 py-6">Valor</th>
                <th className="px-8 py-6">Status</th>
                <th className="px-8 py-6 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExpenses.map((expense) => (
                <tr key={expense.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-8 py-6">
                    <p className="font-black text-slate-900 text-sm uppercase">{expense.description}</p>
                  </td>
                  <td className="px-8 py-6">
                    <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-[9px] font-black uppercase tracking-tighter border border-slate-200">
                      {expense.category}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center text-slate-500 text-xs font-bold">
                      <Calendar className="w-3.5 h-3.5 mr-2" />
                      {new Date(expense.dueDate).toLocaleDateString('pt-BR')}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <p className="font-black text-slate-900 text-sm">{formatCurrency(expense.value)}</p>
                  </td>
                  <td className="px-8 py-6">
                    <button 
                      onClick={() => toggleStatus(expense)}
                      className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all ${
                        expense.status === 'Pago' 
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                        : 'bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-100'
                      }`}
                    >
                      {expense.status}
                    </button>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <button 
                      onClick={() => onDeleteExpense(expense.id)}
                      className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredExpenses.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-300">
                      <FileText className="w-12 h-12 mb-4 opacity-20" />
                      <p className="text-xs font-black uppercase tracking-widest">Nenhuma despesa lançada para este mês</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#020617]/90 backdrop-blur-sm" onClick={() => setShowAddModal(false)}></div>
          <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl relative overflow-hidden animate-in zoom-in duration-300">
            <div className="p-10">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-900 text-[#d4a853] flex items-center justify-center shadow-lg">
                    <DollarSign className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Nova Despesa</h2>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Lançamento Financeiro</p>
                  </div>
                </div>
                <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                  <Plus className="w-6 h-6 text-slate-400 rotate-45" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block">Descrição</label>
                  <input 
                    type="text" 
                    value={newExpense.description}
                    onChange={e => setNewExpense({...newExpense, description: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-[#d4a853] outline-none transition-all"
                    placeholder="Ex: Aluguel Escritório"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block">Valor (R$)</label>
                    <input 
                      type="number" 
                      value={newExpense.value}
                      onChange={e => setNewExpense({...newExpense, value: parseFloat(e.target.value)})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-[#d4a853] outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block">Categoria</label>
                    <select 
                      value={newExpense.category}
                      onChange={e => setNewExpense({...newExpense, category: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-[#d4a853] outline-none transition-all"
                    >
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block">Vencimento</label>
                    <input 
                      type="date" 
                      value={newExpense.dueDate}
                      onChange={e => setNewExpense({...newExpense, dueDate: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-[#d4a853] outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block">Status Inicial</label>
                    <div className="flex bg-slate-50 p-1 rounded-2xl border border-slate-200">
                      <button 
                        onClick={() => setNewExpense({...newExpense, status: 'Pendente'})}
                        className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${newExpense.status === 'Pendente' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-400'}`}
                      >
                        Pendente
                      </button>
                      <button 
                        onClick={() => setNewExpense({...newExpense, status: 'Pago'})}
                        className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${newExpense.status === 'Pago' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}
                      >
                        Pago
                      </button>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={handleAddExpense}
                  className="w-full gold-gradient text-white py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-yellow-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all mt-4"
                >
                  Confirmar Lançamento
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
