from __future__ import annotations

import argparse
import shutil
import socket
import subprocess
import sys
import threading
import time
import webbrowser
from pathlib import Path
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT / "backend"
FRONTEND_DIR = ROOT / "frontend"
VENV_DIR = BACKEND_DIR / ".venv"
VITE_SCRIPT = FRONTEND_DIR / "node_modules" / "vite" / "bin" / "vite.js"
BACKEND_URL = "http://127.0.0.1:8000/api/v1/health"
FRONTEND_URL = "http://127.0.0.1:5173"


class LaunchError(RuntimeError):
    pass


def backend_python(windows: bool = sys.platform == "win32") -> Path:
    if windows:
        return VENV_DIR / "Scripts" / "python.exe"
    return VENV_DIR / "bin" / "python"


def run_step(command: list[str], cwd: Path | None = None) -> None:
    print(f"\n> {' '.join(str(part) for part in command)}", flush=True)
    subprocess.run(command, cwd=cwd, check=True)


def ensure_dependencies() -> tuple[Path, str]:
    python = backend_python()
    if not python.exists():
        print("First run: creating the isolated backend environment...", flush=True)
        venv_command = [sys.executable, "-m", "venv"]
        if VENV_DIR.exists():
            venv_command.append("--clear")
        venv_command.append(str(VENV_DIR))
        run_step(venv_command)

    dependency_check = subprocess.run(
        [str(python), "-c", "import fastapi, rdkit, uvicorn"],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        check=False,
    )
    if dependency_check.returncode != 0:
        print("Installing or updating backend dependencies...", flush=True)
        run_step(
            [str(python), "-m", "pip", "install", "-r", "requirements.txt"],
            cwd=BACKEND_DIR,
        )

    node = shutil.which("node")
    if not node:
        raise LaunchError("Node.js was not found. Install Node.js 24: https://nodejs.org/")
    if not VITE_SCRIPT.exists():
        npm = shutil.which("npm.cmd" if sys.platform == "win32" else "npm")
        if not npm:
            raise LaunchError("npm was not found. Install Node.js 24 and npm 11.")
        print("First run: installing frontend dependencies...", flush=True)
        run_step([npm, "ci"], cwd=FRONTEND_DIR)

    return python, node


def service_commands(python: Path, node: str) -> list[tuple[str, list[str], Path]]:
    return [
        (
            "backend",
            [
                str(python),
                "-m",
                "uvicorn",
                "app.main:app",
                "--host",
                "127.0.0.1",
                "--port",
                "8000",
            ],
            BACKEND_DIR,
        ),
        (
            "frontend",
            [node, str(VITE_SCRIPT), "--host", "127.0.0.1", "--port", "5173", "--strictPort"],
            FRONTEND_DIR,
        ),
    ]


def stream_output(process: subprocess.Popen[str], name: str) -> None:
    if process.stdout is None:
        return
    for line in process.stdout:
        print(f"[{name}] {line.rstrip()}", flush=True)


def start_processes(python: Path, node: str) -> list[subprocess.Popen[str]]:
    processes: list[subprocess.Popen[str]] = []
    try:
        for name, command, cwd in service_commands(python, node):
            process = subprocess.Popen(
                command,
                cwd=cwd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                encoding="utf-8",
                errors="replace",
                bufsize=1,
            )
            processes.append(process)
            threading.Thread(
                target=stream_output,
                args=(process, name),
                daemon=True,
            ).start()
    except Exception:
        stop_processes(processes)
        raise
    return processes


def stop_processes(processes: list[subprocess.Popen[str]]) -> None:
    for process in processes:
        if process.poll() is None:
            process.terminate()
    for process in processes:
        if process.poll() is not None:
            continue
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()
    for process in processes:
        if process.poll() is not None:
            continue
        try:
            process.wait(timeout=2)
        except subprocess.TimeoutExpired:
            print(f"Process {process.pid} did not exit after being killed.", file=sys.stderr)


def url_ready(url: str) -> bool:
    try:
        with urlopen(url, timeout=1) as response:
            return response.status == 200
    except OSError:
        return False


def port_in_use(port: int) -> bool:
    try:
        with socket.create_connection(("127.0.0.1", port), timeout=0.3):
            return True
    except OSError:
        return False


def wait_until_ready(processes: list[subprocess.Popen[str]], timeout: float = 60) -> None:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        for process in processes:
            return_code = process.poll()
            if return_code is not None:
                raise LaunchError(f"A service exited early with exit code {return_code}.")
        if url_ready(BACKEND_URL) and url_ready(FRONTEND_URL):
            return
        time.sleep(0.25)
    raise LaunchError("Timed out while waiting for services. Check the service logs above.")


def open_browser(no_browser: bool) -> None:
    print(f"\nWorkbench ready: {FRONTEND_URL}", flush=True)
    if no_browser:
        return
    if not webbrowser.open(FRONTEND_URL):
        print("The browser could not be opened automatically. Open the URL manually.", flush=True)


def watch_standard_input(stop_requested: threading.Event) -> None:
    try:
        for line in sys.stdin:
            if line.strip().lower() in {"q", "quit", "exit"}:
                stop_requested.set()
                return
    except (OSError, ValueError):
        return


def main() -> int:
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(errors="replace")
    parser = argparse.ArgumentParser(description="Start Organic Molecular Workbench with one command")
    parser.add_argument("--no-browser", action="store_true", help="Do not open the browser automatically")
    args = parser.parse_args()
    processes: list[subprocess.Popen[str]] = []

    try:
        if url_ready(BACKEND_URL) and url_ready(FRONTEND_URL):
            print("Workbench services are already running.", flush=True)
            open_browser(args.no_browser)
            return 0
        if port_in_use(8000) or port_in_use(5173):
            raise LaunchError(
                "Port 8000 or 5173 is occupied, but both workbench services are not ready. "
                "Stop the old frontend/backend processes and retry."
            )

        python, node = ensure_dependencies()
        processes = start_processes(python, node)
        wait_until_ready(processes)
        open_browser(args.no_browser)
        print("Press Ctrl+C, or type q and press Enter, to stop both services.\n", flush=True)
        stop_requested = threading.Event()
        threading.Thread(
            target=watch_standard_input,
            args=(stop_requested,),
            daemon=True,
        ).start()

        while all(process.poll() is None for process in processes) and not stop_requested.is_set():
            time.sleep(0.5)
        if stop_requested.is_set():
            print("Stop requested by user.", flush=True)
            return 0
        raise LaunchError("One service exited. The other service will now be stopped.")
    except KeyboardInterrupt:
        print("\nStopping frontend and backend...", flush=True)
        return 0
    except (LaunchError, subprocess.CalledProcessError, OSError) as error:
        print(f"\nStartup failed: {error}", file=sys.stderr, flush=True)
        return 1
    finally:
        stop_processes(processes)


if __name__ == "__main__":
    raise SystemExit(main())
