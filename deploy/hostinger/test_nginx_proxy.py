"""Local tests only: all service, nginx, Docker and HTTP calls are mocked."""
import contextlib
import io
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

import nginx_proxy as proxy

ORIGINAL = '''server {
    listen 179.198.115.115:80;
    server_name ultimamilla.com.ar www.ultimamilla.com.ar;
    location / { return 301 https://www.ultimamilla.com.ar$request_uri; }
}
server {
    listen 179.198.115.115:443 ssl http2;
    server_name www.ultimamilla.com.ar;
    location ^~ /dge/ { proxy_pass http://127.0.0.1:18191; }
    location / { proxy_pass http://127.0.0.1:4322; }
}
server {
    listen 179.198.115.115:443 ssl http2;
    server_name sitrep.ultimamilla.com.ar;
    location / { proxy_pass http://127.0.0.1:3002; }
}
'''


class ProxyTests(unittest.TestCase):
    def test_only_inserts_into_www_https_preserving_every_existing_byte(self):
        result = proxy.proposal(ORIGINAL, 4310)
        start = result.index('    # VETCOLE-BEGIN\n')
        end = result.index('    # VETCOLE-END\n') + len('    # VETCOLE-END\n')
        self.assertEqual(result[:start] + result[end:], ORIGINAL)
        self.assertIn('server_name www.ultimamilla.com.ar;\n    # VETCOLE-BEGIN', result)
        self.assertIn('proxy_pass http://127.0.0.1:4310;', result)
        self.assertEqual(proxy.proposal(result, 4310), result)
        with self.assertRaises(RuntimeError):
            proxy.proposal(result, 4311)

    def test_unknown_ambiguous_or_existing_routes_abort(self):
        for content in (ORIGINAL.replace(':443 ssl http2;', ':8443 ssl;'),
                        ORIGINAL + ORIGINAL, ORIGINAL + '# /casos/vetcole already exists\n'):
            with self.subTest(content=content), self.assertRaises(RuntimeError):
                proxy.proposal(content, 4310)

    def test_preview_never_writes_or_applies(self):
        with patch.object(proxy, 'inspect_runtime', return_value=b'main'), \
                patch.object(Path, 'read_bytes', return_value=ORIGINAL.encode()), \
                patch.object(Path, 'write_bytes') as write, \
                patch.object(proxy, 'apply_change') as apply, \
                patch('sys.argv', ['proxy', '4310', 'preview']), \
                contextlib.redirect_stdout(io.StringIO()):
            proxy.main()
            write.assert_not_called()
            apply.assert_not_called()

    def test_stale_approval_aborts_before_apply(self):
        with patch.object(proxy, 'inspect_runtime', return_value=b'main'), \
                patch.object(Path, 'read_bytes', return_value=ORIGINAL.encode()), \
                patch.object(proxy, 'apply_change') as apply, \
                patch('sys.argv', ['proxy', '4310', 'apply', '0' * 64]), \
                contextlib.redirect_stdout(io.StringIO()), self.assertRaises(RuntimeError):
            try:
                proxy.main()
            finally:
                apply.assert_not_called()

    def check_apply(self, fail_at=None, unhealthy=False):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / '.vetcole').touch()
            conf = root / 'vhost.conf'
            original = ORIGINAL.encode()
            proposed = proxy.proposal(ORIGINAL, 4310).encode()
            conf.write_bytes(original)
            calls = []

            def checked_run(args, **kwargs):
                calls.append(args)
                if len(calls) == fail_at:
                    raise subprocess.CalledProcessError(1, args)

            def output(*args):
                if args[0] == 'docker':
                    return 'vetcole'
                if args[0] == 'curl':
                    return '{"success":false}' if unhealthy else '{"success":true,"data":{"base":"/casos/vetcole"}}'
                return 'active'

            with patch.object(proxy, 'ROOT', root), patch.object(proxy, 'CONF', conf), \
                    patch.object(proxy, 'inspect_runtime', return_value=b'main'), \
                    patch.object(proxy, 'run', side_effect=output), \
                    patch.object(proxy.subprocess, 'run', side_effect=checked_run), \
                    contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
                if fail_at or unhealthy:
                    with self.assertRaises((subprocess.CalledProcessError, RuntimeError)):
                        proxy.apply_change(original, proposed, b'main', 4310)
                    self.assertEqual(conf.read_bytes(), original)
                else:
                    proxy.apply_change(original, proposed, b'main', 4310)
                    self.assertEqual(conf.read_bytes(), proposed)
                if unhealthy:
                    self.assertEqual(calls, [])
                    self.assertFalse((root / 'nginx-backups').exists())
                else:
                    self.assertEqual(next((root / 'nginx-backups').iterdir()).read_bytes(), original)
                return calls

    def test_invalid_candidate_restores_without_reloading(self):
        calls = self.check_apply(fail_at=2)
        self.assertTrue(all(call[:3] == [proxy.NGINX, '-t', '-c'] for call in calls))

    def test_reload_failure_restores_and_reloads_previous_config(self):
        calls = self.check_apply(fail_at=3)
        self.assertEqual(calls[-1], ['systemctl', 'reload', proxy.SERVICE])

    def test_success_only_reloads_expected_service(self):
        self.assertEqual(self.check_apply(), [[proxy.NGINX, '-t', '-c', str(proxy.MAIN)]] * 2 +
                         [['systemctl', 'reload', proxy.SERVICE]])

    def test_unhealthy_app_does_not_modify_proxy(self):
        self.check_apply(unhealthy=True)


if __name__ == '__main__':
    unittest.main()
