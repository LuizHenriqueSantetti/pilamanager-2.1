# PilaManager 2.1 – Integração com PostgreSQL

Trabalho de Engenharia de Software – Centro Universitário FAG.

O PilaManager é um sistema para estúdios de pilates e clínicas de fisioterapia. Nesta entrega ligamos algumas telas a um banco de dados PostgreSQL de verdade. Tudo o que é cadastrado fica salvo no banco, mesmo depois de fechar e abrir o sistema de novo.

Os dados usados aqui são todos inventados.

## Telas que salvam no banco

| Tela | O que dá para fazer |
|---|---|
| Login | Entrar e sair. A senha é conferida no banco e fica salva criptografada. |
| Pacientes | Cadastrar, pesquisar, ver a ficha, editar, inativar e reativar. |
| Usuários do Sistema | Criar contas para a equipe, ativar e desativar (menu do usuário, no canto de cima). |
| Visão Geral | Mostra os totais e os aniversariantes, lidos do banco. |

As outras telas do menu (Agendamento, Planos, Financeiro etc.) não fazem parte desta entrega e mostram um aviso.

## O que precisa ter instalado

- Windows 10 ou 11
- [Node.js](https://nodejs.org) (versão LTS)
- [PostgreSQL 16 ou 17](https://www.postgresql.org/download/windows/) (não precisa lembrar a senha que foi criada na instalação)
- Internet na primeira vez que abrir

## Como usar

1. Abra o **INICIAR.bat** (dois cliques). Na primeira vez demora uns 2 minutos, porque ele cria o banco.
2. Ele abre o navegador em http://localhost:3000 e mostra na janela o **e-mail e a senha** para entrar.
3. Para ver os dados direto no banco, abra o **VER_BANCO.bat**.
4. Para fechar tudo, abra o **PARAR.bat**. Os dados continuam salvos.

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

Com o sistema aberto, rode o **TESTAR.bat**. Ele faz:

- testes das regras de cadastro (CPF, e-mail, senha, campos obrigatórios);
- testes que cadastram, editam e inativam e depois conferem no banco;
- o passo a passo completo no Google Chrome e no Microsoft Edge (abre as janelas sozinho).

As capturas de tela dos testes estão em `docs/evidencias`.

## Pastas

```
db/         criação das tabelas do banco
public/     telas (HTML, CSS e JavaScript)
server/     servidor que recebe os dados das telas e grava no banco
scripts/    scripts usados pelos arquivos .bat
tests/      testes automáticos
docs/       capturas de tela dos testes
```

## Ferramentas que usamos

| Para quê | Ferramenta | Link |
|---|---|---|
| Organização das tarefas | Trello | (adicionar link) |
| Protótipo das telas | Figma | (adicionar link) |
| Código | GitHub | (adicionar link) |
| Banco de dados | PostgreSQL 17 | https://www.postgresql.org |
| Ver e consultar o banco | pgAdmin 4 | https://www.pgadmin.org |
| Servidor | Node.js com a biblioteca `pg` | https://nodejs.org |
| Testes no navegador | Playwright | https://playwright.dev |
| Controle de versão | Git | https://git-scm.com |
