#!/usr/bin/env python3
"""Run over SSH: preview is entirely read-only; apply requires its review hash."""
import datetime
import difflib
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys

SERVICE = 'umsa-sitrep-ingress.service'
MAIN = Path('/srv/umsa-migration/sitrep-public-ingress/40607817805-1/nginx.conf')
CONF = Path('/srv/umsa-public-vhosts/ultimamilla.com.ar.conf')
ROOT = Path('/opt/vetcole')
NGINX = '/usr/sbin/nginx'


def run(*args):
    return subprocess.check_output(args, text=True).strip()


def require(condition, message):
    if not condition:
        raise RuntimeError(message)


def proposal(original, port):
    # Deliberately strict: a changed server layout requires a fresh diagnosis.
    anchor = re.compile(
        r'^server \{\n[ \t]+listen 179\.198\.115\.115:443 ssl http2;\n'
        r'[ \t]+server_name www\.ultimamilla\.com\.ar;[ \t]*\n', re.M)
    matches = list(anchor.finditer(original))
    require(len(matches) == 1, 'No hay un único bloque HTTPS esperado para www; revisar manualmente.')
    block = '''    # VETCOLE-BEGIN
    location = /casos/vetcole { return 301 /casos/vetcole/; }
    location ^~ /casos/vetcole/ {
        proxy_pass http://127.0.0.1:PORT;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
        client_max_body_size 2m;
    }
    # VETCOLE-END
'''.replace('PORT', str(port))
    position = matches[0].end()
    if 'casos/vetcole' in original or 'VETCOLE-' in original:
        require(original[position:position + len(block)] == block,
                'Ya existe una configuración Vetcole diferente; no se reemplaza.')
        remainder = original[:position] + original[position + len(block):]
        require('casos/vetcole' not in remainder and 'VETCOLE-' not in remainder,
                'Hay rutas Vetcole adicionales; revisar manualmente.')
        return original
    return original[:position] + block + original[position:]


def inspect_runtime():
    require(run('systemctl', 'is-active', SERVICE) == 'active', 'El servicio público no está activo.')
    pid = run('systemctl', 'show', SERVICE, '--property=MainPID', '--value')
    require(pid.isdigit() and int(pid) > 1, 'PID de nginx no válido.')
    process = Path('/proc') / pid
    require(os.path.realpath(str(process / 'exe')) == NGINX, 'El proceso público no es el nginx esperado.')
    command = (process / 'cmdline').read_bytes().replace(b'\0', b' ').decode()
    require('nginx: master process ' in command and ' -c ' + str(MAIN) + ' ' in command,
            'Cambió la configuración principal del nginx activo.')
    reload_command = run('systemctl', 'show', SERVICE, '--property=ExecReload', '--value')
    require('argv[]=/bin/kill -HUP $MAINPID ;' in reload_command,
            'ExecReload ya no es la recarga HUP esperada; revisar manualmente.')
    main = MAIN.read_bytes()
    require(re.search(rb'^\s*include /srv/umsa-public-vhosts/\*\.conf;', main, re.M),
            'La configuración activa ya no incluye los vhosts públicos esperados.')
    require(CONF.is_file() and not CONF.is_symlink(), 'El vhost no es un archivo regular directo.')
    return main


def apply_change(original, proposed, main, port):
    require((ROOT / '.vetcole').is_file(), 'Primero debe existir la app identificada en /opt/vetcole.')
    owner = run('docker', 'inspect', '--format', '{{index .Config.Labels "com.docker.compose.project"}}', 'vetcole')
    require(owner == 'vetcole', 'El contenedor vetcole no pertenece al proyecto esperado.')
    health = json.loads(run('curl', '--noproxy', '*', '--fail', '--silent', '--show-error',
                            '--max-time', '10', f'http://127.0.0.1:{port}/casos/vetcole/api/v1/health'))
    require(health.get('success') is True and health.get('data', {}).get('base') == '/casos/vetcole',
            'La API Vetcole no está saludable o usa otro prefijo.')
    # Baseline validation BEFORE touching the configuration. Never use nginx.service.
    subprocess.run([NGINX, '-t', '-c', str(MAIN)], check=True)
    require(inspect_runtime() == main and CONF.read_bytes() == original,
            'La configuración cambió durante la revisión; generar otro diff.')
    backups = ROOT / 'nginx-backups'
    backups.mkdir(mode=0o700, exist_ok=True)
    stamp = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%S.%fZ')
    backup = backups / ('ultimamilla.com.ar.conf.bak-vetcole-' + stamp)
    shutil.copy2(CONF, backup)
    require(backup.read_bytes() == original and CONF.read_bytes() == original,
            'El respaldo o la configuración cambiaron; abortado sin aplicar.')
    print('Respaldo:', backup, flush=True)
    reload_attempted = False
    try:
        # Preserve the existing file's ownership, permissions and SELinux context.
        CONF.write_bytes(proposed)
        subprocess.run([NGINX, '-t', '-c', str(MAIN)], check=True)
        reload_attempted = True
        subprocess.run(['systemctl', 'reload', SERVICE], check=True)
        require(run('systemctl', 'is-active', SERVICE) == 'active', 'El servicio no quedó activo.')
    except BaseException:
        CONF.write_bytes(original)
        subprocess.run([NGINX, '-t', '-c', str(MAIN)], check=True)
        if reload_attempted:
            subprocess.run(['systemctl', 'reload', SERVICE], check=True)
        print('Se restauró el respaldo; se requiere diagnóstico antes de reintentar.', file=sys.stderr)
        raise
    print('Configuración validada y recargada mediante HUP; no se reinició ningún servicio.')


def main():
    require(len(sys.argv) in (3, 4), 'Uso: nginx_proxy.py PUERTO preview|apply [SHA256]')
    port = int(sys.argv[1])
    require(1024 <= port <= 65535, 'Puerto fuera de rango.')
    mode = sys.argv[2]
    require(mode in ('preview', 'apply'), 'Modo inválido.')
    approved = sys.argv[3] if len(sys.argv) == 4 else ''
    require(mode != 'apply' or re.fullmatch(r'[a-f0-9]{64}', approved), 'Falta el SHA256 del diff aprobado.')
    main_config = inspect_runtime()
    original = CONF.read_bytes()
    proposed = proposal(original.decode(), port).encode()
    require(proposed != original, 'Vetcole ya tiene exactamente esta configuración; no hay cambios.')
    digest = hashlib.sha256(main_config + b'\0' + original + b'\0' + proposed).hexdigest()
    print('Servicio:', SERVICE)
    print('Configuración principal:', MAIN)
    print('SHA256 de revisión:', digest)
    print(''.join(difflib.unified_diff(original.decode().splitlines(True), proposed.decode().splitlines(True),
                                     fromfile=str(CONF), tofile=str(CONF) + ' (propuesta)')), end='')
    if mode == 'preview':
        print('SIMULACIÓN: solo lectura; no se crearon archivos ni se recargaron servicios en el VPS.')
        print('Tras aprobación explícita: deploy.sh proxy --aplicar ' + digest)
        return
    require(approved == digest, 'La propuesta cambió desde su aprobación; generar y revisar un nuevo diff.')
    apply_change(original, proposed, main_config, port)


if __name__ == '__main__':
    try:
        main()
    except Exception as exc:
        sys.exit('ABORTO: ' + str(exc))
