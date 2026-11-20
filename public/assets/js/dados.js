// Dados das telas que funcionam no navegador (como no PilaManager original):
// planos, equipe, agenda, cobranças, financeiro, comissões, clínica e cargos.
// Pacientes e usuários NÃO ficam aqui: eles são gravados no PostgreSQL pela API.
import { storage, newId, isoDate, addDays, pad } from './nucleo.js';

const KEY = 'pilamanager_dados_v1';
let db = storage.get(KEY, null);

export const dados = () => db;
export function salvar() { storage.set(KEY, db); }

export const modulosPermissao = [
  ['dashboard', 'Visão Geral'], ['agenda', 'Agendamento'], ['pacientes', 'Pacientes'], ['equipe', 'Equipe'],
  ['planos', 'Planos'], ['cobrancas', 'Cobranças'], ['comissoes', 'Comissionamento'], ['financeiro', 'Financeiro'], ['relatorios', 'Relatórios'],
];

function cargosIniciais() {
  const todos = Object.fromEntries(modulosPermissao.map(([k]) => [k, true]));
  return {
    GERENCIA: { ...todos },
    ADMINISTRADOR: { ...todos },
    PROFISSIONAL: { ...todos, financeiro: false, comissoes: false, cobrancas: false, relatorios: false },
    RECEPCIONISTA: { ...todos, financeiro: false, comissoes: false, relatorios: false },
  };
}

// Cria os dados iniciais usando os pacientes reais do banco.
function criarIniciais(pacientes) {
  const hoje = isoDate();
  const planos = [
    { id: newId(), nome: 'Essencial', descricao: 'Plano mensal para iniciar no Pilates, com uma aula por semana.', preco: 200, duracao: 'Mensal', aulas: 4, beneficios: ['4 aulas por mês', 'Acompanhamento profissional'], ativo: true, destaque: false },
    { id: newId(), nome: 'Equilíbrio', descricao: 'Plano mensal com duas aulas por semana.', preco: 360, duracao: 'Mensal', aulas: 8, beneficios: ['8 aulas por mês', 'Acompanhamento da evolução'], ativo: true, destaque: true },
    { id: newId(), nome: 'Intensivo', descricao: 'Plano mensal com três aulas por semana.', preco: 480, duracao: 'Mensal', aulas: 12, beneficios: ['12 aulas por mês', 'Programação de atividades'], ativo: true, destaque: false },
  ];
  const base = { rg: '', cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: 'Cascavel', uf: 'PR', obs: '', contrato: 'PJ', duracao: 60, metodoPagamento: 'Pix', tipoComissao: 'Percentual', regras: '', banco: '', codigoBanco: '', agencia: '', conta: '', digito: '', tipoConta: '', tipoPix: '', chavePix: '', titular: '', cpfTitular: '', foto: null, turnos: [] };
  const profissionais = [
    { ...base, id: newId(), nome: 'Paula Mendes', cpf: '90000001090', nascimento: '1990-04-12', telefone: '45991110001', email: 'paula.mendes@pilamanager.local', tipo: 'Fisioterapeuta', registro: 'CREFITO 101010-F', especialidade: 'Pilates clínico', admissao: '2025-02-01', situacao: 'Ativo', modalidades: ['Pilates', 'Aparelhos', 'Reabilitação'], comissao: 40, banco: 'Banco do Brasil', chavePix: 'paula.mendes@pilamanager.local', tipoPix: 'E-mail' },
    { ...base, id: newId(), nome: 'Ricardo Alves', cpf: '90000002000', nascimento: '1987-09-30', telefone: '45991110002', email: 'ricardo.alves@pilamanager.local', tipo: 'Fisioterapeuta', registro: 'CREFITO 202020-F', especialidade: 'Ortopedia', admissao: '2025-03-10', situacao: 'Ativo', modalidades: ['Pilates', 'Solo', 'Alongamento'], comissao: 40 },
    { ...base, id: newId(), nome: 'Camila Torres', cpf: '90000003001', nascimento: '1995-01-22', telefone: '45991110003', email: 'camila.torres@pilamanager.local', tipo: 'Professor', registro: 'CREF 303030-G/PR', especialidade: 'Pilates solo', admissao: '2025-06-02', situacao: 'Ativo', modalidades: ['Solo', 'Funcional'], tipoComissao: 'Fixo por aula', comissao: 25 },
  ];
  const salas = ['Sala 1', 'Sala 2', 'Sala VIP'];
  const ativos = pacientes.filter((p) => p.active);
  const vinculos = {};
  ativos.forEach((p, i) => { vinculos[p.id] = planos[i % planos.length].id; });

  // Agenda: aulas semanais nas últimas 3 semanas e nas próximas 3.
  const agendamentos = [];
  const horarios = ['08:00', '09:00', '10:00', '14:00', '15:00', '16:00', '17:00'];
  ativos.slice(0, 7).forEach((p, i) => {
    const prof = profissionais[i % profissionais.length];
    for (let w = -3; w <= 3; w++) {
      const data = addDays(hoje, w * 7 + (i % 5) - 2);
      const passado = data < hoje;
      let status = passado ? 'Realizado' : (w === 0 || i % 3 ? 'Confirmado' : 'Pendente');
      if (passado && (i + w) % 6 === 0) status = 'Falta';
      if (!passado && (i + w) % 7 === 0) status = 'Cancelado';
      const inicio = horarios[i % horarios.length];
      agendamentos.push({ id: newId(), pacienteId: p.id, pacienteNome: p.name, profissionalId: prof.id, sala: salas[i % salas.length], data, inicio, fim: `${pad(Number(inicio.slice(0, 2)) + 1)}:00`, tipo: 'Regular', status });
    }
  });

  // Cobranças: mês passado recebido; mês atual metade recebido, metade pendente.
  const cobrancas = [];
  const transacoes = [];
  const d = new Date();
  const mesAtual = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
  const anterior = new Date(d.getFullYear(), d.getMonth() - 1, 1);
  const mesAnterior = `${anterior.getFullYear()}-${pad(anterior.getMonth() + 1)}`;
  ativos.forEach((p, i) => {
    const plano = planos.find((x) => x.id === vinculos[p.id]);
    [[mesAnterior, true], [mesAtual, i % 2 === 0]].forEach(([mes, pago]) => {
      const vencimento = `${mes}-10`;
      const c = { id: newId(), pacienteId: p.id, pacienteNome: p.name, planoId: plano.id, planoNome: plano.nome, vencimento, valor: plano.preco, status: pago ? 'Recebido' : 'Pendente', recebidoEm: pago ? vencimento : null };
      cobrancas.push(c);
      if (pago) transacoes.push({ id: newId(), tipo: 'receita', data: vencimento, descricao: `Plano ${plano.nome} — ${p.name}`, categoria: 'Planos', valor: plano.preco, cobrancaId: c.id });
    });
  });
  [mesAnterior, mesAtual].forEach((mes) => {
    transacoes.push({ id: newId(), tipo: 'despesa', data: `${mes}-05`, descricao: 'Aluguel do estúdio', categoria: 'Aluguel', valor: 900 });
    transacoes.push({ id: newId(), tipo: 'despesa', data: `${mes}-15`, descricao: 'Energia elétrica', categoria: 'Contas', valor: 180 });
  });

  return {
    versao: 1, planos, profissionais, salas, vinculos, agendamentos, cobrancas, transacoes, comissoesPagas: [],
    clinica: { nomeSistema: 'PilaManager', descricao: 'PilaManager Studio', nome: '', telefone: '', endereco: '', horarios: '', logo: null },
    perfil: { telefone: '', foto: null },
    preferencias: { transicao: 'suave', idioma: 'pt-BR' },
    cargos: cargosIniciais(),
    historico: [],
  };
}

// Garante que os dados existam e gera as cobranças do mês para quem tem plano.
export function garantirDados(pacientes) {
  if (!db || db.versao !== 1) db = criarIniciais(pacientes);
  const d = new Date();
  const mes = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
  const nomes = Object.fromEntries(pacientes.map((p) => [p.id, p]));
  for (const [pacienteId, planoId] of Object.entries(db.vinculos)) {
    const paciente = nomes[pacienteId];
    const plano = db.planos.find((p) => p.id === planoId);
    if (!paciente || !paciente.active || !plano) continue;
    if (!db.cobrancas.some((c) => c.pacienteId === pacienteId && c.vencimento.startsWith(mes))) {
      db.cobrancas.push({ id: newId(), pacienteId, pacienteNome: paciente.name, planoId, planoNome: plano.nome, vencimento: `${mes}-10`, valor: plano.preco, status: 'Pendente', recebidoEm: null });
    }
  }
  salvar();
}

export const plano = (id) => db.planos.find((p) => p.id === id);
export const profissional = (id) => db.profissionais.find((p) => p.id === id);
export const planoDoPaciente = (pacienteId) => plano(db.vinculos[pacienteId]);

// Vincula (ou remove) o plano do paciente e cria a primeira cobrança.
export function definirPlano(paciente, planoId) {
  const atual = db.vinculos[paciente.id];
  if (!planoId) { delete db.vinculos[paciente.id]; salvar(); return; }
  if (atual === planoId) return;
  db.vinculos[paciente.id] = planoId;
  const p = plano(planoId);
  db.cobrancas.push({ id: newId(), pacienteId: paciente.id, pacienteNome: paciente.name, planoId, planoNome: p.nome, vencimento: addDays(isoDate(), 7), valor: p.preco, status: 'Pendente', recebidoEm: null });
  registrarHistorico(paciente.id, p.nome, 'Plano vinculado ao paciente', 'planos');
  salvar();
}

export function registrarHistorico(pacienteId, titulo, detalhe, tag, autor) {
  db.historico.unshift({ id: newId(), pacienteId, titulo, detalhe, tag, autor: autor || '', quando: new Date().toISOString() });
  db.historico = db.historico.slice(0, 500);
  salvar();
}

// Valor de uma aula para o cálculo de comissão percentual.
export function valorAula(agendamento) {
  const p = planoDoPaciente(agendamento.pacienteId);
  return p && p.aulas ? p.preco / p.aulas : 0;
}
export function comissaoDoAgendamento(a) {
  const prof = profissional(a.profissionalId);
  if (!prof) return 0;
  return prof.tipoComissao === 'Fixo por aula' ? Number(prof.comissao || 0) : valorAula(a) * Number(prof.comissao || 0) / 100;
}
