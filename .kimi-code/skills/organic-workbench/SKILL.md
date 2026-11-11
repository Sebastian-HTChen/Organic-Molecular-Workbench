---
name: organic-workbench
description: Launch Organic Molecular Workbench and its FastAPI/RDKit backend with the project's unified launcher
type: prompt
whenToUse: When the user asks to start, open, or launch Organic Molecular Workbench or its frontend and backend
disableModelInvocation: false
---

从项目根目录启动 Organic Molecular Workbench。Skill 目录下的 `../../..` 就是项目根目录。

1. 先检查 `http://127.0.0.1:8000/api/v1/health` 和 `http://127.0.0.1:5173` 是否都已正常响应。如果已运行，不要重复启动，直接告诉用户工作台地址。
2. 如果服务未运行，在 `${KIMI_SKILL_DIR}/../../..` 目录通过 Bash 执行 `python scripts/workbench.py`，使用后台任务并保持任务运行。启动器会自动检查项目内依赖、启动前后端、等待就绪并打开默认浏览器。
3. 首次运行可能需要在 PyPI 和 npm 下载依赖；不要把这种正常安装误报为错误。若启动失败，读取启动器输出并报告具体原因。
4. 不要在启动器之外再启动一套 Uvicorn 或 Vite，避免端口冲突。
5. 启动器会管理它创建的两个子进程。需要停止时，优先让 launcher 收到 Ctrl+C 或标准输入 `q` 加回车，使其统一清理前后端；如果通过后台任务停止，随后验证 8000 和 5173 端口确实关闭。

Skill 只是 Kimi Code 的快捷入口。直接使用 `start-workbench.cmd` 或 `python scripts/workbench.py` 不需要 Kimi Code。
