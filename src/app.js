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

const TeacherView = () => `
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
        ${SidebarBtn('slides', 'presentation', 'Apresentação')}
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
        <h2 class="font-bold text-lg capitalize">${currentTab}</h2>
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
        ` : ''}
        ${currentTab === 'atestados' ? `
          <div class="space-y-8">
            <div class="bg-white rounded-3xl border shadow-sm p-10 text-center">
              <h3 class="text-xl font-bold mb-4">Seus Atestados</h3>

              <button onclick="actions.showCertModal()" class="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold">Enviar Novo Atestado</button>
            </div>
          </div>
        ` : ''}
        ${currentTab === 'slides' ? SlidesTab() : ''}
      </div>
    </main>
    
    ${CertModal()}
  </div>
`;

const CreateModal = () => `
  <!-- Same Create Modal logic but with current state -->
  <div id="create-modal" class="fixed inset-0 z-50 flex items-center justify-center p-4 hidden">
    <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onclick="actions.hideCreateModal()"></div>
    <div class="bg-white w-full max-w-lg rounded-3xl p-8 relative z-10 shadow-2xl">
      <h3 class="text-2xl font-bold mb-8">Novo Agendamento</h3>
      <form onsubmit="actions.createSchedule(event)" class="space-y-4">
        <input type="text" id="form-subject" placeholder="Matéria" class="w-full bg-slate-50 border p-3 rounded-xl outline-none font-bold" required>
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
        ${SidebarBtn('slides', 'presentation', 'Apresentação')}
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
        ${currentTab === 'slides' ? SlidesTab() : ''}
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

const RelatoriosTab = () => `
  <h3 class="text-2xl font-black text-slate-900">Relatório de Frequência</h3>
  <div class="bg-white p-10 rounded-[2.5rem] border shadow-sm flex flex-col items-center">
    <!-- Simple Bar Chart Visualization -->
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
`;

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
  }
};

window.actions = actions;

// Start
actions.init();
