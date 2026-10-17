---
title: "布局布线（PNR / APR）：从 Floorplan 到 Routing"
description: "PNR 完整流程：Floorplan、Placement、CTS、Routing 与优化，各阶段的核心指标与常见问题。"
module: basics
order: 3
references:
  - "《数字集成电路物理设计》第 1 章 集成电路物理设计方法"
  - "《数字集成电路物理设计》第 3 章 布图规划和布局"
  - "《数字集成电路物理设计》第 5 章 布线"
---

# 布局布线（PNR / APR）：从 Floorplan 到 Routing

> **什么是 PNR？** PNR（Place and Route，布局布线），也叫 APR（Auto Placement and Routing）。
> 它把综合后的**门级网表**变成**物理版图（GDSII）**：决定每个 cell 放在哪里、每条线怎么走。
> **数字后端工程师 80% 的日常工作都围绕 PNR**。

---

## 1. PNR 的输入与输出

### 1.1 输入

| 输入 | 格式 | 来源 |
|---|---|---|
| **门级网表** | `.v` / `.vhdl` | 综合工具（DC / Genus） |
| **SDC 约束** | `.sdc` | 综合 / 写 OK 工程师 |
| **物理库（LEF）** | `.lef` | 工艺厂 |
| **时序库（LIB）** | `.lib` | 工艺厂 |
| **IO 约束** | `.io` / tcl | 封装/PCB 工程师 |
| **Floorplan** | tcl | 后端工程师手写 |
| **UPF** | `.upf` | 低功耗设计文件 |
| **特殊网表约束** | tcl | 多电源域 / MACRO 摆放 |

### 1.2 输出

| 输出 | 格式 | 用途 |
|---|---|---|
| **GDSII / OASIS** | `.gds` / `.oas` | 流片 |
| **DEF** | `.def` | 物理信息交换（与人/工具共享） |
| **网表** | `.v` | 反标后的网表 |
| **SPEF** | `.spef` | 寄生参数文件 |
| **时序报告** | 文本 / 时序 | STA 工具读取 |

---

## 2. PNR 流程全景

```
Floorplan → Placement → CTS → Routing → Optimization
  │           │         │        │            │
  │           │         │        │            └→ 时序/功耗/面积再迭代
  │           │         │        └→ Global + Detail Routing
  │           │         └→ Clock Tree Synthesis
  │           └→ Standard Cell Placement
  └→ 电源规划 + Macro 摆放 + Blockage
```

> **面试考点**：面试官问"PNR 流程有哪些步骤"？必须答出 **Floorplan → Placement → CTS → Routing → Optimization** 五大阶段，缺一不可。

---

## 3. 详细步骤

### 3.1 Floorplan（Floorplan / 布局规划）

**目标**：决定芯片的整体形状，摆放 MACRO、电源带，决定 row 方向。

#### 关键决策
| 决策 | 说明 |
|---|---|
| **Die size** | 决定芯片大小（mm × mm） |
| **Core utilization** | Core 内 cell 占面积比例（通常 60-80%） |
| **Aspect ratio** | 长宽比（一般 1:1） |
| **Row orientation** | 标准单元格子行走用（site row，HR / VT） |
| **MACRO 摆放** | SRAM / PLL / PHY 等 |
| **PAC 边界** | Block 之间的边界 |

#### 关键指标
- **Core utilization** = 标准单元面积 / Core 内总面积
- 太低（< 50%）：面积浪费
- 太高（> 85%）：拥塞风险
- **Channel utilization**：通道密度

#### 必背概念

**PAC（Placement and Routing Boundary）**：
- 每个 block 都有 PAC，block 内 PNR 在 PAC 内完成
- PAC 与 Core 之间留 1-2 µm gap（防止 DRC 问题）

**Endcap Cell**：
- 每行标准单元两端加的虚拟 cell
- 保证连续 n 阱
- 工具自动插

**Well Tap Cell**：
- 注入 substrate bias，防止闩锁效应（Latch-up）
- 按 DRC 规则均匀插入

**Decap Cell**：
- 去耦电容，稳定电源
- 按密度规则（如每 50 µm 一个）插入

#### Floorplan 阶段 DRC
- **drc_drc**（Stripe 间距）
- **drc_drc**（Endcap 间距）
- **Tap density**

---

### 3.2 Placement（布局）

**目标**：把每个标准单元放到 row 上最优位置。

#### 子阶段

| 子阶段 | 说明 |
|---|---|
| **Coarse Placement** | 全局粗放，考虑拥塞和时序 |
| **Legalization** | 把 cell 放到 row 上不重叠 |
| **Timing-Driven Placement** | 考虑时序目标 |
| **Congestion-Driven Placement** | 考虑拥塞 |
| **Optimization** | 调 cell 大小、buffer 插入 |

#### 关键指标
- **Congestion map**：每个 GCell 的拥塞程度（0-1），>0.8 表示拥塞
- **Placement density**：每个 GCell 内的 cell 密度

#### 常见问题

| 问题 | 症状 | 修复 |
|---|---|---|
| **拥塞 (Congestion)** | 局部 cell 太密 | 减小局部密度 / 改 floorplan |
| **长 net** | net 跨度过大 | 插入 buffer / 加 buffer 区 |
| **Hold 违例** | Pre-CTS 报告里经常出现，但通常不在这一步全修 | 数据路径太短；留到 Post-CTS 用真实 skew 修 |

---

### 3.3 CTS（Clock Tree Synthesis）

详见 [02-时钟树综合CTS.md](./02-时钟树综合CTS.md)

简单回顾：
- 目标：Skew 最小、Latency 合理、DRC Clean
- 工具：CCOpt-CTS（Cadence Innovus）/ clock_opt + CCD（Synopsys ICC2）
- 输出：时钟树 + 时钟 net

---

### 3.4 Routing（布线）

**目标**：把每个 net 按物理规则连起来。

#### 子阶段

| 子阶段 | 说明 |
|---|---|
| **Global Routing (GR)** | 全局布线，粗略决定每条 net 走哪条 routing channel |
| **Track Assignment (TA)** | 给每条 net 分配具体 track |
| **Detail Routing (DR)** | 实际画线，遵守所有 DRC 规则 |
| **Search and Repair (SAR)** | 修复剩余 DRC |

#### 路由层
- **M1 / M2 / M3 / ...**：金属层
- 低层（薄）：M1、M2——单元内/单元间
- 高层（厚）：M7、U8、U9——长距离、电源、时钟

#### 资源紧张时的策略
- **Track utilization**：> 80% 开始紧张
- **Driven routing**：从拥塞少的层往多的层
- **Reduce track**：减小单元内间距

---

### 3.5 Optimization（优化）

**目标**：修复时序违例、降低功耗、减小面积。

#### 子阶段

| 子阶段 | 说明 |
|---|---|
| **Pre-CTS Opt** | 主要做 Setup / DRV / Congestion；Hold 只处理远超预期 skew 的大违例 |
| **Post-CTS Opt** | 真实 clock，Setup 变严 |
| **Post-Route Opt** | 全真实时序，最后一次优化 |
| **Sign-off Opt** | PT / Tempus 驱动 ECO |

#### ECO（Engineering Change Order）
- 小范围修改网表 / 布局 / 布线
- 通常用于修复后期发现的问题
- 工具：Innovative ECO、DC ECO、PT ECO

---

## 4. Multi-Mode Multi-Corner（MMMC）

### 4.1 为什么需要 MMMC？

现代芯片要满足多个 PVT + 多种工作模式：
- PVT：Process（工艺）、Voltage（电压）、Temperature（温度）
- Mode：Function / Scan / BIST / Sleep

每个组合都要跑一遍 STA = N × M 个 scenarios。

### 4.2 Scenario 定义

```tcl
# 示例：Innovus MMMC
create_analysis_view \
  -name func_ss \
  -constraint_mode func \
  -delay_corner ss_125c

create_analysis_view \
  -name func_ff \
  -constraint_mode func \
  -delay_corner ff_-40c
```

工具把 view 集合起来，PNR 时同时优化多个 view。

---

## 5. 关键 ECO 场景

### 5.1 Timing ECO

**Setup 违例**：
- 调 cell 驱动（X2 → X4）
- 换 fast cell（HVT → SVT → LVT → ULVT，速度递增、漏电也递增）；漏电优先时反向换
- 插入 buffer

**Hold 违例**：
- 插入 delay cell
- 换 slow cell

### 5.2 DRC ECO

- 走线换层
- 调整 spacing
- 改 via 阵列

### 5.3 ECO 流程

```
发现问题 → 生成 ECO 命令 → P&R 工具执行 → 重新检查
```

---

## 6. 物理实现 vs. 综合的区别

| 维度 | 综合 (Synthesis) | PNR (APR) |
|---|---|---|
| 输入 | RTL + SDC + LIB | 网表 + SDC + LEF |
| 输出 | 门级网表 | GDSII |
| 工具 | DC / Genus | ICC2 / Innovative |
| 重点 | 时序、面积、功耗 | 物理布局、时序、DRC |
| 抽象层次 | 逻辑 | 物理 |

---

## 7. 工具链

| 工具 | 厂商 | 特点 |
|---|---|---|
| **Innovative (Innovus)** | Cadence | 业界主流，UI 友好 |
| **IC Compiler II (ICC2)** | Synopsys | DC 兼容，工具链统一 |
| **Tessent** | Siemens EDA | 含 DFT-aware PNR |
| **OpenROAD** | 开源 | 学习/小项目可用 |

---

## 8. 常见问题与排查

### Q1：Floorplan 阶段看到 Core utilization 很高，怎么处理？

**答**：
- 减小 Core utilization 设定
- 把部分 cell 移到远处
- 扩大 chip 面积

### Q2：Placement 后拥塞严重

**答**：
- 检查 MACRO 摆放（可能挡到 routing）
- 加 routing blockage
- 用 partial blockage

### Q3：Routing 后 DRC 大量违例

**答**：
- 检查 antenna 规则
- 检查 dant-drc
- 检查 via 阵列

### Q4：CTS 后 setup 大量违例

**答**：
- Pre-CTS 阶段把 Hold 修得太狠 → 数据路径被插满了 buffer / delay cell，这些延迟直接转成 Setup 负 slack
- CTS skew 不合理 → 调整 CTS 的 skew / latency 目标
- 排查方法：`report_timing` 看违例路径上有没有一串 Pre-CTS 插的 delay cell，有就先撤掉再重算

---

## 9. 实战建议

1. **Floorplan 先做 80% 完美**——后期大改成本极高
2. **Pre-CTS 不要追求 Hold clean**——Hold 留到 Post-CTS / Post-Route 用真实 skew 修；Pre-CTS 硬修是拿 Setup 余量换一个还没算准的数字
3. **CTS 后第一个 1 ns slack 不够，立即排查**
4. **Routing 后遇到 DRC，优先看 via 和 spacing**
5. **Sign-off 前跑一遍完整 ECO 流程**

---

## 10. 推荐阅读

- 《Physical Design Essentials》— Khosrow Golshan
- 《VLSI Physical Design》— A. B. Kahng
- Innovative User Guide
- ICC2 User Guide

---

## 自测题

1. PNR 的五大阶段是什么？每个阶段的目标是什么？
2. Floorplan 中 Core utilization 的合理范围是多少？
3. Placement 后看到 congestion map 拥塞严重，怎么排查？
4. Pre-CTS 和 Post-CTS 的检查重点分别是什么？
5. 什么是 MMMC？为什么需要 MMMC？
6. ECO 是什么？常见 ECO 类型有哪些？
7. 详细解释 Floorplan / Placement / Routing 各阶段的输入输出。
8. 为什么 Post-Route Opt 是最后一次优化机会？