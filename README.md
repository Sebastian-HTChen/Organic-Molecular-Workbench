# Organic Molecular Workbench

浏览器中的有机分子建模工作台。已打通 **SMILES / 二维编辑 / 多格式文件导入 → RDKit → 三维交互显示、力场优化与文件导出**，并提供原子属性、几何测量和数据来源追踪。构象搜索、后台计算任务和可复现报告将在后续阶段实现。

本项目使用真实 FastAPI/RDKit 后端，不使用假分子数据、假能量或假 DFT 结果。所有计算均在使用者自己的电脑上完成，无需上传分子数据。

## 一键启动（推荐）

准备 Python 3.12、Node.js 24/npm 11 和支持 WebGL 的浏览器，然后获取项目：

```bash
git clone https://github.com/Sebastian-HTChen/Organic-Molecular-Workbench.git
cd Organic-Molecular-Workbench
```

也可以在仓库页面选择 **Code → Download ZIP**，解压后进入项目目录。

**Windows：双击根目录的 `start-workbench.cmd`。**

也可以在项目根目录使用命令：

```bash
# Windows
python scripts/workbench.py

# macOS / Linux
python3 scripts/workbench.py
```

启动器会自动完成以下操作：

1. 首次运行时创建 `backend/.venv` 并安装后端依赖，缺少前端依赖时执行 `npm ci`。
2. 同时启动 FastAPI 和 Vite，并将两个服务的日志显示在同一个终端中。
3. 等待前后端就绪后自动打开 <http://127.0.0.1:5173>。
4. 在终端按 **Ctrl+C**，或输入 **q** 后回车，同时停止前端和后端。

保持这个终端开启即可使用工作台。首次安装依赖需要联网；后续启动无需重复安装。如果检测到服务已经运行，启动器只会打开页面，不会重复启动服务。添加 `--no-browser` 参数可禁止自动打开浏览器。

在 Kimi Code 中将本项目目录作为工作区打开后，也可以调用 `/skill:organic-workbench`。Skill 只是快捷入口，不是运行项目的必要条件。

## 手动分步安装与启动

如果一键启动失败，或希望分别管理两个服务，可以使用以下步骤。无需预先安装 RDKit，后端依赖会安装在项目自己的隔离环境中，不修改系统 Python 的 RDKit。

### 1. 准备环境

- Python 3.12
- Node.js 24 与 npm 11
- 支持 WebGL 的现代浏览器，建议开启硬件加速
- Git（使用 Download ZIP 时不需要）

当前主要在 Windows 10/11 上验证。macOS/Linux 可使用下文对应命令，但尚未作为首选验证平台。

### 2. 获取项目

使用 Git：

```bash
git clone https://github.com/Sebastian-HTChen/Organic-Molecular-Workbench.git
cd Organic-Molecular-Workbench
```

也可以打开仓库页面，选择 **Code → Download ZIP**，解压后进入 `Organic-Molecular-Workbench` 文件夹。

如果仓库为 Private，需要仓库所有者先在 **Settings → Collaborators** 中授予访问权限；Public 仓库可直接下载。无法克隆私有仓库时，请先确认自己的 GitHub 账号和访问权限。

### 3. 启动后端（终端一）

在项目根目录执行。

**Windows PowerShell：**

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

**macOS / Linux：**

```bash
cd backend
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

安装过程会从 PyPI 下载 FastAPI、RDKit、Uvicorn 等依赖。看到 Uvicorn 运行在 `127.0.0.1:8000` 后，保持此终端开启。

后端健康检查：<http://127.0.0.1:8000/api/v1/health>。正常时应返回 `status: ok` 和实际 RDKit 版本。

### 4. 启动前端（终端二）

**另开一个终端**，进入项目根目录，然后执行：

```bash
cd frontend
npm ci
npm run dev
```

`npm ci` 根据仓库中的 `package-lock.json` 安装兼容版本。首次安装需要联网。看到 Vite 启动成功后，同样保持此终端开启。

### 5. 打开工作台

访问：

<http://127.0.0.1:5173>

`127.0.0.1` 表示**当前运行项目的这台电脑**。每位使用者都应按上述步骤在自己的电脑上启动；该地址不是公开互联网网址。

- 前端：<http://127.0.0.1:5173>
- 后端健康检查：<http://127.0.0.1:8000/api/v1/health>
- OpenAPI 文档：<http://127.0.0.1:8000/docs>

Vite 开发服务器会将 `/api` 请求代理到 `127.0.0.1:8000`，本地使用无需额外配置 CORS 或环境变量。

### 6. 关闭或重新启动

- 在两个终端分别按 `Ctrl+C` 即可停止后端和前端。
- 只关闭前端后，页面无法访问；只关闭后端后，界面可能仍能打开，但 SMILES 生成会失败。
- 下次使用时无需重复克隆；如果依赖没有变化，也无需重新安装，只需分别执行后端 Uvicorn 和前端 `npm run dev` 启动命令。
- 如果拉取了依赖更新，后端重新执行 `pip install -r requirements.txt`，前端重新执行 `npm ci`。

### 常见问题

**提示 `python` 或 `python3` 不是命令**

安装 Python 3.12，并确保安装器将 Python 加入 PATH。Windows 也可检查 Python Launcher 是否可用：

```powershell
py -3.12 --version
```

**PowerShell 禁止运行激活脚本**

本指南直接调用 `.venv\Scripts\python.exe`，不需要执行 `Activate.ps1`，因此无需修改 PowerShell 执行策略。

**页面显示 Backend offline**

确认后端终端仍在运行，并且 <http://127.0.0.1:8000/api/v1/health> 可以访问。然后再启动或刷新前端。

**端口已被占用**

检查是否已经有另一个 Uvicorn 或 Vite 实例使用 8000/5173 端口。不要同时启动多套相同开发服务。

## 当前功能

- 通过 SMILES 生成分子：RDKit 解析与价态检查、显式加氢、ETKDGv3 构象生成、失败时随机坐标重试。
- 保留元素、同位素、形式电荷、芳香性、键级、环标记和三维坐标。
- Ketcher 二维绘制：左侧工具栏和内置编辑器均支持原子、单/双/三/芳香键、选择与删除工具。Atom Palette 切换所选元素，左侧工具高亮与实际 Ketcher 工具同步。除常见有机元素外，支持导入含常见金属的结构；金属配位和价态需人工审核并由所选计算方法检查适用性。
- 顶部 Undo / Redo 使用 Ketcher 的真实二维编辑历史，没有可撤销操作时禁用。它不等同于三维优化或计算任务的整体历史。
- **文件导入与管理**：点击 Open 或拖拽上传 XYZ / Extended XYZ、SDF / MOL、MOL2、PDB；每批最多 50 个文本文件，单文件最大 5 MB，单个结构最多 2,000 个原子。支持多记录 SDF、文件级批量错误报告、结构名称/化学式/原子数展示，以及本次会话的 Molecule Library 切换。
- 二维 MOL → RDKit ETKDGv3 三维构象；保留二维键级、形式电荷和芳香性，二维和三维坐标分别维护。
- Ball & Stick、Stick、Space-Filling；旋转、滚轮或 `+ / −` 按钮缩放、平移、氢原子开关、原子序号、自动适配。
- MMFF94 / UFF 真实几何优化：更新三维坐标，报告优化前后力场势能、实际最小化步数和收敛状态，并在达到步数上限但未收敛时明确提示。
- 点击选择 1–4 个原子：查看原子坐标、电荷、邻居，测量键长、键角和有符号二面角。
- 导出 SDF、MOL、XYZ、canonical SMILES；XYZ 明确标注不包含键级拓扑。
- ORCA `.inp` 输入生成：支持单点能、几何优化、频率及优化＋频率；可选 B3LYP、PBE0、PBE、TPSS、M06-2X、wB97X-D3 和多种基组，并设置电荷、自旋多重度、CPU 核数和每核内存。
- 独立 ORCA 配置界面提供实时预览、复制、下载和四套推荐起始配置。导出 XYZ/SMILES 后可点击提示进入该界面。只生成输入文件，不执行 ORCA、不提交 HPC、不返回虚构能量。
- 深色/浅色主题、可拖动左右面板、后端状态与错误反馈。

## 基本使用

1. 在左侧输入名称和 SMILES，或选择 Ethanol、Benzene、Acetic acid 示例。
2. 点击 **Generate 3D structure**。成功后可看到真实 RDKit 构象；非法 SMILES 或价态会显示后端错误。
3. 左键拖动旋转，滚轮或右上角 `+ / −` 缩放，右键拖动平移。右上角切换显示模式、氢原子和序号，适配按钮重新居中。
4. 点击 **2D Editor** 使用 Ketcher 绘制。左侧选择元素、化学键、选择或擦除工具后再操作画布；顶部 Undo / Redo 恢复真实的二维编辑操作，然后点击 **Generate 3D**。二维编辑不会被当作三维优化。
5. 依次点击原子。1 个原子显示属性，2/3/4 个原子分别显示距离/角度/二面角；角度以第二个原子为顶点。点击已选原子可移除。
6. 通过 **Export** 下载结构。Save 当前等价于导出 SDF。

## 文件导入与使用

1. 点击顶部 **Open**，选择文件或拖入多个文件。每批最多 50 个，支持多记录 SDF；成功结构会进入左侧 Molecule Library。
2. 批量中的某个文件失败时，其文件名及实际错误会保留在弹窗内；其他合法结构仍可使用。不会用空白或假结构替代失败文件。
3. 打开任何结构后，检查三维坐标、化学式、原子数、邻居和解析警告。坐标变化前，原始导入坐标保持不变。
4. 在右侧 **Structure provenance & settings** 中检查来源，必要时设置总电荷、自旋多重度并确认已审核的拓扑。

| 格式 | 保真行为 | 必须注意 |
| --- | --- | --- |
| XYZ | 读取原子与坐标，RDKit 尝试推断键级，失败时退回几何单键连接 | 键连接、键级都不是文件原始信息。默认以总电荷 0 尝试判键，仍需用户确认 |
| Extended XYZ | 支持坐标和第二行键值元数据 | `Lattice` 仅记录，不执行周期性计算；charge 标签等不会自动替代电荷/自旋设置 |
| MOL / SDF | 保留坐标、键级、形式电荷、多记录名称 | 净化失败时保留文件键供检查，但标记未确认，不会伪装成已验证结构 |
| MOL2 | 读取 Tripos 原子、键和部分电荷 | partial charge 与 formal charge 明确区分，不能用部分电荷之和冒充形式电荷 |
| PDB | 保留原子和 CONECT 连接 | 不按距离自动发明键；CONECT 不是完整的键级与形式电荷信息 |

电荷/自旋设置是供后续计算使用的元数据，**不会自动修改原子形式电荷、氧化态或配位关系**。金属氧化态字段已预留，但独立编辑界面尚未完成。金属配合物必须人工审核配位关系，再确认所选力场/量化方法支持；不能套用普通有机分子的价键规则。

导入库只保存在当前页面会话中，刷新或关闭后不会自动恢复。保存当前结构请使用 **Save / Export**；完整任务持久化与归档属于后续阶段。

注意：构象生成只生成一个确定性构象，不进行构象搜索。MMFF94/UFF 优化报告的是经典力场势能，不能解释为 DFT 总能量、焓或 Gibbs 自由能，不同力场的能量也不能直接比较。

## 尚未实现

自动化构象搜索与对称性去重、xTB/ASE 执行后端、后台任务队列与取消、可复现报告及归档、键长/键角/二面角修改、独立金属氧化态编辑界面、Gaussian 输入生成及 HPC 提交。相关后续功能不会返回虚构数据。ORCA 输入生成已经可用，但没有注册任何量化计算执行提供者。

详细数据契约与后续设计见 [`docs/architecture.md`](docs/architecture.md)。

## 开发测试与构建

普通使用只需安装 `requirements.txt`。运行后端测试前，先安装完整开发依赖：

```powershell
cd backend
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
.\.venv\Scripts\python.exe -m pytest
```

前端测试与生产构建：

```powershell
cd frontend
npm test
npm run build
npm run preview
```

生产预览默认使用 <http://127.0.0.1:4173>；API 代理仅用于 Vite 开发服务器，因此验证完整前后端交互应使用快速开始中的开发环境。

## API 示例

```powershell
curl.exe -X POST http://127.0.0.1:8000/api/v1/molecules/from-smiles `
  -H "Content-Type: application/json" `
  -d '{"smiles":"CCO","name":"Ethanol"}'
```

成功返回 HTTP 201 和完整分子 JSON。非法结构返回结构化错误，例如：

```json
{
  "detail": {
    "code": "invalid_smiles",
    "message": "RDKit could not parse this SMILES. Check syntax, valence, and aromaticity."
  }
}
```

## 关于公开网页部署

GitHub 仓库用于分发源码，不会自动运行本项目。GitHub Pages 只能托管静态前端，不能独立运行 FastAPI/RDKit 后端。若希望其他人点击公开网址即可使用，需要另外部署前端和后端，并配置生产 API 地址、HTTPS 与 CORS。

## 已知非阻塞提醒

- 3Dmol.js 上游分发包包含 `eval`，Vite 构建会提示安全风险；同时三维引擎使主 bundle 超过 500 kB。后续可通过动态导入拆包，但不能通过关闭警告来掩盖。
- 当前 FastAPI/Starlette 测试客户端会对旧 `httpx` 适配路径发出弃用提醒；测试功能正常，后续升级测试客户端适配层。
