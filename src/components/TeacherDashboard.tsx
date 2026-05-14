import React, { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { collection, query, where, getDocs, updateDoc, doc, Timestamp, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { motion } from 'motion/react';
import { 
  Calendar as CalendarIcon, 
  CheckCircle, 
  XCircle, 
  Clock, 
  MapPin, 
  BookOpen, 
  LogOut,
  RefreshCw
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';

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

export default function TeacherDashboard() {
  const { profile, user } = useAuth();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSchedules = async () => {
    if (!user) return;
    setLoading(true);
    const path = 'schedules';
    try {
      const q = query(
        collection(db, path),
        where('teacherId', '==', user.uid),
        orderBy('date', 'desc'),
        orderBy('startTime', 'asc')
      );
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Schedule));
      setSchedules(data);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (scheduleId: string, newStatus: 'confirmed' | 'absent') => {
    const path = `schedules/${scheduleId}`;
    try {
      const scheduleRef = doc(db, 'schedules', scheduleId);
      await updateDoc(scheduleRef, {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
      setSchedules(prev => prev.map(s => s.id === scheduleId ? { ...s, status: newStatus } : s));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, [user]);

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      <header className="h-20 bg-white border-b border-slate-200 px-10 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-500 rounded-lg flex items-center justify-center">
            <div className="w-6 h-1 bg-white rounded-full relative after:content-[''] after:absolute after:w-4 after:h-1 after:bg-white after:top-2 after:rounded-full before:content-[''] before:absolute before:w-5 before:h-1 before:bg-white before:-top-2 before:rounded-full"></div>
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 leading-none mb-1">{profile?.displayName || 'Professor'}</h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{profile?.role}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 border border-slate-200">
            {profile?.displayName?.charAt(0) || profile?.email.charAt(0).toUpperCase()}
          </div>
          <button 
            onClick={() => signOut(auth)}
            className="p-2.5 bg-slate-100 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all border border-slate-200"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-10 py-12 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Meus Horários</h1>
            <p className="text-slate-500 font-medium">Gerencie sua presença e acompanhe as aulas de hoje.</p>
          </div>
          <button 
            onClick={fetchSchedules}
            className="flex items-center gap-2 text-indigo-600 font-bold bg-indigo-50 hover:bg-indigo-100 px-5 py-2.5 rounded-xl transition-all"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            Atualizar
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
          </div>
        ) : schedules.length === 0 ? (
          <div className="bg-white rounded-[2rem] p-16 text-center border border-dashed border-slate-200 shadow-sm">
            <CalendarIcon className="mx-auto text-slate-200 mb-6" size={64} />
            <p className="text-xl font-bold text-slate-400">Nenhum horário agendado até o momento.</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {schedules.map((schedule) => (
              <motion.div 
                key={schedule.id}
                layout
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`bg-white rounded-3xl p-8 border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-8 transition-all ${
                  schedule.date === today ? 'ring-2 ring-indigo-500 ring-offset-4 ring-offset-slate-50' : ''
                }`}
              >
                <div className="flex items-center gap-6 flex-1">
                  <div className="w-16 text-center border-r border-slate-100 pr-6 shrink-0">
                    <p className="text-lg font-black text-slate-900 leading-none mb-1">{schedule.startTime.split(':')[0]}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">{schedule.startTime.split(':')[1]} min</p>
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                       <span className={`text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-full ${
                        schedule.date === today ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {schedule.date === today ? 'Em Progresso' : schedule.date}
                      </span>
                    </div>
                    
                    <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
                      {schedule.subject}
                    </h3>
                    
                    <div className="flex flex-wrap gap-5 text-slate-400 font-bold text-xs uppercase tracking-wide">
                      <div className="flex items-center gap-2">
                        <MapPin size={14} className="text-indigo-500" />
                        <span>{schedule.room}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="text-indigo-500" />
                        <span>Até {schedule.endTime}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-4 min-w-[240px]">
                  <div className="flex items-center justify-center p-3 rounded-2xl bg-slate-50 border border-slate-100">
                    {schedule.status === 'confirmed' && (
                      <div className="flex items-center gap-2 text-indigo-600 font-extrabold uppercase text-[10px] tracking-widest">
                        <CheckCircle size={16} />
                        Confirmado
                      </div>
                    )}
                    {schedule.status === 'absent' && (
                      <div className="flex items-center gap-2 text-rose-500 font-extrabold uppercase text-[10px] tracking-widest">
                        <XCircle size={16} />
                        Ausente
                      </div>
                    )}
                    {schedule.status === 'pending' && (
                      <div className="flex items-center gap-2 text-amber-500 font-extrabold uppercase text-[10px] tracking-widest">
                        <Clock size={16} />
                        Aguardando
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => updateStatus(schedule.id, 'confirmed')}
                      disabled={schedule.status === 'confirmed'}
                      className={`flex items-center justify-center gap-2 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${
                        schedule.status === 'confirmed' 
                          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
                          : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 shadow-sm'
                      }`}
                    >
                      Presente
                    </button>
                    <button 
                      onClick={() => updateStatus(schedule.id, 'absent')}
                      disabled={schedule.status === 'absent'}
                      className={`flex items-center justify-center gap-2 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${
                        schedule.status === 'absent' 
                          ? 'bg-rose-500 text-white shadow-lg shadow-rose-200' 
                          : 'bg-white text-slate-600 border border-slate-200 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-500 shadow-sm'
                      }`}
                    >
                      Ausente
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
