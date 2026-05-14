import React, { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { collection, query, getDocs, addDoc, doc, deleteDoc, orderBy, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Calendar, 
  Users, 
  BarChart, 
  Trash2, 
  PlusCircle, 
  X,
  User,
  Book,
  MapPin,
  Clock,
  LogOut,
  ChevronRight,
  GraduationCap
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { 
  BarChart as ReBarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend
} from 'recharts';

interface Schedule {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  subject: string;
  room: string;
  teacherId: string;
  teacherName: string;
  status: 'pending' | 'confirmed' | 'absent';
}

interface Teacher {
  uid: string;
  displayName: string | null;
  email: string;
}

export default function AdminDashboard() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'schedules' | 'reports'>('schedules');
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Schedule Form State
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    startTime: '08:00',
    endTime: '09:00',
    subject: '',
    room: '',
    teacherId: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Schedules
      const schedulesSnap = await getDocs(query(collection(db, 'schedules'), orderBy('date', 'desc')));
      setSchedules(schedulesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Schedule)));

      // Fetch Teachers
      const teachersSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'teacher')));
      setTeachers(teachersSnap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as Teacher)));
    } catch (error) {
      console.error("Fetch error", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.teacherId || !formData.subject) return;

    const teacher = teachers.find(t => t.uid === formData.teacherId);
    const newSchedule = {
      ...formData,
      teacherName: teacher?.displayName || teacher?.email || 'Unknown',
      status: 'pending',
      updatedAt: new Date().toISOString(),
    };

    try {
      await addDoc(collection(db, 'schedules'), newSchedule);
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'schedules');
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'schedules', id));
      fetchData();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `schedules/${id}`);
    }
  };

  const getStats = () => {
    const total = schedules.length;
    const confirmed = schedules.filter(s => s.status === 'confirmed').length;
    const absent = schedules.filter(s => s.status === 'absent').length;
    const pending = schedules.filter(s => s.status === 'pending').length;
    
    const chartData = [
      { name: 'Confirmado', value: confirmed, color: '#10b981' },
      { name: 'Ausente', value: absent, color: '#f43f5e' },
      { name: 'Pendente', value: pending, color: '#fbbf24' },
    ];

    return { total, confirmed, absent, pending, chartData };
  };

  const stats = getStats();

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800">
        <div className="p-8 flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-500 rounded-lg flex items-center justify-center">
             <div className="w-6 h-1 bg-white rounded-full relative after:content-[''] after:absolute after:w-4 after:h-1 after:bg-white after:top-2 after:rounded-full before:content-[''] before:absolute before:w-5 before:h-1 before:bg-white before:-top-2 before:rounded-full"></div>
          </div>
          <span className="text-white font-bold text-lg tracking-tight">EduManage</span>
        </div>

        <nav className="flex-1 px-4 space-y-1 mt-4">
          <SidebarLink 
            icon={<Calendar size={20} />} 
            label="Horários" 
            isActive={activeTab === 'schedules'} 
            onClick={() => setActiveTab('schedules')} 
          />
          <SidebarLink 
            icon={<BarChart size={20} />} 
            label="Relatórios" 
            isActive={activeTab === 'reports'} 
            onClick={() => setActiveTab('reports')} 
          />
        </nav>

        <div className="p-6 mt-auto border-t border-slate-800">
          <button 
            onClick={() => signOut(auth)}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-all font-medium"
          >
            <LogOut size={20} />
            Sair
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-20 bg-white border-b border-slate-200 px-10 flex items-center justify-between shrink-0">
          <div className="relative w-96">
            <input 
              type="text" 
              placeholder="Pesquisar registros, horários..." 
              className="w-full bg-slate-100 border-none rounded-full py-2.5 px-6 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
            />
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 border-l pl-6 border-slate-200">
              <div className="text-right">
                <p className="text-sm font-bold text-slate-900">{profile?.displayName || 'Admin'}</p>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Administrador</p>
              </div>
              <div className="w-10 h-10 bg-indigo-100 rounded-full border-2 border-white shadow-sm flex items-center justify-center font-bold text-indigo-700">
                {profile?.displayName?.charAt(0) || 'A'}
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-10 space-y-8">
          <AnimatePresence mode="wait">
            {activeTab === 'schedules' ? (
              <motion.div 
                key="schedules"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-slate-900">Agenda Escolar</h3>
                  <button 
                    onClick={() => setIsModalOpen(true)}
                    className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-900/20"
                  >
                    <Plus size={20} />
                    <span>Novo Horário</span>
                  </button>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-4 gap-6">
                  <StatCard label="Aulas Totais" value={stats.total} />
                  <StatCard label="Confirmadas" value={stats.confirmed} subValue="+12% hoje" subColor="text-emerald-500" />
                  <StatCard label="Presença Diária" value={`${((stats.confirmed / (stats.total || 1)) * 100).toFixed(1)}%`} isProgress progress={stats.confirmed / (stats.total || 1)} />
                  <StatCard label="Pendências" value={stats.pending} subValue="Correção necessária" subColor="text-orange-500" />
                </div>

                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                      <tr>
                        <th className="px-8 py-5">Matéria</th>
                        <th className="px-8 py-5">Horário & Data</th>
                        <th className="px-8 py-5">Professor</th>
                        <th className="px-8 py-5">Local</th>
                        <th className="px-8 py-5">Status</th>
                        <th className="px-8 py-5"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {schedules.map((s) => (
                        <tr key={s.id} className="hover:bg-slate-50 transition-colors group">
                          <td className="px-8 py-5 font-bold text-slate-800">{s.subject}</td>
                          <td className="px-8 py-5">
                            <div className="text-sm font-semibold">{s.startTime} - {s.endTime}</div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase">{s.date}</div>
                          </td>
                          <td className="px-8 py-5 text-sm font-medium text-slate-600">{s.teacherName}</td>
                          <td className="px-8 py-5 text-sm font-medium text-slate-600">{s.room}</td>
                          <td className="px-8 py-5">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                              s.status === 'confirmed' ? 'bg-indigo-100 text-indigo-700' :
                              s.status === 'absent' ? 'bg-rose-100 text-rose-700' : 
                              'bg-slate-100 text-slate-500'
                            }`}>
                              {s.status === 'confirmed' ? 'Em Progresso' : 
                               s.status === 'absent' ? 'Cancelada' : 'Pendente'}
                            </span>
                          </td>
                          <td className="px-8 py-5 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => handleDeleteSchedule(s.id)}
                              className="p-2 text-slate-300 hover:text-rose-600 transition-colors"
                            >
                              <Trash2 size={18} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="reports"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-slate-900">Relatórios de Frequência</h3>
                  <div className="text-sm font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full uppercase tracking-wider">
                    Total: {stats.total} aulas
                  </div>
                </div>

                <div className="grid lg:grid-cols-2 gap-8">
                  {/* Bar Chart */}
                  <div className="bg-white p-8 rounded-3xl border border-slate-200">
                    <h4 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                       <BarChart size={20} className="text-indigo-600" />
                       Distribuição de Presença
                    </h4>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <ReBarChart data={stats.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis 
                            dataKey="name" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }} 
                          />
                          <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }} 
                          />
                          <Tooltip 
                            cursor={{ fill: '#f8fafc' }}
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                          />
                          <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40}>
                            {stats.chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Bar>
                        </ReBarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Donut Chart */}
                  <div className="bg-white p-8 rounded-3xl border border-slate-200">
                    <h4 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                       <PlusCircle size={20} className="text-indigo-600" />
                       Visão Percentual
                    </h4>
                    <div className="h-64 flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={stats.chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={8}
                            dataKey="value"
                          >
                            {stats.chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                <div className="bg-indigo-600 rounded-3xl p-8 text-white relative overflow-hidden">
                  <div className="relative z-10 max-w-lg">
                    <h4 className="text-2xl font-bold mb-2">Aproveitamento Escolar</h4>
                    <p className="text-indigo-100 mb-6">A escola mantém uma taxa de confirmação de {((stats.confirmed / (stats.total || 1)) * 100).toFixed(1)}%. Continue incentivando o uso da plataforma pelos professores.</p>
                  </div>
                  <div className="absolute top-1/2 -right-12 -translate-y-1/2 opacity-20">
                    <GraduationCap size={240} />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Modal for New Schedule */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setIsModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-lg rounded-3xl p-8 relative z-10 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-bold text-slate-900">Novo Agendamento</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-900">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleCreateSchedule} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Matéria</label>
                    <div className="relative">
                      <Book className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        required
                        type="text" 
                        value={formData.subject}
                        onChange={e => setFormData({...formData, subject: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all"
                        placeholder="Ex: Física II"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Data</label>
                      <input 
                        required
                        type="date" 
                        value={formData.date}
                        onChange={e => setFormData({...formData, date: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 transition-all font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Sala</label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                          required
                          type="text" 
                          value={formData.room}
                          onChange={e => setFormData({...formData, room: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 transition-all"
                          placeholder="Auditório A"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Início</label>
                      <input 
                        required
                        type="time" 
                        value={formData.startTime}
                        onChange={e => setFormData({...formData, startTime: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 transition-all font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Fim</label>
                      <input 
                        required
                        type="time" 
                        value={formData.endTime}
                        onChange={e => setFormData({...formData, endTime: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 transition-all font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Professor Responsável</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <select 
                        required
                        value={formData.teacherId}
                        onChange={e => setFormData({...formData, teacherId: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 appearance-none transition-all"
                      >
                        <option value="">Selecione um professor</option>
                        {teachers.map(t => (
                          <option key={t.uid} value={t.uid}>{t.displayName || t.email}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-6 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                  >
                    Criar Horário
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SidebarLink({ icon, label, isActive, onClick }: { icon: React.ReactNode, label: string, isActive: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-semibold ${
        isActive 
          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40' 
          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
      }`}
    >
      <span className="opacity-80">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function StatCard({ label, value, subValue, subColor, isProgress, progress }: { label: string, value: string | number, subValue?: string, subColor?: string, isProgress?: boolean, progress?: number }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{label}</p>
      <h3 className="text-3xl font-extrabold mt-1 text-slate-900">{value}</h3>
      {subValue && <p className={`text-xs font-bold mt-2 ${subColor}`}>{subValue}</p>}
      {isProgress && (
        <div className="w-full h-1.5 bg-slate-100 rounded-full mt-4 overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${(progress || 0) * 100}%` }}
            className="h-full bg-indigo-500 rounded-full"
          />
        </div>
      )}
    </div>
  );
}
