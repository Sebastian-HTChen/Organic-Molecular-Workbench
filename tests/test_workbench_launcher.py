import subprocess
from pathlib import Path

import pytest

from scripts import workbench


class FakeProcess:
    def __init__(self, returncode: int | None = None, wait_times_out: bool = False) -> None:
        self.returncode = returncode
        self.wait_times_out = wait_times_out
        self.terminated = False
        self.killed = False

    def poll(self) -> int | None:
        return self.returncode

    def terminate(self) -> None:
        self.terminated = True

    def wait(self, timeout: float) -> int:
        if self.wait_times_out:
            raise subprocess.TimeoutExpired("fake", timeout)
        self.returncode = 0
        return 0

    def kill(self) -> None:
        self.killed = True
        self.returncode = -9


def test_backend_python_uses_platform_specific_venv_path() -> None:
    assert workbench.backend_python(windows=True).parts[-2:] == ("Scripts", "python.exe")
    assert workbench.backend_python(windows=False).parts[-2:] == ("bin", "python")


def test_frontend_runs_vite_directly_without_an_npm_child_process() -> None:
    commands = workbench.service_commands(Path("python"), "node")
    frontend = next(command for name, command, _cwd in commands if name == "frontend")

    assert frontend[0] == "node"
    assert Path(frontend[1]).parts[-3:] == ("vite", "bin", "vite.js")
    assert "--strictPort" in frontend
    assert "npm" not in frontend


def test_backend_disables_reload_to_keep_process_management_simple() -> None:
    commands = workbench.service_commands(Path("python"), "node")
    backend = next(command for name, command, _cwd in commands if name == "backend")

    assert backend[:4] == [str(Path("python")), "-m", "uvicorn", "app.main:app"]
    assert "--reload" not in backend


def test_ready_check_detects_early_process_failure(monkeypatch: pytest.MonkeyPatch) -> None:
    process = FakeProcess(returncode=2)

    with pytest.raises(workbench.LaunchError, match="exit code 2"):
        workbench.wait_until_ready([process], timeout=1)


def test_ready_check_requires_both_urls(monkeypatch: pytest.MonkeyPatch) -> None:
    process = FakeProcess()
    ready_urls: set[str] = set()
    monkeypatch.setattr(workbench, "url_ready", lambda url: url in ready_urls)
    monkeypatch.setattr(workbench.time, "sleep", lambda _seconds: ready_urls.add(workbench.FRONTEND_URL))
    ready_urls.add(workbench.BACKEND_URL)

    workbench.wait_until_ready([process], timeout=1)


def test_cleanup_terminates_running_processes() -> None:
    running = FakeProcess()
    stopped = FakeProcess(returncode=0)

    workbench.stop_processes([running, stopped])

    assert running.terminated
    assert not running.killed
    assert not stopped.terminated


def test_cleanup_kills_a_process_only_after_timeout() -> None:
    process = FakeProcess(wait_times_out=True)

    workbench.stop_processes([process])

    assert process.terminated
    assert process.killed
    assert process.poll() == -9


def test_standard_input_q_requests_a_graceful_stop(monkeypatch: pytest.MonkeyPatch) -> None:
    import io
    import threading

    stop_requested = threading.Event()
    monkeypatch.setattr(workbench.sys, "stdin", io.StringIO("q\n"))

    workbench.watch_standard_input(stop_requested)

    assert stop_requested.is_set()
