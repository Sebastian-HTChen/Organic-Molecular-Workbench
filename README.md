# Organic Molecular Workbench

浏览器中的有机分子建模工作台。第一阶段 MVP 已打通 **SMILES → RDKit ETKDGv3 三维构象 → 3Dmol.js 交互显示**，并提供原子属性、几何测量和文件导出。

## 当前可用

- 通过 SMILES 生成分子：RDKit 解析与价态检查、显式加氢、ETKDGv3 构象生成、失败时随机坐标重试。
- 保留元素、同位素、形式电荷、芳香性、键级、环标记和三维坐标。
- Ball & Stick、Stick、Space-Filling；旋转、缩放、平移、氢原子开关、原子序号、自动适配。
- 点击选择 1–4 个原子：查看原子坐标、电荷、邻居，测量键长、键角和有符号二面角。
- 导出 SDF、MOL、XYZ、canonical SMILES；XYZ 明确标注不包含键级拓扑。
- 深色/浅色主题、可拖动左右面板、后端状态与错误反馈。
- 真实 FastAPI/RDKit 后端，无假分子数据、无假能量或假 DFT 结果。

## 尚未实现

Ketcher 二维编辑、文件导入、MMFF94/UFF、Undo/Redo、键长/键角/二面角修改、ORCA/Gaussian 输入生成及 HPC 提交。相关控件保持禁用或标记后续阶段。Calculation 抽象接口已预留，但没有注册计算提供者。

详细数据契约与后续设计见 [`docs/architecture.md`](docs/architecture.md)。

## 环境要求

- Windows 10/11（当前验证环境；其他支持 Node 与 Python 的系统也可按相同模块运行）
- Python 3.12
- Node.js 24 与 npm 11
- 支持 WebGL 的现代浏览器，建议开启硬件加速

后端使用 `backend/.venv` 隔离环境，**不依赖也不修改系统 Python 中的 RDKit**。当前安装并验证的是 RDKit 2026.09.1。

## 本地安装

在项目根目录 `E:\Bohrium` 下操作。

### 1. 后端

PowerShell：

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements-dev.txt
```

如果 PowerShell 禁止激活脚本，可以不激活，直接调用 `.venv\Scripts\python.exe`，如下文启动命令所示。

### 2. 前端

另开终端：

```powershell
cd frontend
npm ci
```

`package-lock.json` 已生成，CI/本地复现优先使用 `npm ci`；日常更新依赖时才使用 `npm install`。

## 启动开发环境

需要两个终端。

**终端 A — FastAPI，端口 8000：**

```powershell
cd E:\Bohrium\backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

**终端 B — Vite，端口 5173：**

```powershell
cd E:\Bohrium\frontend
npm run dev
```

打开 <http://127.0.0.1:5173>。Vite 将 `/api` 代理到 `127.0.0.1:8000`，无需额外配置 CORS 或环境变量。

- API 健康检查：<http://127.0.0.1:8000/api/v1/health>
- OpenAPI 文档：<http://127.0.0.1:8000/docs>

## 使用

1. 在左侧输入名称和 SMILES，或选择 Ethanol、Benzene、Acetic acid 示例。
2. 点击 **Generate 3D structure**。成功后可看到真实 RDKit 构象；非法 SMILES 或价态会显示后端错误。
3. 左键拖动旋转，滚轮缩放，右键拖动平移。右上角切换显示模式、氢原子和序号，十字适配按钮重新居中。
4. 依次点击原子。1 个原子显示属性，2/3/4 个原子分别显示距离/角度/二面角；角度以第二个原子为顶点。点击已选原子可移除。
5. 通过 **Export** 下载结构。Save 当前等价于导出 SDF。

注意：第一阶段只生成一个确定性构象，不进行构象搜索。当前没有报告力场能量；未来 MMFF94/UFF 能量也不能解释为 DFT 总能量或 Gibbs 自由能。

## 测试与构建

后端：

```powershell
cd E:\Bohrium\backend
.\.venv\Scripts\python.exe -m pytest
```

前端：

```powershell
cd E:\Bohrium\frontend
npm test
npm run build
npm run preview
```

预览默认使用 <http://127.0.0.1:4173>；代理仅用于 Vite 开发服务器，因此验证完整前后端交互应使用上述开发环境。

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

## 已知非阻塞提醒

- 3Dmol.js 上游分发包包含 `eval`，Vite 构建会提示安全风险；同时三维引擎使主 bundle 超过 500 kB。后续可通过动态导入拆包，但不能通过关闭警告来掩盖。
- 当前 FastAPI/Starlette 测试客户端会对旧 `httpx` 适配路径发出弃用提醒；测试功能正常，后续升级测试客户端适配层。
