# PilaManager 2.1 – Integração com PostgreSQL

Trabalho de Engenharia de Software – Centro Universitário FAG.

O PilaManager é um sistema para estúdios de pilates e clínicas de fisioterapia. Nesta entrega ligamos algumas telas a um banco de dados PostgreSQL de verdade. Tudo o que é cadastrado fica salvo no banco, mesmo depois de fechar e abrir o sistema de novo.

Os dados usados aqui são todos inventados.

## Telas que salvam no banco

| Tela | O que dá para fazer |
|---|---|
| Login | Entrar e sair. A senha é conferida no banco e fica salva criptografada. |
| Pacientes | Cadastrar, pesquisar, ver a ficha, editar, inativar, reativar e excluir. |
| Usuários do Sistema | Criar contas para a equipe, ativar e desativar (Configurações, no menu do usuário). |
| Meu Perfil e Segurança | Alterar nome, e-mail e senha (Configurações). |

## As outras telas

Agendamento, Equipe, Planos, Cobranças, Comissionamento, Financeiro, Relatórios, Clínica, Cargos e Permissões, Aparência e Acessibilidade funcionam normalmente, mas guardam os dados no próprio navegador, como na versão anterior do sistema. Elas usam os pacientes do banco: por exemplo, o agendamento escolhe o paciente cadastrado no PostgreSQL.

Na primeira vez que alguém entra, essas telas já vêm com alguns dados de exemplo (planos, profissionais, aulas e pagamentos).

## O que precisa ter instalado

- Windows 10 ou 11
- [Node.js](https://nodejs.org) (versão LTS)
- [PostgreSQL 16 ou 17](https://www.postgresql.org/download/windows/) (não precisa lembrar a senha que foi criada na instalação)
- Internet na primeira vez que abrir

## Como usar

1. Abra o **windows/INICIAR.bat** (dois cliques). Na primeira vez demora uns 2 minutos, porque ele cria o banco.
2. Ele abre o navegador em http://localhost:3000 e mostra na janela o **e-mail e a senha** para entrar.
3. Para ver os dados direto no banco, abra o **windows/VER_BANCO.bat**.
4. Para fechar tudo, abra o **windows/PARAR.bat**. Os dados continuam salvos.

O e-mail e a senha também ficam no arquivo `.env`, que é criado na primeira vez.

Em um computador novo o banco começa com a conta da Gerência e 3 pacientes de exemplo.

## Onde fica o banco

O banco é um PostgreSQL só deste projeto, separado dos outros bancos do computador:

- Pasta dos dados: `%LOCALAPPDATA%\PilaManagerDemo\postgres-data`
- Endereço: `127.0.0.1`, porta `5434`
- Banco e usuário: `pilamanager_demo`
- Senha: `DB_PASSWORD` no arquivo `.env`

Com esses dados dá para abrir também pelo pgAdmin 4. As tabelas principais são `users` (usuários) e `patients` (pacientes).

## Testes

Com o sistema aberto, rode o **windows/TESTAR.bat**. Ele faz:

- testes das regras de cadastro (CPF, e-mail, senha, campos obrigatórios);
- testes que cadastram, editam, inativam e excluem e depois conferem no banco (inclusive troca de senha e permissões por cargo);
- o passo a passo completo no Google Chrome e no Microsoft Edge, passando por todas as telas (abre as janelas sozinho).

As capturas de tela dos testes estão em `docs/evidencias`.

## Pastas

```
db/         criação das tabelas do banco
public/     telas (HTML, CSS e um arquivo JavaScript para cada tela em assets/js)
server/     servidor que recebe os dados das telas e grava no banco
windows/    atalhos para iniciar, parar, ver o banco e testar
scripts/    scripts usados pelos atalhos
tests/      testes automáticos
docs/       capturas de tela dos testes
```

## Ferramentas que usamos

- **Trello:** https://trello.com/b/tFTm4z72/pilamanager-21
- **GitHub:** https://github.com/LuizHenriqueSantetti/pilamanager-2.1
- **PostgreSQL** (banco de dados): https://www.postgresql.org
- **pgAdmin** (para ver o banco): https://www.pgadmin.org
- **Node.js** (servidor): https://nodejs.org
