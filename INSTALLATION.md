# Homelable — Installation

## Quick Start — Docker

```bash
curl -fsSL https://raw.githubusercontent.com/Pouzor/homelable/main/install.sh | bash
cd homelable && docker compose up -d
```

Open **http://localhost:3000** — login with `admin` / `admin`.

> Change the password before exposing to a network: edit `.env` and update `AUTH_USERNAME` / `AUTH_PASSWORD_HASH`.
>
> Generate a new hash: `docker compose exec backend python -c "from passlib.context import CryptContext; print(CryptContext(schemes=['bcrypt']).hash('yourpassword'))"`
>
> ⚠️ **bcrypt hashes contain `$` characters** — how to handle them depends on where you set the value:
> - **`.env` file** (recommended): wrap the hash in single quotes → `AUTH_PASSWORD_HASH='$2b$12$...'`
> - **`docker-compose.yml` `environment:` block**: escape every `$` as `$$` — use this command to generate a pre-escaped hash:
>   ```bash
>   docker compose exec backend python -c "from passlib.context import CryptContext; print(CryptContext(schemes=['bcrypt']).hash('yourpassword').replace('\$', '\$\$'))"
>   ```

## Quick Start — Frontend only

```bash
curl -fsSL https://raw.githubusercontent.com/Pouzor/homelable/main/install.sh | bash -s -- --standalone
cd homelable && docker compose up -d
```

## Update (Docker)

Re-run the install script — it detects an existing install and only updates `docker-compose.yml`:

```bash
curl -fsSL https://raw.githubusercontent.com/Pouzor/homelable/main/install.sh | bash
cd homelable && docker compose pull && docker compose up -d
```

## Build from source

```bash
git clone https://github.com/Pouzor/homelable.git
cd homelable
cp .env.example .env
docker compose up -d
```

---

## Proxmox LXC Install

Run this **on the Proxmox host** — it creates a Debian 12 LXC container and installs Homelable inside automatically:

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/Pouzor/homelable/main/scripts/install-proxmox.sh)
```

Default container settings: 2 cores, 1 GB RAM, 8 GB disk, DHCP on `vmbr0`. Override before running:

```bash
CTID=150 RAM=2048 STORAGE=local-zfs bash <(curl -fsSL .../install-proxmox.sh)
```

The backend runs as a systemd service, the frontend is served via nginx on port 80.

> To install manually inside an existing Debian/Ubuntu machine or LXC:
> ```bash
> bash <(curl -fsSL https://raw.githubusercontent.com/Pouzor/homelable/main/scripts/lxc-install.sh)
> ```

### Update (LXC)

Run the update script inside the container (pulls latest code, rebuilds frontend, restarts services — `.env` and database are never touched):

```bash
sudo bash /opt/homelable/scripts/update.sh
```

Or directly from GitHub:

```bash
sudo bash <(curl -fsSL https://raw.githubusercontent.com/Pouzor/homelable/main/scripts/update.sh)
```

---

## Configuration

All configuration is done via `.env` (copied from `.env.example`):

```env
SECRET_KEY=change_me_in_production

# Auth — default: admin / admin
AUTH_USERNAME=admin
AUTH_PASSWORD_HASH='$2b$12$...'   # bcrypt hash — keep single quotes

# CIDR ranges to scan
SCANNER_RANGES=["192.168.1.0/24"]

# How often to check node status (seconds)
STATUS_CHECKER_INTERVAL=60
```

All settings are also editable in-app via the **Scan Network** button.

---

## Development Mode

**Backend (Python 3.13):**
```bash
cd backend
python3.13 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp ../.env.example .env       # edit SECRET_KEY and review defaults
uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev   # http://localhost:5173
```
