"""在 192.168.10.104 开通 nginx HTTPS（自签证书，SAN=IP）。密码读 SHOP_SSH_PASS。"""

from __future__ import annotations

import os
import sys
from pathlib import Path

import paramiko

HOST = "192.168.10.104"
USER = "ztmer"
REMOTE = "/home/ztmer/apps/diannaodian"
ROOT = Path(__file__).resolve().parents[1]


def show(text: str) -> None:
    pw = os.environ.get("SHOP_SSH_PASS", "")
    if pw:
        text = text.replace(pw, "***")
    sys.stdout.buffer.write((text or "").encode("utf-8", "replace")[:12000] + b"\n")
    sys.stdout.buffer.flush()


def run(client, cmd: str, timeout: int = 120, check: bool = True) -> str:
    show(">> " + cmd[:200])
    _, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode("utf-8", "replace")
    err = stderr.read().decode("utf-8", "replace")
    code = stdout.channel.recv_exit_status()
    text = (out + err).strip()
    if text:
        show(text[-8000:])
    if check and code != 0:
        raise RuntimeError(f"exit {code}: {cmd}")
    return text


def sudo(client, cmd: str, password: str, timeout: int = 60, check: bool = True) -> str:
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
    if check and code != 0:
        raise RuntimeError(f"sudo exit {code}: {cmd}")
    return text


def main() -> None:
    password = os.environ["SHOP_SSH_PASS"]
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=password, timeout=20)
    sftp = client.open_sftp()
    sftp.put(str(ROOT / "deploy" / "nginx-diannaodian.conf"), "/tmp/nginx-diannaodian.conf")
    sftp.put(str(ROOT / "deploy" / "openssl-lan.cnf"), "/tmp/openssl-lan.cnf")
    sftp.close()

    # 机器上若有未签名的第三方源（如 Cursor），整次 apt update 会失败，忽略后继续装 nginx
    sudo(client, "apt-get update -qq", password, timeout=180, check=False)
    sudo(client, "DEBIAN_FRONTEND=noninteractive apt-get install -y nginx openssl", password, timeout=300)
    sudo(client, "mkdir -p /etc/ssl/diannaodian /etc/nginx/sites-available", password)
    sudo(client, "cp /tmp/openssl-lan.cnf /etc/ssl/diannaodian/openssl-lan.cnf", password)
    sudo(client, "cp /tmp/nginx-diannaodian.conf /etc/nginx/sites-available/diannaodian", password)
    # 已有证书则保留，避免店员已经点过「继续访问」后又要重新信任
    sudo(
        client,
        "bash -lc 'test -f /etc/ssl/diannaodian/cert.pem || openssl req -x509 -newkey rsa:2048 -days 3650 -nodes "
        "-keyout /etc/ssl/diannaodian/key.pem -out /etc/ssl/diannaodian/cert.pem "
        "-config /etc/ssl/diannaodian/openssl-lan.cnf'",
        password,
    )
    sudo(client, "chmod 640 /etc/ssl/diannaodian/key.pem", password)
    sudo(client, "chown root:www-data /etc/ssl/diannaodian/key.pem", password, check=False)
    sudo(client, "rm -f /etc/nginx/sites-enabled/default", password, check=False)
    sudo(client, "ln -sfn /etc/nginx/sites-available/diannaodian /etc/nginx/sites-enabled/diannaodian", password)
    sudo(client, "nginx -t", password)
    sudo(client, "systemctl enable nginx", password)
    sudo(client, "systemctl restart nginx", password)
    sudo(client, "ufw allow 80/tcp comment http-redirect", password, check=False)
    sudo(client, "ufw allow 443/tcp comment https-shop", password, check=False)
    run(client, "curl -skI -o /dev/null -w '%{http_code}\\n' https://127.0.0.1/login")
    run(client, "curl -sI -o /dev/null -w '%{http_code}\\n' http://127.0.0.1/login")
    run(client, "ss -lnt | grep -E ':80|:443|:3010' || true", check=False)
    client.close()
    show("OK https://192.168.10.104  （首次请在浏览器选继续访问）")


if __name__ == "__main__":
    main()
