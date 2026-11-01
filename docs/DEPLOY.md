# Deploy com domínio próprio (Namecheap)

Este guia leva o projeto do seu computador até `https://seudominio.com`, com HTTPS automático.

## 1. Onde hospedar?

O projeto não é só um site estático: o backend usa **um arquivo SQLite**, **grava imagens enviadas em disco** e guarda
contadores em memória. Isso pede uma máquina "de verdade" com disco persistente.

| Opção | Serve? | Observação |
| --- | --- | --- |
| **VPS + Docker Compose + Caddy** (este guia) | **Sim, recomendada** | Tudo funciona como foi testado. ~US$ 4–6/mês. Você administra o servidor, mas o guia cobre o essencial. |
| **Vercel** (só o frontend) | Parcial | Ótima para o site estático, mas o **backend não roda lá**: funções da Vercel têm sistema de arquivos somente leitura (exceto `/tmp`) e instâncias efêmeras, o que inviabiliza SQLite e uploads. Você teria de hospedar o backend em outro lugar e alterar o código (URLs de upload, IP do visitante). Não compensa para um portfólio. |
| **PaaS com volume** (Fly.io, Railway, Render) | Sim | Mais simples de operar que um VPS, porém mais caro e exige confirmar que o plano inclui disco persistente. |

> Os preços mudam com frequência: confira na página do provedor antes de contratar.

## 2. Passo a passo (VPS)

### 2.1 Criar o servidor

1. Contrate um VPS com **Ubuntu 24.04**, pelo menos 2 GB de RAM (ex.: Hetzner, DigitalOcean, Vultr).
2. Anote o **endereço IPv4** público.
3. Cadastre sua chave SSH ao criar (recomendado) e conecte: `ssh root@IP_DO_SERVIDOR`.

### 2.2 Apontar o domínio da Namecheap para o servidor

1. Entre na Namecheap → **Domain List** → **Manage** ao lado do domínio → aba **Advanced DNS**.
2. Confirme que o domínio usa **Namecheap BasicDNS** (aba *Domain* → *Nameservers*). Com nameservers de terceiros,
   os registros devem ser criados lá.
3. Em **Host Records**, **apague** registros que conflitem (o *URL Redirect Record* / *parking page* padrão) e crie:

   | Type | Host | Value | TTL |
   | --- | --- | --- | --- |
   | A Record | `@` | `IP_DO_SERVIDOR` | Automatic |
   | A Record | `www` | `IP_DO_SERVIDOR` | Automatic |

4. Salve (✓ verde). A Namecheap informa que costuma levar cerca de 30 minutos; pode demorar mais.
5. Confira de qualquer computador: `nslookup seudominio.com` deve mostrar o IP do servidor.

### 2.3 Preparar o servidor

```bash
# Crie um usuário comum (não rode o app como root) e libere SSH
adduser deploy && usermod -aG sudo deploy
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy      # reaproveita sua chave SSH

# Firewall: SSH, HTTP e HTTPS (80 é necessária para o Let's Encrypt emitir o certificado)
ufw allow OpenSSH && ufw allow 80 && ufw allow 443 && ufw --force enable

# Docker (script oficial)
curl -fsSL https://get.docker.com | sh
usermod -aG docker deploy
```

Saia e entre de novo como `deploy`: `ssh deploy@IP_DO_SERVIDOR`.

### 2.4 Enviar o projeto

Do **seu computador**, na pasta que contém `portfolio/`:

```bash
scp -r portfolio deploy@IP_DO_SERVIDOR:~/
```

Antes, apague `frontend/node_modules` e `backend/.venv` se existirem (são pesados e o Docker não os usa). Se o projeto
estiver num repositório Git, também pode usar `git clone` no servidor.

### 2.5 Configurar o `.env`

No servidor:

```bash
cd ~/portfolio
cp .env.example .env
python3 -c "import secrets; print(secrets.token_urlsafe(48))"    # copie para SECRET_KEY
nano .env
```

Preencha (troque `seudominio.com`):

```ini
SECRET_KEY=<o valor gerado acima>
ADMIN_PASSWORD=<uma senha forte, 12+ caracteres>
DOMAIN=seudominio.com
ALLOWED_HOSTS=seudominio.com,www.seudominio.com
CORS_ORIGINS=https://seudominio.com
COOKIE_SECURE=true
ANALYTICS_TIMEZONE=America/Sao_Paulo
# Opcional, para o botão "Translate" do admin:
ANTHROPIC_API_KEY=sk-ant-...
```

**Não** coloque aspas, espaços ao redor do `=` nem comentários na mesma linha dos valores. Mantenha
`SEED_DEMO_DATA=true` na primeira subida: ele cria o perfil e os projetos de exemplo, que você **edita ou apaga pelo
painel** em `/admin` (o editor de perfil precisa que o perfil exista).

### 2.6 Subir

```bash
docker compose --profile prod up -d --build
docker compose --profile prod ps          # backend e frontend "healthy", caddy "running"
```

O Caddy emite o certificado sozinho na primeira visita (leva alguns segundos). Acompanhe com
`docker compose --profile prod logs -f caddy`.

### 2.7 Conferir

- `https://seudominio.com` abre o site (e `www.` redireciona para o domínio sem `www`).
- `https://seudominio.com/admin` → entre com `admin` e a senha do `.env`.
- No admin: edite **Profile** e **Projects**, apague os exemplos e confira **Analytics**.
- Currículo: em *Profile → Résumé link* cole o link do seu PDF; o botão aparece na página *Profile* (veja a seção 4).

## 3. Rotina

```bash
# Atualizar depois de mudar o código
cd ~/portfolio && docker compose --profile prod up -d --build

# Logs
docker compose --profile prod logs -f backend

# Backup do banco e das imagens enviadas (rode no servidor; guarde o .tgz FORA dele)
docker volume ls | grep portfolio-data           # confirme o nome do volume
docker run --rm -v portfolio_portfolio-data:/data -v "$PWD":/backup alpine \
  tar czf /backup/portfolio-data-$(date +%F).tgz -C /data .
```

Ative os backups automáticos/snapshots do provedor também. **Sem backup, perder o servidor é perder o conteúdo
cadastrado no admin.**

## 4. Tradução com Claude e estatísticas em produção

- **Tradução:** crie uma chave em <https://console.anthropic.com> e coloque em `ANTHROPIC_API_KEY`. O uso é cobrado
  por chamada na conta da API (separada de qualquer plano do Claude.ai); traduzir um perfil costuma custar centavos.
  Para economizar, defina `TRANSLATION_MODEL=claude-haiku-5-5`. Sem chave o botão fica desativado e
  "Copy without translating" continua funcionando.
- **Estatísticas:** não usam cookies e não guardam o IP. Visitas de bots, de quem ativou "Do Not Track" e do navegador
  em que você entrou no `/admin` **não são contadas** (por isso, ao testar, abra o site numa janela onde você não esteja
  logado, ou desmarque a opção na página Analytics).
- **Países:** o painel só mostra países se algo na frente do site enviar o cabeçalho `CF-IPCountry` (ex.: Cloudflare).
  Sem isso, o quadro fica vazio e o resto funciona normalmente.

> **Cuidado ao usar o proxy da Cloudflare ("nuvem laranja"):** o servidor passaria a enxergar os IPs da Cloudflare, e o
> limite de requisições e a contagem de visitantes (que dependem do IP real) perderiam precisão. Para usá-lo, configure o
> Caddy com `trusted_proxies` e `client_ip_headers CF-Connecting-IP` (veja a documentação do Caddy). Essa combinação
> **não foi testada** aqui; sem ela, deixe o registro DNS-only.

## 4.1 Currículo (PDF)

O site **não gera** o currículo: ele só aponta para o PDF que você escolher, no campo **Profile → Résumé link** do
admin. Se o campo estiver vazio, o botão não aparece. Onde hospedar o arquivo:

| Onde | Link para colar | Observação |
| --- | --- | --- |
| **No próprio site** (recomendado) | `/curriculo.pdf` | Coloque o arquivo em `frontend/public/curriculo.pdf` e faça o deploy (`docker compose --profile prod up -d --build`). Sem terceiros. Atenção ao nome: no Windows, com extensões ocultas, `curriculo.pdf` vira `curriculo.pdf.pdf`; confira com `git ls-files frontend/public`. Atenção: se o repositório for público, o PDF e os dados pessoais dele também ficam públicos. |
| Google Drive / Dropbox | o link de compartilhamento ("qualquer pessoa com o link") | Simples; depende de um terceiro. |

Para trocar o PDF no próprio site, substitua o arquivo e faça o deploy de novo (os navegadores podem manter o antigo em
cache por um tempo: renomeie, por exemplo `curriculo-2026.pdf`, e atualize o link no admin).

## 5. Problemas comuns

| Sintoma | Causa provável |
| --- | --- |
| Navegador mostra erro de certificado / Caddy repete erros de ACME | DNS ainda não propagou, ou as portas 80/443 estão bloqueadas (firewall do provedor/`ufw`). Veja `logs caddy`. |
| `400 Invalid host header` | O domínio não está em `ALLOWED_HOSTS`. |
| Login do admin "funciona" mas volta para a tela de login | `COOKIE_SECURE=true` sem HTTPS (acesso por `http://` ou IP). Acesse pelo domínio com `https://`. |
| `docker compose` reclama de `SECRET_KEY`/`ADMIN_PASSWORD` | O `.env` não está na mesma pasta do `docker-compose.yml`, está com outro nome (ex.: `.env.txt`) ou com valores vazios. |
| Muitos "429 Too Many Requests" no login | Limite de 5 tentativas/minuto por IP: aguarde 1 minuto. |
| Botão "Translate" desativado | `ANTHROPIC_API_KEY` ausente (reinicie com `docker compose --profile prod up -d`). |
