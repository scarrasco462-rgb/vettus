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
  PieChart,
  Printer,
  User,
  Pencil
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
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [newExpense, setNewExpense] = useState<Partial<Expense>>({
    description: '',
    value: 0,
    category: 'Outros',
    dueDate: new Date().toISOString().split('T')[0],
    status: 'Pendente',
    payer: 'Fluxo de Caixa',
    isRecurring: false,
    recurringMonths: 1
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

    if (editingExpense) {
      onUpdateExpense({
        ...editingExpense,
        description: newExpense.description,
        value: newExpense.value,
        category: newExpense.category || 'Outros',
        dueDate: newExpense.dueDate || new Date().toISOString().split('T')[0],
        status: newExpense.status as 'Pendente' | 'Pago',
        payer: newExpense.payer as any,
        updatedAt: new Date().toISOString(),
        paymentDate: newExpense.status === 'Pago' ? (editingExpense.paymentDate || new Date().toISOString().split('T')[0]) : undefined
      });
    } else {
      const monthsToCreate = newExpense.isRecurring ? (newExpense.recurringMonths || 1) : 1;
      
      for (let i = 0; i < monthsToCreate; i++) {
        let currentMonth = selectedMonth + i;
        let currentYear = selectedYear;
        
        while (currentMonth > 12) {
          currentMonth -= 12;
          currentYear += 1;
        }

        // Ajustar data de vencimento para os meses subsequentes
        const baseDate = new Date(newExpense.dueDate || new Date().toISOString().split('T')[0]);
        const dueDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + i, baseDate.getDate());

        const expense: Expense = {
          id: Math.random().toString(36).substr(2, 9),
          brokerId: currentUser.id,
          description: newExpense.description + (newExpense.isRecurring && monthsToCreate > 1 ? ` (${i + 1}/${monthsToCreate})` : ''),
          value: newExpense.value || 0,
          category: newExpense.category || 'Outros',
          dueDate: dueDate.toISOString().split('T')[0],
          status: newExpense.status as 'Pendente' | 'Pago',
          payer: newExpense.payer as any,
          month: currentMonth,
          year: currentYear,
          isRecurring: newExpense.isRecurring,
          recurringMonths: newExpense.recurringMonths,
          updatedAt: new Date().toISOString(),
          paymentDate: newExpense.status === 'Pago' ? new Date().toISOString().split('T')[0] : undefined
        };
        onAddExpense(expense);
      }
    }

    setShowAddModal(false);
    setEditingExpense(null);
    setNewExpense({
      description: '',
      value: 0,
      category: 'Outros',
      dueDate: new Date().toISOString().split('T')[0],
      status: 'Pendente',
      payer: 'Fluxo de Caixa',
      isRecurring: false,
      recurringMonths: 1
    });
  };

  const openEditModal = (expense: Expense) => {
    setEditingExpense(expense);
    setNewExpense({
      description: expense.description,
      value: expense.value,
      category: expense.category,
      dueDate: expense.dueDate,
      status: expense.status,
      payer: expense.payer
    });
    setShowAddModal(true);
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

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 print:p-0">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            margin: 1cm;
            size: landscape;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            box-shadow: none !important;
          }
          body {
            background: white !important;
            color: black !important;
          }
          .no-print, aside, header, nav, button, .print\\:hidden {
            display: none !important;
          }
          main {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
          }
          .print-container {
            display: block !important;
            width: 100% !important;
          }
          .print-table {
            width: 100% !important;
            border-collapse: collapse !important;
            margin-top: 1rem !important;
            border: 1.5pt solid #000 !important;
          }
          .print-table th, .print-table td {
            border: 1pt solid #000 !important;
            padding: 8pt !important;
            text-align: left !important;
            color: black !important;
            background: white !important;
          }
          .print-table th {
            background-color: #f1f5f9 !important;
            font-weight: bold !important;
            text-transform: uppercase !important;
            font-size: 10pt !important;
          }
          .print-table td {
            font-size: 10pt !important;
          }
          .print-header {
            display: block !important;
            margin-bottom: 2rem !important;
            border-bottom: 2pt solid #000 !important;
            padding-bottom: 1rem !important;
          }
          .print-summary-grid {
            display: grid !important;
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 1rem !important;
            margin-bottom: 2rem !important;
          }
          .print-summary-item {
            border: 1pt solid #000 !important;
            padding: 1rem !important;
            text-align: center !important;
          }
          .print-summary-label {
            font-size: 9pt !important;
            font-weight: bold !important;
            text-transform: uppercase !important;
            margin-bottom: 0.5rem !important;
          }
          .print-summary-value {
            font-size: 14pt !important;
            font-weight: 900 !important;
          }
          tr {
            page-break-inside: avoid !important;
          }
        }
      `}} />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Controle Financeiro</h1>
          <p className="text-slate-500 font-medium">Gestão de despesas mensais e fluxo de caixa.</p>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={handlePrint}
            className="bg-white border border-slate-200 text-slate-600 p-3.5 rounded-2xl hover:bg-slate-50 transition-all shadow-sm flex items-center space-x-2"
            title="Imprimir Relatório"
          >
            <Printer className="w-5 h-5" />
          </button>
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

      <div className="hidden print:block print-header">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-black uppercase text-slate-900">Relatório Financeiro</h1>
            <p className="text-lg font-bold text-slate-500 uppercase tracking-widest">Vettus Imóveis</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-black uppercase">{MONTHS[selectedMonth - 1]} {selectedYear}</p>
            <p className="text-xs font-bold text-slate-400">Gerado em: {new Date().toLocaleDateString('pt-BR')}</p>
          </div>
        </div>
      </div>

      <div className="hidden print:block print-summary-grid">
        <div className="print-summary-item">
          <p className="print-summary-label">Total Pago</p>
          <p className="print-summary-value text-emerald-600">{formatCurrency(totals.paid)}</p>
        </div>
        <div className="print-summary-item">
          <p className="print-summary-label">A Pagar</p>
          <p className="print-summary-value text-amber-600">{formatCurrency(totals.pending)}</p>
        </div>
        <div className="print-summary-item">
          <p className="print-summary-label">Total Geral</p>
          <p className="print-summary-value text-slate-900">{formatCurrency(totals.total)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:hidden">
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

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden print:border-none print:shadow-none print:rounded-none">
        <div className="overflow-x-auto">
          <table className="w-full text-left print-table">
            <thead>
              <tr className="bg-[#0f172a] text-slate-300 text-[10px] font-black uppercase tracking-[0.2em] border-b border-white/5">
                <th className="px-8 py-6 print:px-4 print:py-3 print:text-sm">Descrição</th>
                <th className="px-8 py-6 print:px-4 print:py-3 print:text-sm">Categoria</th>
                <th className="px-8 py-6 print:px-4 print:py-3 print:text-sm">Pagador</th>
                <th className="px-8 py-6 print:px-4 print:py-3 print:text-sm">Vencimento</th>
                <th className="px-8 py-6 print:px-4 print:py-3 print:text-sm">Valor</th>
                <th className="px-8 py-6 print:px-4 print:py-3 print:text-sm">Status</th>
                <th className="px-8 py-6 text-right print:hidden">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExpenses.map((expense) => (
                <tr key={expense.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-8 py-6 print:px-4 print:py-3">
                    <p className="font-black text-slate-900 text-sm uppercase print:text-base">{expense.description}</p>
                  </td>
                  <td className="px-8 py-6 print:px-4 print:py-3">
                    <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-[9px] font-black uppercase tracking-tighter border border-slate-200 print:text-[11px] print:bg-transparent print:border-none">
                      {expense.category}
                    </span>
                  </td>
                  <td className="px-8 py-6 print:px-4 print:py-3">
                    <div className="flex items-center text-slate-900 text-[10px] font-black uppercase tracking-widest print:text-xs">
                      <User className="w-3 h-3 mr-2 text-[#d4a853] print:hidden" />
                      {expense.payer || 'Fluxo de Caixa'}
                    </div>
                  </td>
                  <td className="px-8 py-6 print:px-4 print:py-3">
                    <div className="flex items-center text-slate-500 text-xs font-bold print:text-sm print:text-slate-900">
                      <Calendar className="w-3.5 h-3.5 mr-2 print:hidden" />
                      {new Date(expense.dueDate).toLocaleDateString('pt-BR')}
                    </div>
                  </td>
                  <td className="px-8 py-6 print:px-4 print:py-3">
                    <p className="font-black text-slate-900 text-sm print:text-base">{formatCurrency(expense.value)}</p>
                  </td>
                  <td className="px-8 py-6 print:px-4 print:py-3">
                    <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all print:text-[10px] print:border-none print:p-0 ${
                        expense.status === 'Pago' 
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100 print:bg-transparent print:text-emerald-700' 
                        : 'bg-amber-50 text-amber-600 border-amber-100 print:bg-transparent print:text-amber-700'
                      }`}>
                      {expense.status}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right print:hidden">
                    <div className="flex items-center justify-end space-x-2">
                      <button 
                        onClick={() => openEditModal(expense)}
                        className="p-2 text-slate-300 hover:text-[#d4a853] transition-colors"
                        title="Editar Lançamento"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => onDeleteExpense(expense.id)}
                        className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                        title="Excluir Lançamento"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
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
          <div className="absolute inset-0 bg-[#020617]/90 backdrop-blur-sm" onClick={() => { setShowAddModal(false); setEditingExpense(null); }}></div>
          <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl relative overflow-hidden animate-in zoom-in duration-300">
            <div className="p-10">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-900 text-[#d4a853] flex items-center justify-center shadow-lg">
                    {editingExpense ? <Pencil className="w-6 h-6" /> : <DollarSign className="w-6 h-6" />}
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                      {editingExpense ? 'Editar Despesa' : 'Nova Despesa'}
                    </h2>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
                      {editingExpense ? 'Atualizar Lançamento' : 'Lançamento Financeiro'}
                    </p>
                  </div>
                </div>
                <button onClick={() => { setShowAddModal(false); setEditingExpense(null); }} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
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
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-[#d4a853] outline-none transition-all"
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
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-[#d4a853] outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block">Categoria</label>
                    <select 
                      value={newExpense.category}
                      onChange={e => setNewExpense({...newExpense, category: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-[#d4a853] outline-none transition-all"
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
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-[#d4a853] outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block">Pagador (Origem)</label>
                    <select 
                      value={newExpense.payer}
                      onChange={e => setNewExpense({...newExpense, payer: e.target.value as any})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-[#d4a853] outline-none transition-all"
                    >
                      <option value="Fluxo de Caixa">Fluxo de Caixa</option>
                      <option value="Sócio: Sergio">Sócio: Sergio</option>
                      <option value="Sócio: Leonardo">Sócio: Leonardo</option>
                    </select>
                  </div>
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

                {!editingExpense && (
                  <div className="flex items-center space-x-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                    <div className="flex items-center space-x-2">
                      <input 
                        type="checkbox" 
                        id="recurring"
                        checked={newExpense.isRecurring}
                        onChange={e => setNewExpense({...newExpense, isRecurring: e.target.checked})}
                        className="w-4 h-4 rounded border-slate-300 text-[#d4a853] focus:ring-[#d4a853]"
                      />
                      <label htmlFor="recurring" className="text-[10px] font-black text-slate-900 uppercase tracking-widest cursor-pointer">Recorrente</label>
                    </div>
                    {newExpense.isRecurring && (
                      <div className="flex items-center space-x-2 flex-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase">por</span>
                        <input 
                          type="number" 
                          min="1"
                          max="60"
                          value={newExpense.recurringMonths}
                          onChange={e => setNewExpense({...newExpense, recurringMonths: parseInt(e.target.value) || 1})}
                          className="w-16 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-900 outline-none"
                        />
                        <span className="text-[10px] font-black text-slate-400 uppercase">meses</span>
                      </div>
                    )}
                  </div>
                )}

                <button 
                  onClick={handleAddExpense}
                  className="w-full gold-gradient text-white py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-yellow-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all mt-4"
                >
                  {editingExpense ? 'Salvar Alterações' : 'Confirmar Lançamento'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
