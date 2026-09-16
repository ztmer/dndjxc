"""局域网部署。密码从环境变量 SHOP_SSH_PASS 读取。"""

from __future__ import annotations

import io
import os
import secrets
import tarfile
import time
from pathlib import Path

import paramiko

HOST = "192.168.10.104"
USER = "ztmer"
REMOTE = "/home/ztmer/apps/diannaodian"
ROOT = Path(__file__).resolve().parents[1]
SKIP_DIRS = {".git", "node_modules", ".next", ".cursor"}
SKIP_FILES = {"_ssh_probe.py", "_lan_deploy.py"}

UNIT = f"""[Unit]
Description=Diannaodian shop system
After=network.target

[Service]
Type=simple
User=ztmer
WorkingDirectory={REMOTE}
Environment=NODE_ENV=production
EnvironmentFile={REMOTE}/.env
ExecStart=/usr/bin/npm run start
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
"""


def pack() -> bytes:
    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode="w:gz") as tar:
        for dirpath, dirnames, filenames in os.walk(ROOT):
            dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
            rel_dir = Path(dirpath).relative_to(ROOT)
            if any(p in SKIP_DIRS for p in rel_dir.parts):
                continue
            for name in filenames:
                if name in SKIP_FILES:
                    continue
                full = Path(dirpath) / name
                arc = str(full.relative_to(ROOT)).replace("\\", "/")
                tar.add(full, arcname=arc)
    return buf.getvalue()


def run(client: paramiko.SSHClient, cmd: str, timeout: int = 120) -> str:
    print(">>", cmd[:200])
    _, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode("utf-8", "replace")
    err = stderr.read().decode("utf-8", "replace")
    code = stdout.channel.recv_exit_status()
    text = (out + err).strip()
    if text:
        print(text[-5000:].encode("utf-8", "replace").decode("ascii", "replace"))
    if code != 0:
        raise RuntimeError(f"exit {code}: {cmd}\n{text}")
    return text


def sudo(client: paramiko.SSHClient, cmd: str, password: str, timeout: int = 60) -> str:
    wrapped = f"sudo -S -p '' {cmd}"
    print(">> sudo", cmd[:180])
    stdin, stdout, stderr = client.exec_command(wrapped, timeout=timeout, get_pty=True)
    stdin.write(password + "\n")
    stdin.flush()
    out = stdout.read().decode("utf-8", "replace")
    err = stderr.read().decode("utf-8", "replace")
    code = stdout.channel.recv_exit_status()
    text = (out + err).strip()
    if text:
        print(text[-4000:])
    if code != 0:
        raise RuntimeError(f"sudo exit {code}: {cmd}\n{text}")
    return text


def main() -> None:
    password = os.environ["SHOP_SSH_PASS"]
    print("packing…")
    blob = pack()
    print("pack bytes", len(blob))
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=password, timeout=20)
    sftp = client.open_sftp()
    run(client, "mkdir -p /home/ztmer/apps /tmp")
    print("uploading tarball…")
    with sftp.file("/tmp/diannaodian-web.tgz", "wb") as f:
        f.write(blob)
    with sftp.file("/tmp/diannaodian.service", "w") as f:
        f.write(UNIT)
    secret = secrets.token_hex(32)
    env = f'DATABASE_URL="file:./prisma/dev.db"\nAUTH_SECRET="{secret}"\nNODE_ENV=production\n'
    run(client, f"mkdir -p {REMOTE} && tar -xzf /tmp/diannaodian-web.tgz -C {REMOTE}")
    with sftp.file(f"{REMOTE}/.env", "w") as f:
        f.write(env)
    print("npm install…")
    run(client, f"cd {REMOTE} && npm install", timeout=700)
    run(client, f"cd {REMOTE} && npx prisma db push", timeout=180)
    print("production build…")
    run(client, f"cd {REMOTE} && npx prisma generate && npx next build --webpack", timeout=800)
    sudo(client, "cp /tmp/diannaodian.service /etc/systemd/system/diannaodian.service", password)
    sudo(client, "systemctl daemon-reload", password)
    sudo(client, "systemctl enable --now diannaodian.service", password)
    time.sleep(2)
    sudo(client, "systemctl --no-pager --full status diannaodian.service", password)
    ufw = sudo(client, "ufw status", password)
    if "Status: active" in ufw:
        sudo(client, "ufw allow 3010/tcp comment diannaodian", password)
    run(client, "ss -lnt | grep 3010 || true")
    run(client, "curl -sI -o /dev/null -w '%{http_code}\\n' http://127.0.0.1:3010/login || true")
    sftp.close()
    client.close()
    print("OK http://192.168.10.104:3010")


if __name__ == "__main__":
    main()
