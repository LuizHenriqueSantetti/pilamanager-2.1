export const roles = ['GERENCIA','ADMINISTRADOR','PROFISSIONAL','RECEPCIONISTA'];
export const normalizeEmail = value => typeof value === 'string' ? value.trim().toLowerCase() : '';
export const emailValid = value => typeof value === 'string' && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
export const digits = value => String(value ?? '').replace(/\D/g, '');
export function validCPF(raw) {
  const cpf = digits(raw);
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
  for (let size = 9; size < 11; size++) {
    let sum = 0;
    for (let i = 0; i < size; i++) sum += Number(cpf[i]) * (size + 1 - i);
    const digit = (sum * 10) % 11 % 10;
    if (digit !== Number(cpf[size])) return false;
  }
  return true;
}
export function validateUser(input = {}) {
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  const email = normalizeEmail(input.email);
  const role = input.role;
  const password = input.password;
  const errors = [];
  if (name.length < 3 || name.length > 120) errors.push('Informe um nome entre 3 e 120 caracteres.');
  if (!emailValid(email)) errors.push('Informe um e-mail válido.');
  if (!roles.includes(role)) errors.push('Selecione um cargo válido.');
  if (typeof password !== 'string' || password.length < 12 || password.length > 128) errors.push('A senha precisa ter entre 12 e 128 caracteres.');
  return { errors, value: { name, email, role, password } };
}
const optionalString = (value, max) => {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') return { invalid: true };
  const trimmed = value.trim();
  return trimmed ? (trimmed.length <= max ? trimmed : { invalid: true }) : null;
};
// Campos de texto livre da ficha (mesmos do PilaManager 2.1 original).
export const patientTextFields = {
  special_notes: 'Notas Especiais',
  disabilities: 'Deficiências',
  health_problems: 'Problemas de Saúde',
  pain_limitations: 'Dores e Limitações',
  clinical_notes: 'Queixas e Observações',
  goals: 'Objetivos',
};
const validDate = date => /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date + 'T00:00:00Z'))
  && new Date(date + 'T00:00:00Z').toISOString().slice(0,10) === date
  && date <= new Date().toISOString().slice(0,10) && date >= '1900-01-01';

// Obrigatórios como no original: Nome, CPF, Data de Nascimento e E-mail.
// requireConsent: no cadastro novo é preciso aceitar a Política de Privacidade.
export function validatePatient(input = {}, { requireConsent = false } = {}) {
  const errors = [];
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  if (name.length < 3 || name.length > 150) errors.push('Informe o nome do paciente (3 a 150 caracteres).');

  const cpf = digits(input.cpf);
  if (!cpf) errors.push('Informe o CPF.');
  else if (!validCPF(cpf)) errors.push('CPF inválido.');

  const birth_date = input.birth_date ? String(input.birth_date) : '';
  if (!birth_date) errors.push('Informe a data de nascimento.');
  else if (!validDate(birth_date)) errors.push('Data de nascimento inválida.');

  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  if (!email) errors.push('Informe o e-mail.');
  else if (!emailValid(email)) errors.push('E-mail do paciente inválido.');

  // Telefone é guardado só com dígitos (DDD + número); a tela aplica a máscara ao exibir.
  let phone = optionalString(input.phone, 20);
  if (typeof phone === 'string') {
    phone = digits(phone);
    if (phone.length < 10 || phone.length > 11) errors.push('Telefone inválido. Informe DDD e número.');
  }

  const texts = {};
  for (const key of Object.keys(patientTextFields)) texts[key] = optionalString(input[key], 2000);
  if ([phone, ...Object.values(texts)].some(v => v?.invalid)) errors.push('Um ou mais campos ultrapassam o limite de 2000 caracteres.');

  if (requireConsent && input.privacy_consent !== true) errors.push('É preciso aceitar a Política de Privacidade.');

  return { errors, value: { name, cpf: cpf || null, birth_date: birth_date || null, email: email || null, phone, ...texts } };
}
