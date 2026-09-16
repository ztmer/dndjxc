from __future__ import annotations

import os
import sys
import time
from pathlib import Path

import paramiko

HOST = "192.168.10.104"
USER = "ztmer"
PW = os.environ["SHOP_SSH_PASS"]
REMOTE = "/home/ztmer/apps/diannaodian"
ROOT = Path(__file__).resolve().parents[1]
FILES = [
    "src/lib/money.ts",
    "src/app/catalog/page.tsx",
    "package.json",
]


def show(text: str) -> None:
    text = (text or "").replace(PW, "***")
    sys.stdout.buffer.write(text.encode("utf-8", "replace")[:12000] + b"\n")
    sys.stdout.buffer.flush()


def run(client, cmd, timeout=120, check=True):
    _, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode("utf-8", "replace")
    err = stderr.read().decode("utf-8", "replace")
    code = stdout.channel.recv_exit_status()
    text = (out + err).strip()
    show(f"$ {cmd[:200]}\nexit {code}\n{text[-8000:]}")
    if check and code != 0:
        raise RuntimeError(f"exit {code}: {cmd}")
    return code, text


def sudo(client, cmd, timeout=60, check=True):
    stdin, stdout, stderr = client.exec_command(f"sudo -S -p '' {cmd}", timeout=timeout, get_pty=True)
    stdin.write(PW + "\n")
    stdin.flush()
    out = stdout.read().decode("utf-8", "replace")
    err = stderr.read().decode("utf-8", "replace")
    code = stdout.channel.recv_exit_status()
    text = (out + err).strip()
    show(f"$ sudo {cmd[:180]}\nexit {code}\n{text[-4000:]}")
    if check and code != 0:
        raise RuntimeError(f"sudo exit {code}: {cmd}")
    return code, text


client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PW, timeout=20)
sftp = client.open_sftp()
for rel in FILES:
    local = ROOT / rel
    remote = f"{REMOTE}/{rel}"
    show(f"put {rel}")
    sftp.put(str(local), remote)
sftp.close()

sudo(client, "systemctl stop diannaodian.service", check=False)
show("webpack production build…")
run(
    client,
    f"cd {REMOTE} && npx prisma generate && npx next build --webpack",
    timeout=800,
)
run(
    client,
    f"test -f {REMOTE}/.next/BUILD_ID && test -f {REMOTE}/.next/routes-manifest.json && echo MANIFESTS_OK",
)
sudo(client, "systemctl reset-failed diannaodian.service", check=False)
sudo(client, "systemctl start diannaodian.service")
time.sleep(4)
sudo(client, "systemctl is-active diannaodian.service", check=False)
run(client, "ss -lnt | grep 3010 || true", check=False)
run(client, "curl -sI http://127.0.0.1:3010/login | head -20", check=False)
sudo(client, "journalctl -u diannaodian -n 18 --no-pager", check=False)
client.close()
