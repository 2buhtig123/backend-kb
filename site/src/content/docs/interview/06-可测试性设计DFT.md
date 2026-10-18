---
title: "八股题库 · 06 可测试性设计 DFT（Design for Test）"
description: "DFT 面试专题：Scan 原理、ATPG 算法、MBIST、OCC 与覆盖率指标。"
module: interview
order: 5
references:
  - "《数字集成电路物理设计》第 10 章 芯片设计的最终验证与签核"
---

# 八股题库 · 06 可测试性设计 DFT（Design for Test）

> **数字 IC 后端的"必知必会"**。先进工艺下 DFT 不再是"可选项"——没有 DFT，芯片出不了厂。
> 本专题 9 道题，覆盖 Scan、MBIST、Boundary Scan、ATPG、Coverage、JTAG。

---

## 一、核心概念速查

### 1.1 什么是 DFT

**DFT（Design for Test）** = 在设计阶段就考虑"如何测试"。

**目的**：
- 制造缺陷检测（开路、短路、stuck-at fault）
- 现场失效分析
- 提高 yield

**两大支柱**：

| 类型 | 用途 | 覆盖率 |
|---|---|---|
| **Scan Chain**（扫描链）| 测试组合 + 时序逻辑 | Stuck-at fault > 95% |
| **MBIST**（Memory BIST）| 测试 SRAM/DRAM | Memory fault > 99% |

### 1.2 Scan Chain 原理

**核心思想**：把时序逻辑（Flip-Flop）变成可"扫描"的链。

**两种 FF**：

| 类型 | 输入 | 输出 |
|---|---|---|
| **DFF**（普通）| D | Q |
| **SFF**（Scan FF）| D + SI, SE 控制 | Q + SO |

**扫描模式**：
- 正常工作：SE=0，数据走 D 端
- 扫描测试：SE=1，数据走 SI 端
- 串行输入测试向量，从 SO 输出响应

### 1.3 Coverage 指标

| 指标 | 含义 | 目标 |
|---|---|---|
| **Stuck-at Coverage** | stuck-at 0/1 故障覆盖率 | > 95% |
| **Transition Delay** | 跳变延迟故障 | > 90% |
| **Path Delay** | 路径延迟故障 | > 85% |
| **IDDQ** | 静态电流故障 | 辅助 |
| **Memory Coverage** | memory 故障 | > 99% |

---

## 二、9 道高频面试题

### 题 1：什么是 Scan Chain？它的基本原理是什么？

**参考答案**：

**Scan Chain** = 把所有 Flip-Flop 串成一条"长链"，可以**串行输入测试向量**、**串行输出测试响应**。

**原理**：

```
 ┌─── FF1 ── FF2 ── FF3 ── ... ── FFN ───┐
 │   SO→ SI  SO→ SI  SO→ SI       SO→ SI  │
 └──────── scan chain ────────────────┘
            ↑                       ↓
          SI (input)              SO (output)
```

**测试流程**：
1. **Shift 模式**：SE=1，扫描向量从 SI 灌入到所有 FF
2. **Capture 模式**：SE=0，FF 工作一个 cycle，捕获组合逻辑输出
3. **Shift 模式**：SE=1，把捕获结果串行从 SO 读出
4. **比较**：实际响应 vs 预期响应，定位故障

**两种 Scan**：

| 类型 | 特点 |
|---|---|
| **Muxed-D Scan** | 每个 DFF 旁加 MUX（面积小、delay 小）|
| **Clocked Scan** | 用时钟控制 scan enable（速度快）|

**加分点**：
- 提到 "Scan FF 数量 = 原 FF 数量，每个多 1 个 MUX"
- 提到 "Scan chain 长度 = FF 总数 ÷ chain 数"
- 提到 "scan 串行化会消耗测试时间：长 chain 慢"

---

### 题 2：Scan Chain 数量怎么定？长度对测试有什么影响？

**参考答案**：

**数量决定因素**：

| 因素 | 影响 |
|---|---|
| **ATE channel 数量** | ATE 的 I/O 决定最大 chain 数 |
| **测试时间预算** | chain 越少越长 → 慢 |
| **功耗** | chain 多 → 同时切换的 FF 多 → 功耗大 |
| **时钟域** | 跨时钟域要分 chain |
| **功能模块** | 大模块独立 chain（DFT 调试方便）|

**典型配置**：

| 设计规模 | Chain 数 | Chain 长度 |
|---|---|---|
| 小（< 100K gate）| 4~8 | 200~500 |
| 中（100K~1M gate）| 16~64 | 500~2000 |
| 大（> 1M gate）| 64~256 | 1000~5000 |
| SoC（多模块）| 100~500 | 不等 |

**长度影响**：

| 长 chain | 短 chain |
|---|---|
| 测试时间↑ | 测试时间↓ |
| 串行化慢 | 并行快 |
| 故障定位难 | 故障定位准 |
| 功耗低 | 功耗高（同时 toggle 多）|

**加分点**：
- 提到 "ATE channel 是硬限制——典型 256~1024"
- 提到 "balance chain 长度很关键——太不均会导致测试时间浪费"
- 提到 "scan chain 顺序按物理位置排列（compressor 自动优化）"

---

### 题 3：什么是 Stuck-At Fault？ATPG 怎么工作？

**参考答案**：

**Stuck-At Fault**（固定故障）：假设某个节点永远卡在 0 或 1，是最常见的故障模型。

**两类**：
- **SA0（Stuck-At 0）**：节点永远为 0
- **SA1（Stuck-At 1）**：节点永远为 1

**ATPG（Automatic Test Pattern Generation）** = 自动生成能检测这些故障的测试向量。

**工作流程**：

1. **故障列表生成**：所有节点 × {SA0, SA1}
2. **故障激活**：让故障点的相反值传到输出
3. **路径敏化**：把故障影响传到可观察点
4. **约束满足**：满足 FF 状态、时钟、约束
5. **模式压缩**：合并可同时检测多个故障的 pattern

**ATPG 工具**：
- Synopsys TetraMAX
- Cadence Modus
- Mentor Tessent

**结果**：
- Coverage 报告：哪些故障被检测
- 不可测故障：false path / redundant logic / clock gating 问题

**加分点**：
- 提到 "现代 ATPG 90% 自动化，但 unmodeled fault 仍需手工"
- 提到 "test coverage 95% 是工业标准"
- 提到 "ATPG 不能检测的故障：未扫描的 FF、异步逻辑、memory"

---

### 题 4：什么是 MBIST？为什么 Memory 必须用 MBIST？

**参考答案**：

**MBIST（Memory BIST）**：芯片内置的 memory 测试逻辑，自动跑 memory 测试，不需要外部 ATE 复杂 pattern。

**为什么 Memory 必须用 MBIST**：

1. **Memory 故障模型不同于逻辑**：
 - 桥接故障（bridging fault）
 - 耦合故障（coupling fault）
 - 静态/动态故障

2. **Memory 测试需要复杂算法**（March C-、March SS 等）——外部 ATE 不易生成

3. **Memory 数量大**：现代 SoC 有几百个 memory，ATE 单独测不现实

**MBIST 架构**：
```
 ┌── Memory 1 ──┐
 │              │
MBIST Controller ┼── Memory 2 ──┐
 │              │              │
 └── Memory N ──┘              │
                               ↓
                          BIST output
```

**关键模块**：
- **BIST Controller**：产生测试算法
- **BIST Compare**：对比实际输出 vs 预期
- **Repair Logic**：发现故障后用 redundancy 修复

**加分点**：
- 提到 "MBIST 覆盖率通常 > 99%"
- 提到 "March 算法是核心——March C− = 10N（w0 / r0w1 / r1w0 / r0w1 / r1w0 / r0 共 1+2+2+2+2+1）、March C+ = 14N、March SS = 22N，N 为地址数"
- 提到 "memory repair 用 redundancy row/column"
- 提到 "BISR（Built-In Self-Repair）配合 MBIST 自动修复"

---

### 题 5：什么是 Boundary Scan？JTAG 是什么？

**参考答案**：

**Boundary Scan**（边界扫描）：在 chip 的每个 I/O pin 旁边加一个 boundary scan cell（BSC），形成一条链。

**作用**：
- 测试 board 上 chip 之间的连接（interconnect test）
- 测试 chip 内部 I/O
- 不需要物理探针（probe）

**JTAG**（Joint Test Action Group）：Boundary Scan 的标准接口，5 个信号：

| 信号 | 全称 | 方向 |
|---|---|---|
| **TDI** | Test Data In | 输入 |
| **TDO** | Test Data Out | 输出 |
| **TMS** | Test Mode Select | 输入 |
| **TCK** | Test Clock | 输入 |
| **TRST** | Test Reset（可选）| 输入 |

**JTAG 寄存器**：

| 寄存器 | 缩写 | 用途 |
|---|---|---|
| **Bypass Register** | BYPASS | 旁路，缩短 chain |
| **Boundary Scan Register** | BSR | 测试 I/O |
| **Instruction Register** | IR | 模式选择 |
| **Device ID Register** | IDCODE | 标识 chip |
| **User Code Register** | USERCODE | 用户自定义 |

**加分点**：
- 提到 "JTAG 不仅是测试——也是 debug、烧录、FPGA 配置接口"
- 提到 "IEEE 1149.1 是 JTAG 标准，IEEE 1149.6 是差分信号扩展"
- 提到 "5 线是 minimum，TRST 可选"

---

### 题 6：DFT 在后端实现时要注意什么？

**参考答案**：

**后端 DFT 关注点**：

| 关注点 | 原因 | 工具支持 |
|---|---|---|
| **Scan Chain 顺序** | 物理位置近的 FF 应在同一 chain | DFT Compiler 自动优化 |
| **Scan Chain 时序** | 长 chain 信号完整性 | DFT Compiler + Innovus |
| **Clock Skew** | Shift mode 对 skew 敏感 | CTS 阶段注意 |
| **Power 约束** | Shift 模式同时 toggle 多，IR drop 严重（《数字集成电路物理设计》p.205-206 将测试功耗列为额外负担） | DFT power-aware |
| **BIST 逻辑位置** | 放在 always-on 区域或专用 domain | Floorplan 规划 |
| **Scan I/O 引脚** | 占用顶层 pin | Top-level floorplan |
| **Hold 修复** | Shift mode 下 hold 违例多 | 单独跑 shift hold fix |

**具体步骤**：
1. **DFT 规划**：在综合阶段决定 scan 数量、长度
2. **DFT 编译**：插入 scan FF、生成 chain
3. **物理感知 DFT**：DFT Compiler 看物理位置优化 chain 顺序
4. **后端修复**：
 - 长 wire 加 buffer（避免 signal integrity）
 - hold fix
 - clock skew 平衡
 - power-aware placement（避免 IR drop 违例）

**加分点**：
- 提到 "shift mode 的 hold 检查特别严——很多 hold fix 在这个阶段做"
- 提到 "现代 DFT 工具都和 P&R 联合优化（phys-aware DFT）"
- 提到 "compression 解压的 scan 减少 pattern count 但增加面积"

---

### 题 7：什么是 OCC（On-Chip Clocking）？它和 ATPG 有什么关系？

**参考答案**：

**OCC（On-Chip Clocking）**：在 chip 内部产生测试时钟的逻辑，控制 ATPG 的 capture 时序。

**为什么需要 OCC**？
- ATPG capture 需要精确控制的时钟边沿
- 外部 ATE 难以控制内部 PLL 时钟
- OCC 内部产生 clock，可以同步到 ATE 慢时钟

**OCC 架构**：
```
 PI  →  OCC Logic  →  Functional Clock
              ↑
          OCC enable
          OCC select（功能 / 测试）
```

**关键信号**：
- **occ_bypass**：选择功能时钟或测试时钟
- **occ_ctrl**：capture / shift 控制
- **occ_edge**：capture 边沿对齐

**与 ATPG 的关系**：
- ATPG 工具控制 OCC 何时切换到 capture mode
- Capture 边沿精度决定 transition delay 测试的准确性

**加分点**：
- 提到 "transition delay 测试必须用 OCC"
- 提到 "OCC 本身是 critical path，要做 DFT-aware timing"
- 提到 "现代 IP（PCIe/USB）的 OCC 由 IP vendor 提供"

---

### 题 8：什么是 Compression Scan？优势是什么？

**参考答案**：

**Compression Scan**（压缩扫描）：用内部 compressor/decompressor 减少 ATE I/O 数量和测试时间。

**基本原理**：

```
 ATE → → → Decompressor → → N 个 internal chains
 ATE ← ← ← Compressor ← ← M 个 internal chains
```

- Decompressor 把 ATE 串行输入扩展成多 chain 并行
- Compressor 把多 chain 输出压缩回 ATE 串行输出

**关键参数**：

| 参数 | 含义 | 典型 |
|---|---|---|
| **Compression Ratio** | 内部 chain 数 / ATE 通道数 | 10x ~ 100x |
| **X-masking** | 未知状态处理 | 必须 |
| **X-tolerance** | 容忍 X 数量 | 影响 coverage |

**优势**：

| 优势 | 量级 |
|---|---|
| **测试时间** | 减 10x ~ 100x |
| **ATE 通道需求** | 减 10x ~ 100x |
| **Pattern 数量** | 减 5x ~ 50x |
| **测试成本** | 显著下降 |

**代价**：
- 面积增加（compressor/decompressor 逻辑）
- X-masking 复杂
- 工具支持要求高

**加分点**：
- 提到 "工业标准 compression：EDT（Embedded Deterministic Test）"
- 提到 "compression 让 coverage 保持不变，但 pattern count 大降"
- 提到 "TetraMAX / Modus 都支持 compression"

---

### 题 9：什么是 Test Coverage？怎么提高它？

**参考答案**：

**Test Coverage**（测试覆盖率）：被测试覆盖到的故障数 / 总故障数。

**常见类型**：

| 类型 | 目标 | 通常阈值 |
|---|---|---|
| **Stuck-at** | 节点固定 0/1 | > 95% |
| **Transition** | 跳变延迟故障 | > 90% |
| **Path Delay** | 路径延迟故障 | > 85% |
| **IDDQ** | 静态电流 | 辅助 |
| **Memory** | 内部 memory | > 99% |

**为什么不能 100%**？
- **不可测故障**（untestable faults）：
- Redundant logic（冗余逻辑）
- False path
- 异步逻辑
- 不被 scan 覆盖的 FF

**提高方法**：

| 优先级 | 方法 | 收益 |
|---|---|---|
| 1 | **增加 scan FF 覆盖** | 显著 |
| 2 | **修复 ATPG 不可测**（重写 RTL）| 显著 |
| 3 | **加 Boundary Scan** | 板级互连 |
| 4 | **加 MBIST 覆盖所有 memory** | memory 100% |
| 5 | **跑 transition delay** | 高频测试 |
| 6 | **用 IDDQ 测试** | 漏电流类故障 |
| 7 | **加 I/O 测试 pad** | 探针测试 |

**加分点**：
- 提到 "覆盖率从 95% 提到 99% 比从 80% 提到 95% 难 10 倍"
- 提到 "unreachable coverage 不可强求——通常是设计本身问题"
- 提到 "inferred coverage 包括子模块的覆盖率"

---

## 三、综合题（开放题）

### 题 10：项目里发现 Test Coverage 只有 88%，你怎么提高到 95%+？

**参考答案框架**：

1. **分析覆盖报告**：
 - `report_test_coverage` 列出未覆盖的 fault
 - 分类：哪些是 untestable、unreachable

2. **针对 untestable**：
 - 看是不是 redundant logic（RTL 优化）
 - 看是不是 clock gating 阻断（加测试旁路）
 - 看是不是 memory 接口没接上（接 MBIST）

3. **针对 unreachable**：
 - 看路径约束是否过严（放宽 false path）
 - 看 FF 是否被 bypass 了（加 scan FF）

4. **重新跑 ATPG**：
 - 使用 compression
 - 优化 pattern 数
 - 验证 coverage

5. **验证**：
 - 重跑 full ATPG
 - 确认 pattern count 没爆炸
 - 跑 transition delay + path delay

**加分点**：
- 提到 "88% → 95% 通常要动 RTL——这就是 DFT-aware RTL 的价值"
- 提到 "ATPG 工具给的 hint 通常是修改方向"
- 提到 "unreachable coverage < 1% 是常见，但全 0 不现实"

---

## 四、面试常见追问

| 追问 | 应对 |
|---|---|
| "为什么不能 100% coverage？" | "redundant logic、false path、异步逻辑天然不可测" |
| "MBIST 和 Scan Chain 能并存吗？" | "能。Scan 测 logic，MBIST 测 memory" |
| "JTAG 和 Scan Chain 关系？" | "JTAG 是接口，Scan Chain 是逻辑结构。Scan 通过 JTAG 加载/读取" |
| "Compression 一定要做吗？" | "量产芯片强烈推荐——成本降 10x" |
| "DFT 会破坏 timing 吗？" | "会。Scan FF 比 DFF 慢，要做 DFT-aware synthesis" |

---

## 五、面试避坑

1. 把 Scan 和 Boundary Scan 混为一谈——**Scan 测内部 FF，Boundary Scan 测 I/O**
2. 不知道 MBIST 算法——面试必提 "March C- 是什么"
3. 漏提 Coverage 阈值——95% 是工业标准
4. 不知道 OCC 是什么——transition delay 必问
5. 以为 ATPG 100% 自动化——实际 RTL 不友好时手工量大

---

> **关联阅读**：[01-基础知识 04-布局布线 PNR](../01-基础知识/04-布局布线PNR.md) 中 ECO 章节（DFT ECO 是常见 ECO 类型）
