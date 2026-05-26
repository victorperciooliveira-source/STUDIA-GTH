// --- DOM HELPERS ---
const $ = (selector) => document.querySelector(selector);
const render = (template) => {
  const app = $('#app');
  if (app) {
    app.innerHTML = template;
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }
};

// --- STATE ---
let user = JSON.parse(localStorage.getItem('user')) || null;
let schedules = [];
let teachers = [];
let stats = { total: 0, confirmed: 0, absent: 0, pending: 0 };
let currentTab = 'horarios';
let authMode = 'closed'; // 'login', 'register' or 'closed'
let labBookings = [];
let certificates = [];
let reportWeek = 'all';
let reportTurno = 'matutino';
let reportTeacher = 'all';
let schoolName = 'COLÉGIO ESTADUAL PROF. JÚLIO SZYMANSKI - MATUTINO';
let currentRelatorioSubTab = 'urania';
let reportModel = 'prof_turma'; // 'prof_turma', 'prof_subject', 'turma_grid'
let reportCardSize = localStorage.getItem('reportCardSize') || 'medium'; // 'small', 'medium', 'large'
let teacherSchedulesTab = 'grid'; // 'grid' or 'list'

// --- API ---
const api = {
  async request(url, options = {}) {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || `Erro ${res.status}`);
    return result;
  },
  async post(url, data) {
    return this.request(url, { method: 'POST', body: JSON.stringify(data) });
  },
  async get(url) {
    return this.request(url, { method: 'GET' });
  },
  async patch(url, data) {
    return this.request(url, { method: 'PATCH', body: JSON.stringify(data) });
  },
  async delete(url) {
    return this.request(url, { method: 'DELETE' });
  }
};

// --- WEEK & DATE CALCULATIONS FOR INDIVIDUAL REPORT GRIDS ---
const parseLocalDate = (dateStr) => {
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  }
  return new Date(dateStr);
};

const getMondayDateStr = (dateStr) => {
  const date = parseLocalDate(dateStr);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.setDate(diff));
  const y = monday.getFullYear();
  const m = String(monday.getMonth() + 1).padStart(2, '0');
  const d = String(monday.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const getWeekRangeLabel = (mondayStr) => {
  const monday = parseLocalDate(mondayStr);
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  const formatDatePart = (d) => {
    const day = String(d.getDate()).padStart(2, '0');
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${day}/${m}`;
  };
  return `Semana de ${formatDatePart(monday)} a ${formatDatePart(friday)}`;
};

const getWeeksList = () => {
  const weeks = new Set();
  schedules.forEach(s => {
    if (s.date) {
      try {
        weeks.add(getMondayDateStr(s.date));
      } catch (e) {
        console.error("Error formatting week:", e);
      }
    }
  });
  return Array.from(weeks).sort().reverse();
};

const getDetectedSlots = () => {
  const slots = new Set();
  schedules.forEach(s => {
    if (s.startTime) slots.add(s.startTime);
  });
  return Array.from(slots).sort();
};

const getDetectedTurmas = (filteredSchedules) => {
  const turmas = new Set();
  filteredSchedules.forEach(s => {
    if (s.classGroup) turmas.add(s.classGroup);
  });
  return Array.from(turmas).sort();
};

const getDayOfWeek = (dateObj) => {
  return dateObj.getDay();
};

const TeacherScheduleCard = (teacher, weekSchedules, slots, model = 'prof_turma') => {
  const days = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'];
  const grid = {};
  slots.forEach(slot => {
    grid[slot] = {};
    days.forEach(day => {
      grid[slot][day] = '------';
    });
  });
  
  weekSchedules.forEach(s => {
    const d = parseLocalDate(s.date);
    const dayNum = getDayOfWeek(d);
    const dayName = days[dayNum - 1];
    if (dayName && grid[s.startTime]) {
      const isHAF = s.subject?.toUpperCase() === 'HAF' || s.status === 'vaga';
      let cellText = '------';
      if (isHAF) {
        cellText = 'HAF';
      } else if (model === 'prof_turma') {
        cellText = s.classGroup || s.subject || '------';
      } else {
        cellText = s.subject || '------';
      }
      
      if (grid[s.startTime][dayName] === '------') {
        grid[s.startTime][dayName] = cellText;
      } else {
        if (!grid[s.startTime][dayName].split('/').includes(cellText)) {
          grid[s.startTime][dayName] += '/' + cellText;
        }
      }
    }
  });
  
  // Calculate sizes based on reportCardSize
  let cardStyle = "font-size: 11px; padding: 0.75rem;";
  let headerSize = "text-[12px]";
  let subTitleSize = "text-[9.5px]";
  let thSize = "text-[9px]";
  let tdSize = "text-[10px]";
  let rowClass = "h-8";

  if (reportCardSize === 'small') {
    cardStyle = "font-size: 8.5px; padding: 0.5rem;";
    headerSize = "text-[9px]";
    subTitleSize = "text-[7.5px]";
    thSize = "text-[7px]";
    tdSize = "text-[7.5px]";
    rowClass = "h-5";
  } else if (reportCardSize === 'large') {
    cardStyle = "font-size: 13.5px; padding: 1rem;";
    headerSize = "text-[14px]";
    subTitleSize = "text-[11px]";
    thSize = "text-[11px]";
    tdSize = "text-[12.5px]";
    rowClass = "h-11";
  } else if (reportCardSize === 'esticado') {
    cardStyle = "font-size: 15px; padding: 1.25rem;";
    headerSize = "text-[16px]";
    subTitleSize = "text-[12px]";
    thSize = "text-[12px]";
    tdSize = "text-[13.5px]";
    rowClass = "h-12";
  } else if (reportCardSize === 'super_esticado') {
    cardStyle = "font-size: 18px; padding: 1.75rem;";
    headerSize = "text-[20px]";
    subTitleSize = "text-[14px]";
    thSize = "text-[14px]";
    tdSize = "text-[16.5px]";
    rowClass = "h-16";
  }
  
  return `
    <div class="bg-white border border-slate-300 rounded-lg text-slate-800 shadow-sm flex flex-col justify-between break-inside-avoid text-xs w-full" style="${cardStyle}">
      <div class="border-b border-slate-300 pb-1 mb-1.5 flex justify-between items-center bg-slate-100 px-2 py-1 rounded">
        <span class="font-extrabold uppercase text-slate-900 truncate max-w-[320px] ${headerSize}">${teacher.displayName}</span>
        <span class="${subTitleSize} text-[#5B99C2] font-extrabold uppercase tracking-tight">${teacher.subject || 'Professor'}</span>
      </div>
      <table class="w-full text-center border-collapse table-fixed">
        <thead>
          <tr class="border-b border-slate-200">
            <th class="font-semibold text-slate-400 ${thSize} py-0.5 text-left w-[40px]">Hor</th>
            ${days.map(day => `<th class="font-bold text-slate-700 ${thSize} py-0.5">${day}</th>`).join('')}
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          ${slots.map(slot => `
            <tr class="${rowClass}">
              <td class="font-extrabold text-[#2E5077] ${thSize} text-left py-0.5">${slot}</td>
              ${days.map(day => {
                const val = grid[slot][day];
                const isClass = val !== '------';
                const isHAF = val === 'HAF';
                const cellClass = isHAF ? 'text-[#5B99C2] font-black' : (isClass ? 'text-slate-900 font-black' : 'text-slate-300');
                return `<td class="${tdSize} py-0.5 truncate ${cellClass}">${val}</td>`;
              }).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
};

const TurmaScheduleCard = (turmaName, weekSchedules, slots) => {
  const days = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'];
  const grid = {};
  slots.forEach(slot => {
    grid[slot] = {};
    days.forEach(day => {
      grid[slot][day] = null;
    });
  });
  
  weekSchedules.forEach(s => {
    const d = parseLocalDate(s.date);
    const dayNum = getDayOfWeek(d);
    const dayName = days[dayNum - 1];
    if (dayName && grid[s.startTime]) {
      grid[s.startTime][dayName] = {
        teacherName: s.teacherName || '------',
        subject: s.subject || '------',
        status: s.status
      };
    }
  });

  // Calculate sizes based on reportCardSize
  let cardStyle = "font-size: 11px; padding: 0.75rem;";
  let headerSize = "text-[12px]";
  let subTitleSize = "text-[9.5px]";
  let thSize = "text-[9px]";
  let tdTitleSize = "text-[10px]";
  let tdSubSize = "text-[8.5px]";
  let rowClass = "h-11";

  if (reportCardSize === 'small') {
    cardStyle = "font-size: 8.5px; padding: 0.5rem;";
    headerSize = "text-[9px]";
    subTitleSize = "text-[7.5px]";
    thSize = "text-[7px]";
    tdTitleSize = "text-[8.5px]";
    tdSubSize = "text-[7.5px]";
    rowClass = "h-8";
  } else if (reportCardSize === 'large') {
    cardStyle = "font-size: 13.5px; padding: 1rem;";
    headerSize = "text-[14px]";
    subTitleSize = "text-[11px]";
    thSize = "text-[11px]";
    tdTitleSize = "text-[12.5px]";
    tdSubSize = "text-[11px]";
    rowClass = "h-16";
  } else if (reportCardSize === 'esticado') {
    cardStyle = "font-size: 15px; padding: 1.25rem;";
    headerSize = "text-[16px]";
    subTitleSize = "text-[12px]";
    thSize = "text-[12px]";
    tdTitleSize = "text-[14px]";
    tdSubSize = "text-[12px]";
    rowClass = "h-14";
  } else if (reportCardSize === 'super_esticado') {
    cardStyle = "font-size: 18px; padding: 1.75rem;";
    headerSize = "text-[20px]";
    subTitleSize = "text-[14px]";
    thSize = "text-[14px]";
    tdTitleSize = "text-[17px]";
    tdSubSize = "text-[14px]";
    rowClass = "h-20";
  }
  
  return `
    <div class="bg-white border border-slate-300 rounded-lg text-slate-800 shadow-sm flex flex-col justify-between break-inside-avoid text-xs w-full" style="${cardStyle}">
      <div class="border-b border-slate-300 pb-1 mb-1.5 flex justify-between items-center bg-slate-100 px-2 py-1 rounded">
        <span class="font-extrabold uppercase text-slate-900 truncate ${headerSize}">Turma: ${turmaName}</span>
        <span class="${subTitleSize} text-[#5B99C2] font-extrabold uppercase tracking-tight">GRADE HORÁRIA</span>
      </div>
      <table class="w-full text-center border-collapse table-fixed">
        <thead>
          <tr class="border-b border-slate-200">
            <th class="font-semibold text-slate-400 ${thSize} py-0.5 text-left w-[40px]">Hor</th>
            ${days.map(day => `<th class="font-bold text-slate-700 ${thSize} py-0.5">${day}</th>`).join('')}
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          ${slots.map(slot => `
            <tr class="${rowClass}">
              <td class="font-extrabold text-[#2E5077] ${thSize} text-left py-0.5 align-middle">${slot}</td>
              ${days.map(day => {
                const cell = grid[slot][day];
                if (!cell) {
                  return `<td class="text-slate-300 ${tdTitleSize} py-0.5 align-middle">------</td>`;
                }
                const isHAF = cell.subject?.toUpperCase() === 'HAF' || cell.status === 'vaga';
                if (isHAF) {
                  return `
                    <td class="py-0.5 align-middle leading-tight truncate">
                      <div class="font-black text-[#5B99C2] ${tdTitleSize} truncate">HAF</div>
                    </td>
                  `;
                }
                return `
                  <td class="py-0.5 align-middle leading-tight truncate">
                    <div class="font-black text-slate-900 ${tdTitleSize} truncate">${cell.teacherName.split(' ')[0]}</div>
                    <div class="text-slate-400 font-extrabold truncate uppercase mt-0.5 ${tdSubSize}">${cell.subject}</div>
                  </td>
                `;
              }).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
};

// --- VIEWS ---

const LandingView = () => `
  <div class="min-h-screen flex flex-col">
    <nav class="h-20 flex items-center justify-between px-10 bg-white border-b border-slate-200">
      <div class="flex items-center gap-3">
        <div class="flex items-center gap-2 bg-indigo-600 text-white p-2 rounded-lg">
          <i data-lucide="book-open" class="w-6 h-6"></i>
          <span class="text-xl font-extrabold tracking-tighter">Studia</span>
        </div>
      </div>
      <button onclick="actions.showLoginModal('login')" class="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-indigo-900/20">
        Entrar no Sistema
      </button>
    </nav>

    <main class="max-w-7xl mx-auto px-10 py-20 grid lg:grid-cols-2 gap-16 items-center">
      <div>
        <h1 class="text-6xl font-extrabold text-slate-900 leading-[1.1] mb-8 tracking-tighter">
          A gestão escolar, <span class="text-indigo-600">redefinida.</span>
        </h1>
        <div class="flex gap-4">
          <button onclick="actions.showLoginModal('register')" class="bg-slate-900 text-white px-10 py-4 rounded-2xl font-bold text-lg shadow-xl shadow-slate-200">
            Criar Conta
          </button>
        </div>
      </div>
      <div class="relative bg-white p-10 rounded-[2.5rem] shadow-2xl border border-slate-100">
        <h3 class="font-extrabold text-2xl mb-8">Demonstração</h3>
        <div class="space-y-4">
          <div class="flex items-center p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div class="w-12 border-r pr-4 mr-4 text-center font-bold">08:00</div>
            <div class="flex-1 font-bold">Matemática</div>
            <div class="px-3 py-1 bg-indigo-600 text-white text-[10px] font-bold rounded-full">AGENDADA</div>
          </div>
          <div class="flex items-center p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div class="w-12 border-r pr-4 mr-4 text-center font-bold">10:00</div>
            <div class="flex-1 font-bold">História</div>
            <div class="px-3 py-1 bg-emerald-500 text-white text-[10px] font-bold rounded-full">CONFIRMADA</div>
          </div>
        </div>
      </div>
    </main>

    <!-- Login/Register Modal -->
    <div id="login-modal" class="fixed inset-0 z-50 flex items-center justify-center p-4 ${authMode === 'closed' ? 'hidden' : ''}">
      <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onclick="actions.hideLoginModal()"></div>
      <div class="bg-white w-full max-w-md rounded-3xl p-8 relative z-10 shadow-2xl">
        <div class="flex gap-2 mb-8 bg-slate-100 p-1.5 rounded-xl">
            <button onclick="actions.toggleAuthMode('login')" class="flex-1 py-2 rounded-lg font-bold text-sm transition-all ${authMode === 'login' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}">Entrar</button>
            <button onclick="actions.toggleAuthMode('register')" class="flex-1 py-2 rounded-lg font-bold text-sm transition-all ${authMode === 'register' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}">Criar Conta</button>
        </div>

        <h3 class="text-2xl font-bold mb-2">${authMode === 'login' ? 'Bem-vindo de volta' : 'Nova conta Studia'}</h3>
        <p class="text-slate-500 text-sm mb-6 font-medium">${authMode === 'login' ? 'Acesse seu painel administrativo.' : 'Crie seu perfil de diretor ou professor.'}</p>
        
        <div class="space-y-4">
          ${authMode === 'register' ? `
            <input type="text" id="auth-name" placeholder="Seu nome completo" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-medium">
            <select id="auth-role" onchange="actions.handleRoleChange()" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-bold">
                <option value="teacher">Professor</option>
                <option value="admin">Diretor</option>
            </select>
            <div id="subject-container">
                <input type="text" id="auth-subject" placeholder="Sua Matéria (ex: Português)" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-medium">
            </div>
          ` : ''}
          <input type="email" id="auth-email" placeholder="nome@escola.pr.gov.br" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-medium">
          <input type="password" id="auth-password" placeholder="Sua senha" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-medium">
          
          <button onclick="${authMode === 'login' ? 'actions.login()' : 'actions.register()'}" class="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-indigo-900/20 mt-2">
            ${authMode === 'login' ? 'Entrar' : 'Cadastrar'}
          </button>
        </div>
      </div>
    </div>
  </div>
`;

const TeacherView = () => {
  const detectedSlots = getDetectedSlots();
  let slots = [];
  if (reportTurno === 'matutino') {
    slots = ['07:30', '08:20', '09:10', '10:15', '11:00', '11:45'];
  } else if (reportTurno === 'vespertino') {
    slots = ['13:00', '13:50', '14:40', '15:45', '16:30', '17:15'];
  } else {
    slots = detectedSlots.length > 0 ? detectedSlots : ['07:30', '08:20', '09:10', '10:15', '11:00', '11:45'];
  }

  const pendingCount = schedules.filter(s => s.status === 'pending').length;

  return `
  <div class="flex h-screen overflow-hidden print:overflow-visible">
    <!-- Sidebar -->
    <aside class="w-64 bg-slate-900 flex flex-col p-6 text-slate-400 print:hidden shrink-0">
      <div class="flex items-center gap-3 text-white mb-10">
        <div class="flex items-center gap-2 bg-white/10 p-2 rounded-lg">
          <i data-lucide="book-open" class="w-6 h-6 text-indigo-400"></i>
          <span class="text-xl font-extrabold tracking-tighter text-white">Studia</span>
        </div>
      </div>
      <nav class="space-y-1 flex-1">
        ${SidebarBtn('horarios', 'calendar', 'Meus Horários')}
        ${SidebarBtn('atestados', 'file-text', 'Meus Atestados')}
      </nav>
      <div class="mt-auto pt-6 border-t border-slate-800 mb-6">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center font-bold text-white text-sm">
            <i data-lucide="user" class="w-4 h-4"></i>
          </div>
          <div class="overflow-hidden">
            <p class="text-white text-xs font-bold truncate">${user.displayName}</p>
            <p class="text-[9px] uppercase tracking-tighter font-black text-slate-500">${user.subject || 'Professor'}</p>
          </div>
        </div>
      </div>
      <button onclick="actions.logout()" class="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800 transition-all font-bold">
        <i data-lucide="log-out"></i> Sair
      </button>
    </aside>

    <main class="flex-1 flex flex-col bg-slate-50 overflow-hidden print:bg-white print:overflow-visible">
      <header class="h-20 bg-white border-b border-slate-200 px-10 flex items-center justify-between shrink-0 print:hidden">
        <h2 class="font-bold text-lg capitalize">${currentTab === 'horarios' ? 'Meus Horários' : 'Meus Atestados'}</h2>
        <div class="flex gap-4">
          ${currentTab === 'atestados' ? `
            <button onclick="actions.showCertModal()" class="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2">
                <i data-lucide="file-plus" size="18"></i> Novo Atestado
            </button>
          ` : ''}
          <button onclick="actions.refreshSchedules()" class="bg-indigo-50 text-indigo-600 px-5 py-2.5 rounded-xl font-bold flex items-center gap-2">
            <i data-lucide="refresh-cw" size="18"></i> Atualizar
          </button>
        </div>
      </header>

      <div class="p-10 flex-1 overflow-y-auto space-y-8 print:p-0">
        ${currentTab === 'horarios' ? `
          <!-- Switch between sub-tabs with counts -->
          <div class="flex gap-2 bg-slate-100 p-1.5 rounded-2xl w-fit mb-6 print:hidden">
            <button onclick="actions.setTeacherSchedulesTab('grid')" class="px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
              teacherSchedulesTab === 'grid' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }">
              <i data-lucide="grid-3x3" class="w-4 h-4"></i> Grade de Horários Completa
            </button>
            <button onclick="actions.setTeacherSchedulesTab('list')" class="px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
              teacherSchedulesTab === 'list' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }">
              <i data-lucide="list" class="w-4 h-4"></i> Confirmação de Aulas ${pendingCount > 0 ? `<span class="bg-rose-500 text-white text-[10px] h-5 px-1.5 rounded-full flex items-center justify-center font-extrabold">${pendingCount}</span>` : ''}
            </button>
          </div>

          ${teacherSchedulesTab === 'grid' ? `
            <!-- Grid Control Box -->
            <div class="bg-white p-6 rounded-3xl border shadow-sm space-y-4 print:hidden">
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div class="space-y-1">
                  <label class="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Turno / Períodos</label>
                  <select onchange="actions.setReportTurno(this.value)" class="w-full bg-slate-50 border rounded-xl px-4 py-2.5 outline-none font-bold text-sm focus:ring-2 focus:ring-indigo-500">
                    <option value="matutino" ${reportTurno === 'matutino' ? 'selected' : ''}>Matutino (07:30 - 11:45)</option>
                    <option value="vespertino" ${reportTurno === 'vespertino' ? 'selected' : ''}>Vespertino (13:00 - 17:15)</option>
                    <option value="auto" ${reportTurno === 'auto' ? 'selected' : ''}>Auto-detecção</option>
                  </select>
                </div>
                
                <div class="space-y-1">
                  <label class="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Tamanho da Grade</label>
                  <select onchange="actions.setReportCardSize(this.value)" class="w-full bg-slate-50 border rounded-xl px-4 py-2.5 outline-none font-bold text-sm focus:ring-2 focus:ring-indigo-500">
                    <option value="small" ${reportCardSize === 'small' ? 'selected' : ''}>Pequeno (Compacto)</option>
                    <option value="medium" ${reportCardSize === 'medium' ? 'selected' : ''}>Médio (Recomendado)</option>
                    <option value="large" ${reportCardSize === 'large' ? 'selected' : ''}>Grande</option>
                    <option value="esticado" ${reportCardSize === 'esticado' ? 'selected' : ''}>Descrição Larga</option>
                    <option value="super_esticado" ${reportCardSize === 'super_esticado' ? 'selected' : ''}>Página Inteira</option>
                  </select>
                </div>

                <div class="space-y-1">
                  <label class="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Opções Rápidas</label>
                  <div class="flex gap-2">
                    <button id="btn-download-pdf-teacher" onclick="actions.downloadTeacherPDF()" class="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-1.5 hover:bg-indigo-700 transition-all">
                      <i data-lucide="download" class="w-4 h-4"></i> Baixar PDF
                    </button>
                    <button onclick="window.print()" class="flex-1 bg-white text-slate-800 border border-slate-200 py-2.5 rounded-xl font-bold text-sm shadow-sm flex items-center justify-center gap-1.5 hover:bg-slate-50 transition-all">
                      <i data-lucide="printer" class="w-4 h-4"></i> Imprimir
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Beautiful Grid Sheet Preview -->
            <div class="printable-sheet bg-white border border-slate-200 rounded-[2rem] p-8 md:p-12 shadow-xl relative overflow-hidden">
              <div class="flex flex-col md:flex-row justify-between items-center border-b border-indigo-100 pb-6 mb-8 gap-4">
                <div class="flex items-center gap-4">
                  <svg width="240" height="65" viewBox="0 0 240 65" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: block;">
                    <path d="M10 24C45 6, 85 45, 128 35C155 28, 175 14, 235 22" stroke="#7ec2f2" stroke-width="2.8" stroke-linecap="round" fill="none" opacity="0.8"/>
                    <path d="M124 35C136 43, 155 35, 150 24C145 15, 132 18, 126 27" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.9"/>
                    <path d="M175 14C195 6, 215 16, 235 22" stroke="#7ec2f2" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.3"/>
                    <g transform="translate(68, 2)">
                      <path d="M15 14C15 6, 25 3, 30 7.5L30 23C25 18, 15 19, 15 22Z" fill="#5B99C2" />
                      <path d="M45 14C45 6, 35 3, 30 7.5L30 23C35 18, 45 19, 45 22Z" fill="#2E5077" />
                      <path d="M18 16C18 13, 24 10, 27 12L27 21" stroke="white" stroke-width="0.8" opacity="0.4" fill="none"/>
                      <path d="M42 16C42 13, 36 10, 33 12L33 21" stroke="white" stroke-width="0.8" opacity="0.4" fill="none"/>
                    </g>
                    <text x="18" y="47" font-family="'Inter', sans-serif" font-weight="800" font-size="34" fill="#2E5077" letter-spacing="-1.5">Studia</text>
                    <text x="21" y="58" font-family="'Inter', sans-serif" font-weight="700" font-size="8.5" fill="#5B99C2" letter-spacing="1.2">GRADE ESCOLAR DIGITAL</text>
                  </svg>
                </div>
                
                <div class="text-center md:text-right">
                  <h4 class="text-sm font-black text-slate-800 uppercase tracking-wide">${schoolName}</h4>
                  <p class="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mt-1">
                    Grade de Horários Individual do Professor
                  </p>
                </div>
              </div>

              <!-- Center wrapper -->
              <div class="flex justify-center">
                <div class="w-full max-w-2xl">
                  ${TeacherScheduleCard(user, schedules, slots)}
                </div>
              </div>

              <div class="border-t border-slate-100 mt-12 pt-4 flex justify-between text-[8px] text-slate-400 font-extrabold uppercase tracking-widest leading-none">
                <span>Grade gerada pelo sistema Studia</span>
                <span>Data de emissão: ${new Date().toLocaleDateString('pt-BR')}</span>
              </div>
            </div>
          ` : `
            <!-- Sched List -->
            <div class="grid gap-6">
              ${schedules.map(s => `
                <div class="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm flex items-center justify-between print:shadow-none print:border-slate-300">
                  <div class="flex items-center gap-6">
                    <div class="w-16 text-center border-r pr-6 shrink-0">
                      <p class="text-lg font-black">${s.startTime.split(':')[0]}</p>
                      <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest">${s.startTime.split(':')[1] || '00'}</p>
                    </div>
                    <div>
                      <h3 class="text-xl font-black text-slate-900">${s.subject}</h3>
                      <div class="flex items-center gap-4 mt-1">
                        <span class="text-xs font-bold text-slate-400 flex items-center gap-1"><i data-lucide="map-pin" size="12"></i> ${s.room}</span>
                        <span class="text-xs font-bold text-slate-400 flex items-center gap-1"><i data-lucide="calendar" size="12"></i> ${s.date}</span>
                      </div>
                    </div>
                  </div>
                  <div class="flex flex-col gap-3 min-w-[200px] print:hidden">
                    <div class="text-center py-2 bg-slate-50 rounded-xl border text-[10px] font-black uppercase tracking-widest ${
                      s.status === 'confirmed' ? 'text-indigo-600' : s.status === 'absent' ? 'text-rose-500' : s.status === 'vaga' ? 'text-rose-600 font-black' : 'text-amber-500'
                    }">
                      ${s.status === 'vaga' ? 'AULA VAGA' : (s.status === 'confirmed' ? 'Confirmado' : s.status === 'absent' ? 'Ausente' : 'Pendente')}
                    </div>
                    ${s.status !== 'vaga' ? `
                      <div class="grid grid-cols-2 gap-2">
                        <button onclick="actions.updateStatus(${s.id}, 'confirmed')" class="py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-widest bg-white hover:bg-indigo-600 hover:text-white transition-all">VOU</button>
                        <button onclick="actions.updateStatus(${s.id}, 'absent')" class="py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-widest bg-white hover:bg-rose-500 hover:text-white transition-all">NÃO VOU</button>
                      </div>
                    ` : ''}
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        ` : ''}
        ${currentTab === 'atestados' ? `
          <div class="space-y-8">
            <div class="bg-white rounded-3xl border shadow-sm p-10 text-center">
              <h3 class="text-xl font-bold mb-4">Seus Atestados</h3>

              <button onclick="actions.showCertModal()" class="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold">Enviar Novo Atestado</button>
            </div>
          </div>
        ` : ''}
      </div>
    </main>
    
    ${CertModal()}
  </div>
  `;
};

const CreateModal = () => `
  <!-- Same Create Modal logic but with current state -->
  <div id="create-modal" class="fixed inset-0 z-50 flex items-center justify-center p-4 hidden">
    <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onclick="actions.hideCreateModal()"></div>
    <div class="bg-white w-full max-w-lg rounded-3xl p-8 relative z-10 shadow-2xl">
      <h3 class="text-2xl font-bold mb-8">Novo Agendamento</h3>
      <form onsubmit="actions.createSchedule(event)" class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <input type="text" id="form-subject" placeholder="Matéria" class="w-full bg-slate-50 border p-3 rounded-xl outline-none font-bold" required>
          <input type="text" id="form-class-group" placeholder="Turma (ex: 9A, 3BI)" class="w-full bg-slate-50 border p-3 rounded-xl outline-none font-bold" required>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <input type="date" id="form-date" class="w-full bg-slate-50 border p-3 rounded-xl outline-none font-bold" required>
          <input type="text" id="form-room" placeholder="Sala" class="w-full bg-slate-50 border p-3 rounded-xl outline-none font-bold" required>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <input type="time" id="form-start" class="w-full bg-slate-50 border p-3 rounded-xl outline-none font-bold" value="08:00" required>
          <input type="time" id="form-end" class="w-full bg-slate-50 border p-3 rounded-xl outline-none font-bold" value="09:00" required>
        </div>
        <select id="form-teacher" class="w-full bg-slate-50 border p-3 rounded-xl outline-none font-bold" required>
          <option value="">Selecione o Professor</option>
          ${teachers.map(t => `<option value="${t.uid}">${t.displayName}</option>`).join('')}
        </select>
        <div class="flex gap-4 pt-4">
          <button type="button" onclick="actions.hideCreateModal()" class="flex-1 py-3 border rounded-xl font-bold hover:bg-slate-50">Cancelar</button>
          <button type="submit" class="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold shadow-lg">Criar Horário</button>
        </div>
      </form>
    </div>
  </div>
`;

const LabModal = () => `
  <div id="lab-modal" class="fixed inset-0 z-50 flex items-center justify-center p-4 hidden">
    <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onclick="actions.hideLabModal()"></div>
    <div class="bg-white w-full max-w-lg rounded-3xl p-8 relative z-10 shadow-2xl">
      <h3 class="text-2xl font-bold mb-8">Reservar Laboratório</h3>
      <form onsubmit="actions.createLabBooking(event)" class="space-y-4">
        <select id="lab-type" class="w-full bg-slate-50 border p-3 rounded-xl outline-none font-bold" required>
          <option value="info">Informática</option>
          <option value="chem">Química</option>
        </select>
        <input type="date" id="lab-date" class="w-full bg-slate-50 border p-3 rounded-xl outline-none font-bold" required>
        <div class="grid grid-cols-2 gap-4">
          <input type="time" id="lab-start" class="w-full bg-slate-50 border p-3 rounded-xl outline-none font-bold" required>
          <input type="time" id="lab-end" class="w-full bg-slate-50 border p-3 rounded-xl outline-none font-bold" required>
        </div>
        <div class="flex gap-4 pt-4">
          <button type="button" onclick="actions.hideLabModal()" class="flex-1 py-3 border rounded-xl font-bold">Cancelar</button>
          <button type="submit" class="flex-1 bg-slate-900 text-white py-3 rounded-xl font-bold">Reservar</button>
        </div>
      </form>
    </div>
  </div>
`;

const CertModal = () => `
  <div id="cert-modal" class="fixed inset-0 z-50 flex items-center justify-center p-4 hidden">
    <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onclick="actions.hideCertModal()"></div>
    <div class="bg-white w-full max-w-lg rounded-3xl p-8 relative z-10 shadow-2xl">
      <h3 class="text-2xl font-bold mb-8">Incluir Atestado Médico</h3>
      <form onsubmit="actions.submitCert(event)" class="space-y-4">
        <p class="text-xs text-slate-500 font-bold uppercase mb-2">Atenção: Ao aprovar este atestado, as aulas do dia serão marcadas automaticamente como "Aulas Vagas".</p>
        <input type="date" id="cert-date" class="w-full bg-slate-50 border p-3 rounded-xl outline-none font-bold" required>
        <textarea id="cert-reason" placeholder="Motivo da ausência" class="w-full bg-slate-50 border p-3 rounded-xl outline-none font-bold min-h-[100px]" required></textarea>
        
        <div class="space-y-2">
            <label class="text-[10px] font-black text-slate-400 uppercase">Anexar Foto do Atestado</label>
            <div class="relative group">
                <input type="file" id="cert-image" accept="image/*" capture="environment" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20">
                <div class="w-full border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center gap-2 group-hover:border-indigo-400 transition-all">
                    <i data-lucide="camera" class="text-slate-400 group-hover:text-indigo-600 transition-all"></i>
                    <p class="text-sm font-bold text-slate-500">Toque para tirar foto ou selecionar</p>
                </div>
            </div>
        </div>

        <div class="flex gap-4 pt-4">
          <button type="button" onclick="actions.hideCertModal()" class="flex-1 py-3 border rounded-xl font-bold">Cancelar</button>
          <button type="submit" class="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold">Enviar</button>
        </div>
      </form>
    </div>
  </div>
`;

const AdminView = () => `
  <div class="flex h-screen overflow-hidden print:overflow-visible">
    <!-- Sidebar -->
    <aside class="w-64 bg-slate-900 flex flex-col p-6 text-slate-400 print:hidden">
      <div class="flex items-center gap-3 text-white mb-10">
        <div class="flex items-center gap-2 bg-white/10 p-2 rounded-lg">
          <i data-lucide="book-open" class="w-6 h-6 text-indigo-400"></i>
          <span class="text-xl font-extrabold tracking-tighter text-white">Studia</span>
        </div>
      </div>
      <nav class="space-y-1 flex-1">
        ${SidebarBtn('horarios', 'calendar', 'Horários')}
        ${SidebarBtn('labs', 'test-tube', 'Laboratórios')}
        ${SidebarBtn('atestados', 'file-text', 'Atestados')}
        ${SidebarBtn('relatorios', 'bar-chart', 'Relatórios')}
      </nav>
      <button onclick="actions.logout()" class="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800 transition-all font-bold">
        <i data-lucide="log-out"></i> Sair
      </button>
    </aside>

    <main class="flex-1 flex flex-col bg-slate-50 overflow-hidden print:bg-white print:overflow-visible">
      <header class="h-20 bg-white border-b border-slate-200 px-10 flex items-center justify-between shrink-0 print:hidden">
        <h2 class="font-bold text-lg">Direção</h2>
        <div class="flex gap-4">
          <button onclick="window.print()" class="bg-slate-100 text-slate-600 px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-200 transition-all">
            <i data-lucide="printer"></i> Imprimir PDF
          </button>
          <button onclick="actions.showCreateModal()" class="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-indigo-900/20 flex items-center gap-2">
            <i data-lucide="plus"></i> Novo Horário
          </button>
        </div>
      </header>

      <div class="p-10 flex-1 overflow-y-auto space-y-8 print:p-0">
        ${currentTab === 'horarios' ? HorariosTab() : ''}
        ${currentTab === 'labs' ? LabsTab() : ''}
        ${currentTab === 'atestados' ? AtestadosTab() : ''}
        ${currentTab === 'relatorios' ? RelatoriosTab() : ''}
      </div>
    </main>

    <!-- Modals... -->
    ${CreateModal()}
    ${CertModal()}
  </div>
`;

const SidebarBtn = (id, icon, label) => `
  <button onclick="actions.switchTab('${id}')" 
    class="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold ${currentTab === id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40' : 'hover:bg-slate-800 hover:text-white'}">
    <i data-lucide="${icon}"></i> ${label}
  </button>
`;

const HorariosTab = () => `
  <h3 class="text-2xl font-black text-slate-900 print:mb-4">Grade de Horários</h3>
  <div class="bg-white rounded-3xl border overflow-hidden shadow-sm print:border-none print:shadow-none">
    <table class="w-full text-left">
      <thead class="bg-slate-50 text-[10px] font-black text-slate-400 uppercase border-b">
        <tr>
          <th class="px-8 py-5">Matéria</th>
          <th class="px-8 py-5">Horário / Data</th>
          <th class="px-8 py-5">Professor</th>
          <th class="px-8 py-5">Local</th>
          <th class="px-8 py-5 text-center">Status</th>
          <th class="px-8 py-5 print:hidden"></th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-50">
        ${schedules.map(s => `
          <tr class="${s.status === 'vaga' ? 'bg-rose-50' : 'hover:bg-slate-50'} transition-all">
            <td class="px-8 py-5 font-bold">${s.subject}</td>
            <td class="px-8 py-5">
              <div class="text-sm font-bold">${s.startTime}</div>
              <div class="text-[10px] text-slate-400 uppercase font-bold">${s.date}</div>
            </td>
            <td class="px-8 py-5 text-sm">${s.teacherName}</td>
            <td class="px-8 py-5 text-sm">${s.room}</td>
            <td class="px-8 py-5">
              <div class="flex justify-center">
                <span class="text-[10px] font-black uppercase px-3 py-1 rounded-full ${
                  s.status === 'confirmed' ? 'bg-indigo-100 text-indigo-700' : 
                  s.status === 'vaga' ? 'bg-rose-600 text-white' : 
                  s.status === 'absent' ? 'bg-rose-100 text-rose-700' :
                  'bg-slate-100 text-slate-500'
                }">${s.status === 'vaga' ? 'AULA VAGA' : s.status}</span>
              </div>
            </td>
            <td class="px-8 py-5 text-right print:hidden">
              <button onclick="actions.deleteSchedule(${s.id})" class="text-slate-300 hover:text-rose-500"><i data-lucide="trash-2" size="18"></i></button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
`;

const LabsTab = () => `
  <div class="space-y-8">
    <div class="flex justify-between items-center">
      <h3 class="text-2xl font-black text-slate-900">Agendamento de Laboratórios</h3>
      <button onclick="actions.showLabModal()" class="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2">
        <i data-lucide="plus"></i> Novo Agendamento
      </button>
    </div>
    <div class="grid grid-cols-2 gap-8">
      ${['info', 'chem'].map(type => `
        <div class="bg-white p-8 rounded-[2rem] border shadow-sm">
          <h4 class="text-lg font-black mb-6 flex items-center gap-2 text-indigo-600 uppercase tracking-tighter">
            <i data-lucide="${type === 'info' ? 'monitor' : 'beaker'}"></i>
            ${type === 'info' ? 'Informática' : 'Química'}
          </h4>
          <div class="space-y-4">
            ${labBookings.filter(b => b.labId === type).map(b => `
              <div class="p-4 bg-slate-50 rounded-2xl border flex items-center justify-between">
                <div>
                  <p class="font-bold text-sm">${b.teacherName}</p>
                  <p class="text-[10px] text-slate-400 font-bold uppercase">${b.date} • ${b.startTime}</p>
                </div>
              </div>
            `).join('') || '<p class="text-center text-slate-400 font-bold py-10">Nenhum agendamento</p>'}
          </div>
        </div>
      `).join('')}
    </div>
  </div>
`;

const AtestadosTab = () => `
  <div class="space-y-8">
    <div class="flex justify-between items-center">
      <h3 class="text-2xl font-black text-slate-900">Atestados Médicos</h3>
      <button onclick="actions.showCertModal()" class="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2">
        <i data-lucide="plus"></i> Incluir Atestado Médico
      </button>
    </div>
    <div class="bg-white rounded-3xl border shadow-sm overflow-hidden">
      <table class="w-full text-left">
        <thead class="bg-slate-50 text-[10px] font-black text-slate-400 uppercase border-b">
          <tr>
            <th class="px-8 py-5">Professor</th>
            <th class="px-8 py-5">Data da Falta</th>
            <th class="px-8 py-5">Motivo</th>
            <th class="px-8 py-5">Imagem</th>
            <th class="px-8 py-5">Status</th>
            <th class="px-8 py-5"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-50">
          ${certificates.map(c => `
            <tr class="hover:bg-slate-50/50 transition-all">
              <td class="px-8 py-5 font-bold">${c.teacherName}</td>
              <td class="px-8 py-5 font-bold">${c.date}</td>
              <td class="px-8 py-5 text-sm">${c.reason}</td>
              <td class="px-8 py-5">
                ${c.imageUrl ? `<button onclick="actions.viewImageById(${c.id})" class="bg-indigo-50 text-indigo-600 p-2 rounded-lg"><i data-lucide="eye" size="16"></i></button>` : '<span class="text-slate-300 text-[10px]">SEM IMAGEM</span>'}
              </td>
              <td class="px-8 py-5">
                <span class="text-[10px] font-black uppercase px-3 py-1 rounded-full ${
                  c.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }">${c.status === 'approved' ? 'Aprovado' : 'Pendente'}</span>
              </td>
              <td class="px-8 py-5 text-right">
                ${c.status === 'pending' ? `<button onclick="actions.approveCert(${c.id})" class="text-indigo-600 font-black text-[10px] uppercase tracking-widest hover:underline">Aprovar e Gerar Aula Vaga</button>` : ''}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  </div>
`;

const RelatoriosTab = () => {
  const weeks = getWeeksList();
  const detectedSlots = getDetectedSlots();
  
  let slots = [];
  if (reportTurno === 'matutino') {
    slots = ['07:30', '08:20', '09:10', '10:15', '11:00', '11:45'];
  } else if (reportTurno === 'vespertino') {
    slots = ['13:00', '13:50', '14:40', '15:45', '16:30', '17:15'];
  } else {
    slots = detectedSlots.length > 0 ? detectedSlots : ['07:30', '08:20', '09:10', '10:15', '11:00', '11:45'];
  }

  let filteredSchedules = schedules;
  if (reportWeek !== 'all') {
    filteredSchedules = schedules.filter(s => {
      try {
        return getMondayDateStr(s.date) === reportWeek;
      } catch (e) {
        return false;
      }
    });
  }

  let displayTeachers = teachers;
  if (reportTeacher !== 'all') {
    displayTeachers = teachers.filter(t => t.uid === reportTeacher);
  }

  // Fallback to extract teachers on current selection if display teachers list is empty but we have schedules
  if (displayTeachers.length === 0 && filteredSchedules.length > 0) {
    const seen = new Set();
    const extracted = [];
    filteredSchedules.forEach(s => {
      if (s.teacherId && !seen.has(s.teacherId)) {
        seen.add(s.teacherId);
        extracted.push({ uid: s.teacherId, displayName: s.teacherName, subject: s.subject });
      }
    });
    displayTeachers = extracted;
  }

  // Dynamic Grid classes based on card size selection
  let gridColsClass = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 print:grid-cols-4 print:gap-2 justify-center";
  if (reportCardSize === 'small') {
    gridColsClass = "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 print:grid-cols-5 print:gap-1 justify-center";
  } else if (reportCardSize === 'medium') {
    gridColsClass = "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-3.5 print:grid-cols-4 print:gap-2 justify-center";
  } else if (reportCardSize === 'large') {
    gridColsClass = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-5 print:grid-cols-3 print:gap-3 justify-center";
  } else if (reportCardSize === 'esticado') {
    gridColsClass = "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-6 print:grid-cols-2 print:gap-4 justify-center";
  } else if (reportCardSize === 'super_esticado') {
    gridColsClass = "grid grid-cols-1 gap-8 print:grid-cols-1 print:gap-6 justify-center";
  }

  const subTabHeader = `
    <div class="flex gap-2 bg-slate-100 p-1.5 rounded-2xl w-fit mb-8 print:hidden">
      <button onclick="actions.setRelatorioSubTab('urania')" class="px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
        currentRelatorioSubTab === 'urania' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
      }">
        <i data-lucide="grid-3x3" class="w-4 h-4"></i> Grade de Professores (Individual)
      </button>
      <button onclick="actions.setRelatorioSubTab('frequent')" class="px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
        currentRelatorioSubTab === 'frequent' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
      }">
        <i data-lucide="bar-chart-3" class="w-4 h-4"></i> Gráfico de Frequência
      </button>
    </div>
  `;

  if (currentRelatorioSubTab === 'frequent') {
    return `
      <div class="space-y-4">
        <h3 class="text-2xl font-black text-slate-900 print:hidden">Relatório de Frequência</h3>
        ${subTabHeader}
        <div class="bg-white p-10 rounded-[2.5rem] border shadow-sm flex flex-col items-center">
          <div class="flex items-end gap-6 h-64 mb-10">
            <div class="w-20 bg-indigo-500 rounded-t-2xl" style="height: ${stats.total > 0 ? (stats.confirmed / stats.total) * 100 : 0}%"></div>
            <div class="w-20 bg-rose-500 rounded-t-2xl" style="height: ${stats.total > 0 ? (stats.absent / stats.total) * 100 : 0}%"></div>
            <div class="w-20 bg-amber-400 rounded-t-2xl" style="height: ${stats.total > 0 ? (stats.pending / stats.total) * 100 : 0}%"></div>
          </div>
          <div class="grid grid-cols-3 gap-10 text-center uppercase font-black text-xs">
            <div class="text-indigo-600">Presentes: ${stats.confirmed}</div>
            <div class="text-rose-500">Ausentes: ${stats.absent}</div>
            <div class="text-amber-500">Pendentes: ${stats.pending}</div>
          </div>
        </div>
      </div>
    `;
  }

  return `
    <div class="space-y-6">
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div>
          <h3 class="text-2xl font-black text-slate-900">Grades Escolares</h3>
          <p class="text-xs text-slate-400 mt-1">Baixe a grade escolar em PDF ou visualize instantaneamente para impressão.</p>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <!-- Button 1: Download Direct PDF with html2pdf -->
          <button id="btn-download-pdf" onclick="actions.downloadPDF()" class="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg flex items-center gap-2 hover:bg-indigo-700 transition-all">
            <i data-lucide="download"></i> Baixar Arquivo PDF
          </button>
          
          <!-- Button 2: Browser Print Preview -->
          <button onclick="window.print()" class="bg-white text-slate-800 border border-slate-200 px-5 py-2.5 rounded-xl font-bold shadow-sm flex items-center gap-2 hover:bg-slate-50 transition-all">
            <i data-lucide="printer"></i> Visualizar & Imprimir
          </button>
        </div>
      </div>

      ${subTabHeader}

      <!-- Modelo Selector Tab -->
      <div class="flex gap-2 bg-slate-100 p-1.5 rounded-2xl w-fit mb-2 print:hidden">
        <button onclick="actions.setReportModel('prof_turma')" class="px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${
          reportModel === 'prof_turma' ? 'bg-white text-[#2E5077] shadow-sm' : 'text-slate-500 hover:text-slate-800'
        }">
          <i data-lucide="user" class="w-3.5 h-3.5"></i> Professor (por Turma)
        </button>
        <button onclick="actions.setReportModel('prof_subject')" class="px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${
          reportModel === 'prof_subject' ? 'bg-white text-[#2E5077] shadow-sm' : 'text-slate-500 hover:text-slate-800'
        }">
          <i data-lucide="book" class="w-3.5 h-3.5"></i> Professor (por Matéria)
        </button>
        <button onclick="actions.setReportModel('turma_grid')" class="px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${
          reportModel === 'turma_grid' ? 'bg-white text-[#2E5077] shadow-sm' : 'text-slate-500 hover:text-slate-800'
        }">
          <i data-lucide="users" class="w-3.5 h-3.5"></i> Todas as Turmas
        </button>
      </div>

      <!-- Control Box -->
      <div class="bg-white p-6 rounded-3xl border shadow-sm space-y-4 print:hidden">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div class="space-y-1">
            <label class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Nome do Colégio</label>
            <input type="text" value="${schoolName}" oninput="actions.setSchoolName(this.value)" class="w-full bg-slate-50 border rounded-xl px-4 py-2.5 outline-none font-semibold text-sm focus:ring-2 focus:ring-indigo-500">
          </div>
          
          <div class="space-y-1">
            <label class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Selecione a Semana</label>
            <select onchange="actions.setReportWeek(this.value)" class="w-full bg-slate-50 border rounded-xl px-4 py-2.5 outline-none font-bold text-sm focus:ring-2 focus:ring-indigo-500">
              <option value="all" ${reportWeek === 'all' ? 'selected' : ''}>Todas as semanas (Geral Acumulada)</option>
              ${weeks.map(w => `<option value="${w}" ${reportWeek === w ? 'selected' : ''}>${getWeekRangeLabel(w)}</option>`).join('')}
            </select>
          </div>

          <div class="space-y-1">
            <label class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Turno / Períodos</label>
            <select onchange="actions.setReportTurno(this.value)" class="w-full bg-slate-50 border rounded-xl px-4 py-2.5 outline-none font-bold text-sm focus:ring-2 focus:ring-indigo-500">
              <option value="matutino" ${reportTurno === 'matutino' ? 'selected' : ''}>Matutino (07:30 - 11:45)</option>
              <option value="vespertino" ${reportTurno === 'vespertino' ? 'selected' : ''}>Vespertino (13:00 - 17:15)</option>
              <option value="auto" ${reportTurno === 'auto' ? 'selected' : ''}>Auto-detecção de horários</option>
            </select>
          </div>

          <div class="space-y-1">
            <label class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Filtro de Professor</label>
            <select onchange="actions.setReportTeacher(this.value)" class="w-full bg-slate-50 border rounded-xl px-4 py-2.5 outline-none font-bold text-sm focus:ring-2 focus:ring-indigo-500">
              <option value="all" ${reportTeacher === 'all' ? 'selected' : ''}>Todos os professores (${displayTeachers.length})</option>
              ${teachers.map(t => `<option value="${t.uid}" ${reportTeacher === t.uid ? 'selected' : ''}>${t.displayName}</option>`).join('')}
            </select>
          </div>

          <div class="space-y-1">
            <label class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Tamanho dos Cards</label>
            <select onchange="actions.setReportCardSize(this.value)" class="w-full bg-slate-50 border rounded-xl px-4 py-2.5 outline-none font-bold text-sm focus:ring-2 focus:ring-indigo-500 tracking-wide">
              <option value="small" ${reportCardSize === 'small' ? 'selected' : ''}>Pequeno (Compacto)</option>
              <option value="medium" ${reportCardSize === 'medium' ? 'selected' : ''}>Médio (Recomendado)</option>
              <option value="large" ${reportCardSize === 'large' ? 'selected' : ''}>Grande (Mais Legível)</option>
              <option value="esticado" ${reportCardSize === 'esticado' ? 'selected' : ''}>Esticado (Largo - 2 por linha)</option>
              <option value="super_esticado" ${reportCardSize === 'super_esticado' ? 'selected' : ''}>Super Esticado (Página Inteira - 1 por linha)</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Live Printable Preview (Mimicking A4 Sheet) -->
      <div class="printable-sheet bg-white border border-slate-200 rounded-[2rem] p-8 md:p-12 shadow-xl relative overflow-hidden">
        <!-- Sheet Header -->
        <div class="flex flex-col md:flex-row justify-between items-center border-b border-indigo-100 pb-6 mb-8 gap-4">
          <div class="flex items-center gap-4">
            <!-- Studia Logo matching user image with book and orbital swoosh -->
            <svg width="240" height="65" viewBox="0 0 240 65" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: block;">
              <!-- Light Blue Ribbon/Swoosh flourishes around the text -->
              <path d="M10 24C45 6, 85 45, 128 35C155 28, 175 14, 235 22" stroke="#7ec2f2" stroke-width="2.8" stroke-linecap="round" fill="none" opacity="0.8"/>
              <path d="M124 35C136 43, 155 35, 150 24C145 15, 132 18, 126 27" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.9"/>
              
              <!-- Subtle glow on the outer swoosh -->
              <path d="M175 14C195 6, 215 16, 235 22" stroke="#7ec2f2" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.3"/>

              <!-- Open Book icon centered above "Stu" -->
              <g transform="translate(68, 2)">
                <!-- Left half -->
                <path d="M15 14C15 6, 25 3, 30 7.5L30 23C25 18, 15 19, 15 22Z" fill="#5B99C2" />
                <!-- Right half -->
                <path d="M45 14C45 6, 35 3, 30 7.5L30 23C35 18, 45 19, 45 22Z" fill="#2E5077" />
                <path d="M18 16C18 13, 24 10, 27 12L27 21" stroke="white" stroke-width="0.8" opacity="0.4" fill="none"/>
                <path d="M42 16C42 13, 36 10, 33 12L33 21" stroke="white" stroke-width="0.8" opacity="0.4" fill="none"/>
              </g>

              <!-- Main Title: Studia -->
              <text x="18" y="47" font-family="'Inter', sans-serif" font-weight="800" font-size="34" fill="#2E5077" letter-spacing="-1.5">Studia</text>
              <!-- Subtitle: GRADE ESCOLAR DIGITAL -->
              <text x="21" y="58" font-family="'Inter', sans-serif" font-weight="700" font-size="8.5" fill="#5B99C2" letter-spacing="1.2">GRADE ESCOLAR DIGITAL</text>
            </svg>
          </div>
          
          <div class="text-center md:text-right">
            <h4 class="text-sm font-black text-slate-800 uppercase tracking-wide">${schoolName}</h4>
            <p class="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mt-1">
              ${reportModel === 'turma_grid' ? 'Relatório de Turmas (Individual)' : 'Relatório de Professores (Individual)'} - ${reportWeek === 'all' ? 'Grade Geral Acumulada' : getWeekRangeLabel(reportWeek)}
            </p>
          </div>
        </div>

        ${reportModel === 'turma_grid' ? `
          <!-- Turmas Cards Grid -->
          ${(() => {
            const turmas = getDetectedTurmas(filteredSchedules);
            if (turmas.length === 0) {
              return `
                <div class="text-center py-20 text-slate-400 font-bold space-y-2 col-span-full">
                  <i data-lucide="info" class="w-12 h-12 mx-auto text-slate-300 col-span-full"></i>
                  <p>Nenhuma turma cadastrada ou detectada nos horários selecionados. Certifique-se de preencher o campo 'Turma' ao criar novos horários.</p>
                </div>
              `;
            }
            return `
              <div class="${gridColsClass}">
                ${turmas.map(tName => {
                  const turmaSchedules = filteredSchedules.filter(s => s.classGroup === tName);
                  return TurmaScheduleCard(tName, turmaSchedules, slots);
                }).join('')}
              </div>
            `;
          })()}
        ` : `
          <!-- Teachers Cards Grid -->
          ${displayTeachers.length === 0 ? `
            <div class="text-center py-20 text-slate-400 font-bold space-y-2 col-span-full">
              <i data-lucide="info" class="w-12 h-12 mx-auto text-slate-300"></i>
              <p>Nenhum horário cadastrado para exibição na grade individual</p>
            </div>
          ` : `
            <div class="${gridColsClass}">
              ${displayTeachers.map(teacher => {
                const teacherSchedules = filteredSchedules.filter(s => s.teacherId === teacher.uid);
                return TeacherScheduleCard(teacher, teacherSchedules, slots, reportModel);
              }).join('')}
            </div>
          `}
        `}

        <div class="border-t border-slate-100 mt-12 pt-4 flex justify-between text-[8px] text-slate-400 font-extrabold uppercase tracking-widest leading-none">
          <span>Grade gerada pelo sistema Studia</span>
          <span>Data de emissão: ${new Date().toLocaleDateString('pt-BR')}</span>
        </div>
      </div>
    </div>
  `;
};

let currentSlide = 0;
const slidesContent = [
    {
        title: "Studia",
        subtitle: "Gestão Escolar Inteligente",
        content: "Uma plataforma completa para controle de horários, laboratórios e frequência docente.",
        icon: "book-open"
    },
    {
        title: "O Problema",
        subtitle: "Desafios na Gestão de Horários",
        content: "Aulas vagas imprevistas, dificuldade no controle de laboratórios e burocracia no envio de atestados médicos.",
        icon: "alert-circle"
    },
    {
        title: "Nossa Solução",
        subtitle: "Automatização e Transparência",
        content: "Sistema centralizado onde professores confirmam presença e diretores gerenciam a grade em tempo real.",
        icon: "check-circle"
    },
    {
        title: "Funcionalidades",
        subtitle: "O que o Studia faz?",
        content: "• Grade de horários dinâmica\n• Reserva de laboratórios\n• Envio digital de atestados\n• Relatórios automáticos de frequência",
        icon: "layers"
    },
    {
        title: "Tecnologia",
        subtitle: "Stack Robusta",
        content: "Backend robusto para persistência sólida e Frontend moderno com Tailwind CSS.",
        icon: "cpu"
    }
];

const SlidesTab = () => `
    <div class="max-w-4xl mx-auto h-full flex flex-col items-center justify-center space-y-12 py-10">
        <div class="bg-white w-full aspect-video rounded-[3rem] shadow-2xl border border-slate-100 p-16 flex flex-col items-center justify-center text-center relative overflow-hidden group">
            <div class="absolute -top-10 -right-10 w-40 h-40 bg-indigo-50 rounded-full blur-3xl group-hover:bg-indigo-100 transition-all"></div>
            <div class="absolute -bottom-10 -left-10 w-40 h-40 bg-slate-50 rounded-full blur-3xl group-hover:bg-slate-100 transition-all"></div>
            
            <div class="bg-indigo-600 text-white p-6 rounded-[2rem] shadow-xl mb-10 transform group-hover:scale-110 transition-all duration-500">
                <i data-lucide="${slidesContent[currentSlide].icon}" size="48"></i>
            </div>
            
            <h1 class="text-5xl font-black text-slate-900 tracking-tighter mb-4">${slidesContent[currentSlide].title}</h1>
            <h3 class="text-xl font-bold text-indigo-600 mb-8 uppercase tracking-widest text-sm">${slidesContent[currentSlide].subtitle}</h3>
            
            <div class="max-w-xl mx-auto">
                <p class="text-lg text-slate-500 font-medium leading-relaxed whitespace-pre-line">
                    ${slidesContent[currentSlide].content}
                </p>
            </div>
            
            <div class="absolute bottom-10 left-10 text-[10px] font-black text-slate-300 uppercase tracking-widest">
                Slide ${currentSlide + 1} de ${slidesContent.length}
            </div>
        </div>
        
        <div class="flex items-center gap-6">
            <button onclick="actions.prevSlide()" class="p-4 bg-white rounded-2xl shadow-lg border border-slate-100 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all" ${currentSlide === 0 ? 'disabled' : ''}>
                <i data-lucide="chevron-left" class="text-indigo-600"></i>
            </button>
            <div class="flex gap-2">
                ${slidesContent.map((_, i) => `
                    <div class="w-3 h-3 rounded-full ${i === currentSlide ? 'bg-indigo-600 scale-125' : 'bg-slate-200'} transition-all duration-300"></div>
                `).join('')}
            </div>
            <button onclick="actions.nextSlide()" class="p-4 bg-white rounded-2xl shadow-lg border border-slate-100 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all" ${currentSlide === slidesContent.length - 1 ? 'disabled' : ''}>
                <i data-lucide="chevron-right" class="text-indigo-600"></i>
            </button>
        </div>
    </div>
`;

// --- ACTIONS ---
const actions = {
  async init() {
    try {
      if (!user) {
        render(LandingView());
      } else {
        await this.refreshData();
        if (user.role === 'admin') {
          render(AdminView());
        } else {
          render(TeacherView());
        }
      }
      if (typeof lucide !== 'undefined') {
        lucide.createIcons();
      }
    } catch (err) {
      console.error('Init error:', err);
    }
  },

  showLoginModal(mode = 'login') {
    authMode = mode;
    this.init();
  },

  hideLoginModal() {
    authMode = 'closed';
    this.init();
  },

  toggleAuthMode(mode) {
    authMode = mode;
    this.init();
  },

  showCreateModal() {
    const modal = $('#create-modal');
    if (modal) {
      modal.classList.remove('hidden');
      if (typeof lucide !== 'undefined') lucide.createIcons();
    }
  },

  hideCreateModal() {
    const modal = $('#create-modal');
    if (modal) modal.classList.add('hidden');
  },

  showLabModal() {
    document.body.insertAdjacentHTML('beforeend', LabModal());
    const modal = $('#lab-modal');
    if (modal) {
      modal.classList.remove('hidden');
      if (typeof lucide !== 'undefined') lucide.createIcons();
    }
  },

  hideLabModal() {
    const modal = $('#lab-modal');
    if (modal) modal.remove();
  },

  showCertModal() {
    const modal = $('#cert-modal');
    if (modal) modal.classList.remove('hidden');
  },

  hideCertModal() {
    const modal = $('#cert-modal');
    if (modal) modal.classList.add('hidden');
  },

  switchTab(tab) {
    currentTab = tab;
    this.init();
  },

  async login() {
    const emailInput = $('#auth-email');
    const passwordInput = $('#auth-password');
    if (!emailInput || !passwordInput) return;

    const email = emailInput.value;
    const password = passwordInput.value;
    if (!email || !password) return alert('Por favor, preencha todos os campos');
    
    try {
      user = await api.post('/api/auth/login', { email, password });
      localStorage.setItem('user', JSON.stringify(user));
      authMode = 'closed';
      this.init();
    } catch (err) {
      alert(err.message);
    }
  },

  handleRoleChange() {
    const roleSelect = $('#auth-role');
    const container = $('#subject-container');
    if (roleSelect && container) {
      const role = roleSelect.value;
      if (role === 'admin') {
          container.classList.add('hidden');
      } else {
          container.classList.remove('hidden');
      }
    }
  },

  async register() {
    const emailInput = $('#auth-email');
    const passwordInput = $('#auth-password');
    const nameInput = $('#auth-name');
    const roleSelect = $('#auth-role');
    
    if (!emailInput || !passwordInput || !nameInput || !roleSelect) return;

    const email = emailInput.value;
    const password = passwordInput.value;
    const displayName = nameInput.value;
    const role = roleSelect.value;
    
    let subject = null;
    if (role === 'teacher') {
      const subjectInput = $('#auth-subject');
      subject = subjectInput ? subjectInput.value : null;
    }
    
    if (!email || !password || !displayName) return alert('Por favor, preencha todos os campos');
    if (role === 'teacher' && !subject) return alert('Por favor, informe sua matéria');
    
    try {
      user = await api.post('/api/auth/register', { email, password, displayName, role, subject });
      localStorage.setItem('user', JSON.stringify(user));
      authMode = 'closed';
      this.init();
    } catch (err) {
      alert(err.message);
    }
  },

  logout() {
    localStorage.removeItem('user');
    user = null;
    currentTab = 'horarios';
    authMode = 'closed';
    this.init();
  },

  async refreshData() {
    if (!user) return;
    try {
      if (user.role === 'admin') {
        const [s, t, st, lb, c] = await Promise.all([
          api.get('/api/schedules'),
          api.get('/api/teachers'),
          api.get('/api/stats'),
          api.get('/api/labs/bookings'),
          api.get('/api/certificates')
        ]).catch(err => {
          console.error("Fetch errors:", err);
          return [[], [], {total:0, confirmed:0, absent:0, pending:0}, [], []];
        });
        schedules = s || [];
        teachers = t || [];
        stats = st || {total:0, confirmed:0, absent:0, pending:0};
        labBookings = lb || [];
        certificates = c || [];
      } else {
        schedules = await api.get(`/api/schedules?teacherId=${user.uid}`) || [];
      }
    } catch (err) {
      console.error('Data refresh error:', err);
    }
  },

  async refreshSchedules() {
    await this.refreshData();
    this.init();
  },

  async updateStatus(id, status) {
    try {
      await api.patch(`/api/schedules/${id}`, { status });
      this.init();
    } catch (err) {
      alert('Erro ao atualizar status');
    }
  },

  async createSchedule(e) {
    e.preventDefault();
    const teacherSelect = $('#form-teacher');
    const data = {
      subject: $('#form-subject').value,
      classGroup: $('#form-class-group').value,
      date: $('#form-date').value,
      room: $('#form-room').value,
      startTime: $('#form-start').value,
      endTime: $('#form-end').value,
      teacherId: teacherSelect.value,
      teacherName: teacherSelect.options[teacherSelect.selectedIndex].text
    };
    
    try {
      await api.post('/api/schedules', data);
      this.hideCreateModal();
      this.init();
    } catch (err) {
      alert('Erro ao criar horário');
    }
  },

  async deleteSchedule(id) {
    if (confirm('Deseja excluir este horário?')) {
      try {
        await api.delete(`/api/schedules/${id}`);
        this.init();
      } catch (err) {
        alert('Erro ao excluir');
      }
    }
  },

  async createLabBooking(e) {
    e.preventDefault();
    const data = {
      labId: $('#lab-type').value,
      teacherId: user.uid,
      teacherName: user.displayName,
      date: $('#lab-date').value,
      startTime: $('#lab-start').value,
      endTime: $('#lab-end').value
    };
    try {
      await api.post('/api/labs/bookings', data);
      this.hideLabModal();
      this.init();
    } catch (err) {
      alert('Erro ao reservar');
    }
  },

  async submitCert(e) {
    e.preventDefault();
    const fileInput = $('#cert-image');
    let imageUrl = null;

    if (fileInput && fileInput.files[0]) {
        try {
            imageUrl = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(fileInput.files[0]);
            });
        } catch (err) {
            console.error("File upload error:", err);
        }
    }

    const data = {
      teacherId: user.uid,
      teacherName: user.displayName,
      date: $('#cert-date').value,
      reason: $('#cert-reason').value,
      imageUrl: imageUrl
    };

    try {
      await api.post('/api/certificates', data);
      this.hideCertModal();
      alert('Atestado enviado com sucesso!');
      this.init();
    } catch (err) {
      alert('Erro ao enviar atestado');
    }
  },

  viewImage(url) {
    const modalId = 'image-viewer-modal';
    let modal = $(`#${modalId}`);
    if (!modal) {
        document.body.insertAdjacentHTML('beforeend', `
            <div id="${modalId}" class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md" onclick="this.classList.add('hidden')">
                <div class="relative bg-white p-2 rounded-2xl shadow-2xl max-w-4xl max-h-[90vh] overflow-auto" onclick="event.stopPropagation()">
                    <img id="viewer-img" src="" class="w-full h-auto rounded-xl">
                    <button class="absolute top-4 right-4 bg-white/10 hover:bg-white/20 p-2 rounded-full text-white backdrop-blur-md" onclick="$('#${modalId}').classList.add('hidden')">
                        <i data-lucide="x"></i>
                    </button>
                </div>
            </div>
        `);
        modal = $(`#${modalId}`);
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }
    const img = modal.querySelector('#viewer-img');
    img.src = url;
    modal.classList.remove('hidden');
  },

  viewImageById(id) {
    const cert = certificates.find(c => c.id === id);
    if (cert && cert.imageUrl) {
        this.viewImage(cert.imageUrl);
    }
  },

  nextSlide() {
    if (currentSlide < slidesContent.length - 1) {
        currentSlide++;
        this.init();
    }
  },

  prevSlide() {
    if (currentSlide > 0) {
        currentSlide--;
        this.init();
    }
  },

  async approveCert(id) {
    if (confirm('Deseja aprovar este atestado? Isso converterá automaticamente os horários deste dia em AULA VAGA.')) {
      try {
        await api.patch(`/api/certificates/${id}/approve`, {});
        this.init();
      } catch (err) {
        alert('Erro ao aprovar atestado');
      }
    }
  },

  setReportWeek(val) {
    reportWeek = val;
    this.init();
  },

  setReportTurno(val) {
    reportTurno = val;
    this.init();
  },

  setReportTeacher(val) {
    reportTeacher = val;
    this.init();
  },

  setReportCardSize(val) {
    reportCardSize = val;
    localStorage.setItem('reportCardSize', val);
    this.init();
  },

  setSchoolName(val) {
    schoolName = val;
    // Don't call init on every keystroke to avoid losing focus of input
    const headerTitle = $('.printable-sheet h4');
    if (headerTitle) {
      headerTitle.textContent = val;
    }
  },

  setRelatorioSubTab(val) {
    currentRelatorioSubTab = val;
    this.init();
  },

  setReportModel(val) {
    reportModel = val;
    this.init();
  },

  setTeacherSchedulesTab(val) {
    teacherSchedulesTab = val;
    this.init();
  },

  downloadTeacherPDF() {
    const element = document.querySelector('.printable-sheet');
    if (!element) return;
    
    const btn = document.querySelector('#btn-download-pdf-teacher');
    const originalContent = btn ? btn.innerHTML : '';
    if (btn) {
      btn.innerHTML = `<svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Gerando PDF...`;
      btn.disabled = true;
    }
    
    const opt = {
      margin:       [0.3, 0.3, 0.3, 0.3],
      filename:     `Grade_Professor_${user ? user.displayName.replace(/\s+/g, '_') : 'Individual'}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { 
        scale: 2, 
        useCORS: true, 
        logging: false,
        backgroundColor: '#ffffff'
      },
      jsPDF:        { unit: 'in', format: 'a4', orientation: 'landscape' }
    };
    
    const restoreOklch = prepareOklchForPrint(element);
    
    html2pdf().set(opt).from(element).save().then(() => {
      restoreOklch();
      if (btn) {
        btn.innerHTML = originalContent;
        btn.disabled = false;
        if (typeof lucide !== 'undefined') lucide.createIcons();
      }
    }).catch(err => {
      restoreOklch();
      console.error('Error generating PDF:', err);
      if (btn) {
        btn.innerHTML = originalContent;
        btn.disabled = false;
        if (typeof lucide !== 'undefined') lucide.createIcons();
      }
      alert('Houve um erro ao gerar o PDF diretamente. Você pode usar o botão "Visualizar & Imprimir" para salvar como PDF pelo navegador.');
    });
  },

  downloadPDF() {
    const element = document.querySelector('.printable-sheet');
    if (!element) return;
    
    const btn = document.querySelector('#btn-download-pdf');
    const originalContent = btn ? btn.innerHTML : '';
    if (btn) {
      btn.innerHTML = `<svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Gerando PDF...`;
      btn.disabled = true;
    }
    
    const opt = {
      margin:       [0.3, 0.3, 0.3, 0.3],
      filename:     `Grade_Escolar_${reportWeek}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { 
        scale: 2, 
        useCORS: true, 
        logging: false,
        backgroundColor: '#ffffff'
      },
      jsPDF:        { unit: 'in', format: 'a4', orientation: 'landscape' }
    };
    
    const restoreOklch = prepareOklchForPrint(element);
    
    html2pdf().set(opt).from(element).save().then(() => {
      restoreOklch();
      if (btn) {
        btn.innerHTML = originalContent;
        btn.disabled = false;
        if (typeof lucide !== 'undefined') lucide.createIcons();
      }
    }).catch(err => {
      restoreOklch();
      console.error('Error generating PDF:', err);
      if (btn) {
        btn.innerHTML = originalContent;
        btn.disabled = false;
        if (typeof lucide !== 'undefined') lucide.createIcons();
      }
      alert('Houve um erro ao gerar o PDF diretamente. Você pode usar o botão "Visualizar & Imprimir" para salvar como PDF pelo navegador.');
    });
  }
};

// --- OKLCH to RGB color polyfill for html2pdf/html2canvas compatibility with Tailwind 4 ---
function oklchToRgbFallback(oklchStr) {
  try {
    const inner = oklchStr.match(/oklch\(([^)]+)\)/i);
    if (!inner) return 'rgb(0, 0, 0)';
    
    const parts = inner[1].trim().split(/[\s,+/]+/);
    if (parts.length < 3) return 'rgb(0, 0, 0)';
    
    let L = parts[0].endsWith('%') ? parseFloat(parts[0]) / 100 : parseFloat(parts[0]);
    let C = parts[1].endsWith('%') ? parseFloat(parts[1]) / 100 * 0.4 : parseFloat(parts[1]);
    let H = 0;
    if (parts[2] !== 'none') {
      if (parts[2].endsWith('deg')) H = parseFloat(parts[2]);
      else if (parts[2].endsWith('rad')) H = parseFloat(parts[2]) * 180 / Math.PI;
      else if (parts[2].endsWith('turn')) H = parseFloat(parts[2]) * 360;
      else H = parseFloat(parts[2]);
    }
    
    let A = 1;
    if (parts[3] !== undefined) {
      A = parts[3].endsWith('%') ? parseFloat(parts[3]) / 100 : parseFloat(parts[3]);
    }
    
    const a_ = C * Math.cos(H * Math.PI / 180);
    const b_ = C * Math.sin(H * Math.PI / 180);
    
    const l_ = L + 0.3963377774 * a_ + 0.2158037573 * b_;
    const m_ = L - 0.1055613458 * a_ - 0.0638541728 * b_;
    const s_ = L - 0.0894841775 * a_ - 1.2914855480 * b_;
    
    const l = Math.pow(Math.max(0, l_), 3);
    const m = Math.pow(Math.max(0, m_), 3);
    const s = Math.pow(Math.max(0, s_), 3);
    
    let r_lin = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
    let g_lin = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
    let b_lin = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;
    
    const r = r_lin <= 0.0031308 ? 12.92 * r_lin : 1.055 * Math.pow(r_lin, 1 / 2.4) - 0.055;
    const g = g_lin <= 0.0031308 ? 12.92 * g_lin : 1.055 * Math.pow(g_lin, 1 / 2.4) - 0.055;
    const b = b_lin <= 0.0031308 ? 12.92 * b_lin : 1.055 * Math.pow(b_lin, 1 / 2.4) - 0.055;
    
    const clamp = (val) => Math.min(255, Math.max(0, Math.round(val * 255)));
    
    if (A === 1) {
      return `rgb(${clamp(r)}, ${clamp(g)}, ${clamp(b)})`;
    } else {
      return `rgba(${clamp(r)}, ${clamp(g)}, ${clamp(b)}, ${A})`;
    }
  } catch (e) {
    return 'rgb(0, 0, 0)';
  }
}

function resolveOklchToRgb(colorStr) {
  if (!colorStr || typeof colorStr !== 'string' || !colorStr.includes('oklch')) {
    return colorStr;
  }
  return colorStr.replace(/oklch\([^)]+\)/gi, (match) => {
    let tempDiv = document.getElementById('temp-color-resolver');
    if (!tempDiv) {
      tempDiv = document.createElement('div');
      tempDiv.id = 'temp-color-resolver';
      tempDiv.style.position = 'absolute';
      tempDiv.style.visibility = 'hidden';
      tempDiv.style.width = '0';
      tempDiv.style.height = '0';
      document.body.appendChild(tempDiv);
    }
    try {
      tempDiv.style.color = match;
      const computed = window.getComputedStyle(tempDiv, null).getPropertyValue('color');
      if (computed && !computed.includes('oklch')) {
        return computed;
      }
    } catch (e) {
      // ignore
    }
    return oklchToRgbFallback(match);
  });
}

function prepareOklchForPrint(container) {
  const disablePolyfill = enableOklchPolyfill();
  const elements = [container, ...container.querySelectorAll('*')];
  const originalStyles = [];
  
  for (const el of elements) {
    if (!el || !el.style) continue;
    
    const originalInlineStyle = el.getAttribute('style') || '';
    originalStyles.push({ el, originalInlineStyle });
    
    try {
      const computed = window.getComputedStyle(el);
      const props = [
        'color', 
        'backgroundColor', 
        'borderColor', 
        'borderTopColor', 
        'borderBottomColor', 
        'borderLeftColor', 
        'borderRightColor', 
        'stroke', 
        'fill'
      ];
      
      for (const prop of props) {
        let val = '';
        try {
          val = computed.getPropertyValue(prop.replace(/([A-Z])/g, '-$1').toLowerCase());
        } catch (e) {
          val = computed[prop];
        }
        
        if (val && typeof val === 'string' && val.includes('oklch')) {
          const resolved = resolveOklchToRgb(val);
          el.style[prop] = resolved;
        }
      }
    } catch (e) {
      // ignore
    }
  }
  
  return function restore() {
    disablePolyfill();
    for (const item of originalStyles) {
      if (item.originalInlineStyle) {
        item.el.setAttribute('style', item.originalInlineStyle);
      } else {
        item.el.removeAttribute('style');
      }
    }
  };
}

function enableOklchPolyfill() {
  const originalGetPropertyValue = CSSStyleDeclaration.prototype.getPropertyValue;
  CSSStyleDeclaration.prototype.getPropertyValue = function(property) {
    const val = originalGetPropertyValue.call(this, property);
    if (val && typeof val === 'string' && val.includes('oklch')) {
      return resolveOklchToRgb(val);
    }
    return val;
  };

  const cssProperties = ['color', 'backgroundColor', 'borderColor', 'borderTopColor', 'borderBottomColor', 'borderLeftColor', 'borderRightColor', 'stroke', 'fill'];
  const originalDescriptors = {};

  for (const prop of cssProperties) {
    const desc = Object.getOwnPropertyDescriptor(CSSStyleDeclaration.prototype, prop);
    if (desc && desc.get) {
      originalDescriptors[prop] = desc;
      Object.defineProperty(CSSStyleDeclaration.prototype, prop, {
        configurable: true,
        enumerable: true,
        get() {
          const val = desc.get.call(this);
          if (val && typeof val === 'string' && val.includes('oklch')) {
            return resolveOklchToRgb(val);
          }
          return val;
        },
        set(v) {
          desc.set.call(this, v);
        }
      });
    }
  }

  return function restore() {
    CSSStyleDeclaration.prototype.getPropertyValue = originalGetPropertyValue;
    for (const prop in originalDescriptors) {
      Object.defineProperty(CSSStyleDeclaration.prototype, prop, originalDescriptors[prop]);
    }
  };
}

window.actions = actions;

// Start
actions.init();
