"""接上一次：已 build，只装 systemd 并启动。"""

from __future__ import annotations

import os
import sys
import time

import paramiko

HOST = "192.168.10.104"
USER = "ztmer"
REMOTE = "/home/ztmer/apps/diannaodian"

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


def show(text: str) -> None:
    text = text.replace(os.environ.get("SHOP_SSH_PASS", ""), "***")
    sys.stdout.buffer.write(text.encode("utf-8", "replace")[:4000] + b"\n")
    sys.stdout.buffer.flush()


def run(client, cmd, timeout=120):
    show(">> " + cmd[:200])
    _, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode("utf-8", "replace")
    err = stderr.read().decode("utf-8", "replace")
    code = stdout.channel.recv_exit_status()
    text = (out + err).strip()
    if text:
        show(text[-4000:])
    if code != 0:
        raise RuntimeError(f"exit {code}: {cmd}\n{text}")
    return text


def sudo(client, cmd, password, timeout=60):
    show(">> sudo " + cmd[:180])
    stdin, stdout, stderr = client.exec_command(f"sudo -S -p '' {cmd}", timeout=timeout, get_pty=True)
    stdin.write(password + "\n")
    stdin.flush()
    out = stdout.read().decode("utf-8", "replace")
    err = stderr.read().decode("utf-8", "replace")
    code = stdout.channel.recv_exit_status()
    text = (out + err).strip()
    if text:
        show(text[-4000:])
    if code != 0:
        raise RuntimeError(f"sudo exit {code}: {cmd}\n{text}")
    return text


def main():
    password = os.environ["SHOP_SSH_PASS"]
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=password, timeout=20)
    run(client, f"test -d {REMOTE}/.next && echo BUILD_OK")
    sftp = client.open_sftp()
    with sftp.file("/tmp/diannaodian.service", "w") as f:
        f.write(UNIT)
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
    show("OK http://192.168.10.104:3010")


if __name__ == "__main__":
    main()
