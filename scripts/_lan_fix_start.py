from __future__ import annotations

import os
import sys
import time

import paramiko

HOST = "192.168.10.104"
USER = "ztmer"
PW = os.environ["SHOP_SSH_PASS"]
REMOTE = "/home/ztmer/apps/diannaodian"


def show(text: str) -> None:
    text = (text or "").replace(PW, "***")
    sys.stdout.buffer.write(text.encode("utf-8", "replace")[:10000] + b"\n")
    sys.stdout.buffer.flush()


def run(client, cmd, timeout=120, check=True):
    _, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode("utf-8", "replace")
    err = stderr.read().decode("utf-8", "replace")
    code = stdout.channel.recv_exit_status()
    text = (out + err).strip()
    show(f"$ {cmd[:180]}\nexit {code}\n{text[-7000:]}")
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
    show(f"$ sudo {cmd[:180]}\nexit {code}\n{text[-5000:]}")
    if check and code != 0:
        raise RuntimeError(f"sudo exit {code}: {cmd}")
    return code, text


client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PW, timeout=20)

run(
    client,
    f"ls {REMOTE}/.next; echo '---server---'; ls {REMOTE}/.next/server | head -40; "
    f"echo '---db---'; ls -la {REMOTE}/prisma; "
    f"test -f {REMOTE}/.next/routes-manifest.json && echo HAS_ROUTES || echo NO_ROUTES; "
    f"test -f {REMOTE}/.next/build/BUILD_ID && echo HAS_NESTED_ID || echo NO_NESTED_ID",
)

# Next 16 turbopack 生产构建可能不写 .next/BUILD_ID，next start 会直接退出
run(
    client,
    f"if [ ! -f {REMOTE}/.next/BUILD_ID ]; then "
    f"date +%s | sha256sum | cut -c1-21 > {REMOTE}/.next/BUILD_ID; fi; "
    f"cat {REMOTE}/.next/BUILD_ID",
)

sudo(client, "systemctl stop diannaodian.service", check=False)
time.sleep(1)
sudo(client, "systemctl reset-failed diannaodian.service", check=False)
sudo(client, "systemctl start diannaodian.service")
time.sleep(3)
sudo(client, "systemctl is-active diannaodian.service", check=False)
run(client, "ss -lnt | grep 3010 || true", check=False)
run(client, "curl -sI http://127.0.0.1:3010/login | head -20", check=False)
sudo(client, "journalctl -u diannaodian -n 25 --no-pager", check=False)

client.close()
