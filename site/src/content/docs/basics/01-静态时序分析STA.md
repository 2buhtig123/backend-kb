---
title: "静态时序分析（STA）：概念、公式与修复策略"
description: "Setup/Hold 公式推导、时序路径分类、修复策略与面试高频问题。"
module: basics
order: 0
---

# 静态时序分析（STA）：概念、公式与修复策略

> **为什么 STA 是核心？** 数字后端工程师的 70% 工作都围绕"时序收敛"——跑通综合、布局布线、时钟树综合后，最终都是为了工具说一句 **"Timing is clean"**。
> 面试时，几乎所有公司都会问 STA。这是**入门必学**模块。

---

## 1. 为什么需要 STA？

### 1.1 数字电路的"正确性"

数字电路只要满足两个时序约束，就能保证功能正确：
- **建立时间（Setup）**：数据必须在时钟沿之前稳定
- **保持时间（Hold）**：数据必须在时钟沿之后稳定

只要全芯片每一条时序路径都满足 Setup 和 Hold，电路在功能上就是正确的。**STA 的任务就是验证这件事。**

### 1.2 为什么要做静态分析？

理论上可以**动态仿真**（给一堆输入看输出对不对），但：
- 输入组合爆炸（10 位寄存器有 1024 种状态，64 位寄存器有 1.8 × 10¹⁹ 种）
- 制造 corner 爆炸（SS / FF / TT × 多个电压 × 多个温度）
- **不可行**，必须静态

STA 把电路抽象成**时序图（Timing Graph）**，用图算法遍历所有路径，检查每条路径的 Setup/Hold slack。

---

## 2. 时序路径的四类

```
起点（Launch Clock）         终点（Capture Clock）
 │
 ▼
 [源寄存器]  --->  [组合逻辑]  --->  [目的寄存器]
 │                                               │
 │                                               │
 ▼                                               ▼
 Launch Edge                                  Capture Edge
```

| 路径类型 | 起点 | 终点 | 检查约束 |
|---|---|---|---|
| **Reg-to-Reg** | 寄存器 CLK | 寄存器 D | Setup + Hold |
| **In-to-Reg** | Input Port | 寄存器 D | Setup + Hold |
| **Reg-to-Out** | 寄存器 CLK | Output Port | Setup + Hold |
| **In-to-Out** | Input Port | Output Port | Setup only（异步路径） |

> **面试考点**：问你"一条完整时序路径包含哪些延迟"？要答出：**Clock Latency + Clock Skew + Cell Delay + Net Delay**。漏一个就要扣分。

---

## 3. 建立时间（Setup Time）— 最常考

### 3.1 公式推导

**Setup Slack 公式**：

```
Setup Slack = (Capture Clock Arrival Time) 
          - (Launch Clock Arrival Time) 
          - (Data Path Delay) 
          - Setup Time Uncertainty 
          - Setup Time of Flip-Flop
```

或者更直观的：

```
Setup Slack = T_cycle - (T_clk2Q + T_logic + T_net + T_setup) - T_uncertainty - T_skew
```

**关键点**：
- Setup Slack ≥ 0 → 时序满足
- Setup Slack < 0 → 时序违例，需要修复

### 3.2 修复策略（必背）

| 修复方法 | 适用场景 | 副作用 |
|---|---|---|
| **降低数据路径延迟** | 通用 | 可能改动逻辑 |
| **增加 cycle 时间**（降频） | 兜底方案 | 性能损失 |
| **Pipeline 切割** | 长组合逻辑路径 | 改 RTL |
| **改 Cell 驱动强度** | 关键路径在某一两级 | 影响面积/功耗 |
| **Buffer 插入** | 长 net 驱动能力不足 | 加面积 |
| **Useful skew** | 时序裕量在两级寄存器间分布不均 | 改时钟树 |
| **逻辑优化** | 关键路径上推一把 | 改 RTL |

> **面试加分项**：能主动区分 **"Setup 违例是频率问题，Hold 违例是制造问题"**，说明对时序的本质理解到位。

---

## 4. 保持时间（Hold Time）— 第二高频

### 4.1 公式推导

**Hold Slack 公式**：

```
Hold Slack = (Data Arrival Time at Capture FF)
         - (Capture Clock Arrival Time)
         - Hold Time Uncertainty
         - Hold Time of Flip-Flop
```

更直观的：

```
Hold Slack = (T_clk2Q + T_logic + T_net) - T_skew - T_hold
```

**关键点**：
- Hold Slack ≥ 0 → 时序满足
- Hold Slack < 0 → 时序违例
- **Hold 与时钟周期无关**——只和"最小延迟路径"相关

### 4.2 修复策略

| 修复方法 | 适用场景 |
|---|---|
| **插入 Delay Cell / Buffer** | 数据路径太短 |
| **降低驱动强度** | 数据路径太短 |
| **改 Cell 类型**（更大延迟的 Cell） | 单个 Cell 延迟太小 |
| **缩短时钟路径** | 时钟 Skew 帮助 Hold |

> **核心考点**：**Hold 违例最常见原因**是时钟树 Skew + 制造 corner 下 Cell 延迟变小（FF corner）。面试官问"Hold 为什么违例"，先答这两个原因。

---

## 5. OCV（On-Chip Variation）— 中高难度考点

### 5.1 什么是 OCV？

OCV 指**同一颗芯片上不同位置**因制造工艺差异导致的延迟偏差：
- 芯片中心（左下）的 Cell 比边缘（右）的 Cell **慢一点**
- 同一颗芯片上，同一型号的 Cell 延迟可能有 ±10% 差异

### 5.2 对时序的影响

如果不考虑 OCV，Setup Slack 会**过于乐观**——它假设 Launch 路径慢、Capture 路径快。但实际可能反过来。

**保守的 OCV Derate**：
- 数据路径：+5%（更慢，更悲观）
- 时钟路径：-5%（更快，更悲观）

这样算出来的 Slack 才安全。

### 5.3 CPPR / CRPR

**CPPR（Clock Path Pessimism Removal）**：识别 Launch 和 Capture 共享的时钟路径，把"重复计算的悲观性"扣除。

```
Setup Slack（含 OCV 悲观） - CPPR = 真实 Setup Slack
```

CPPR 是工具自动做的（PT / Tempus），但你要知道为什么有这个参数——**面试可能问 OCV 和 CPPR 的区别**。

### 5.4 AOCV / POCV

- **AOCV（Advanced OCV）**：根据路径深度和物理距离分级 derate
- **POCV（Parametric OCV）**：把 Cell 延迟建模成正态分布，用 σ 描述

> **进阶考点**：先进工艺（7nm/5nm）必须用 POCV 或 SOCV，老的 derate 不够精确。

---

## 6. 时序例外（Timing Exceptions）

### 6.1 False Path

**定义**：工具认为"这条路径在功能上不会触发"，不要分析。

**例子**：
- 来自不同时钟域的路径（但实际不会跨域）
- 测试模式专用路径（与功能无关）

```tcl
set_false_path -from [get_clocks CLK1] -to [get_clocks CLK2]
set_false_path -through [get_pins U_CORE/scan_en_reg/Q]
```

### 6.2 Multi-Cycle Path

**定义**：数据需要多个时钟周期才能稳定，工具按"多周期"分析。

**例子**：
- 跨时钟域的慢速路径（2 倍周期）
- 某些总线握手（数据每 4 个周期才更新一次）

```tcl
set_multicycle_path 2 -setup -from [get_pins U_REG1/CLK] -to [get_pins U_REG2/D]
set_multicycle_path 1 -hold -from [get_pins U_REG1/CLK] -to [get_pins U_REG2/D]
```

> **经典坑**：Setup 用 N 周期，Hold 必须配对用 N-1 周期——很多新人忘记设 hold。

### 6.3 Max/Min Delay

**定义**：对某些路径直接指定最大/最小延迟约束，绕过一般分析。

**用法**：对 I/O 端口（Input Delay / Output Delay）使用最多。

---

## 7. 模式分析（Mode Analysis）

现代芯片有多种工作模式：
- **Function Mode**：正常功能模式
- **Scan Mode**：DFT 测试模式
- **BIST Mode**：内建自检模式
- **Sleep / Standby Mode**：低功耗模式

每种模式要分别跑 STA——因为时钟、约束、负载都可能不同。

> **面试考点**："你做的项目跑了几种 mode？" → 答 "function + scan + 2 个 mbist + 2 个 shift mode" 显得专业。

---

## 8. Corner 跑签

### 8.1 PVT Corner

| Corner | 工艺 | 电压 | 温度 | 用途 |
|---|---|---|---|---|
| **SS** | Slow | Low | High | Setup 最差 |
| **FF** | Fast | High | Low | Hold 最差 |
| **TT** | Typical | Typical | 25°C | 典型 |
| **SF** | Slow NMOS Fast PMOS | High | Low | Hold 检查 |
| **FS** | Fast NMOS Slow PMOS | Low | High | Setup 检查 |

### 8.2 多模式多 corner（MMMC）

```
Mode1 (Function) × Corner1 (SS125c) + 
Mode1 (Function) × Corner2 (FF-40c) + 
Mode2 (Scan)    × Corner3 (SS125c) + 
...
```

工具会跑所有组合，**全过才算 sign-off clean**。

---

## 9. SI（Signal Integrity）— 进阶

当频率 > 1GHz 或工艺 < 28nm 时，必须考虑 SI：
- **Crosstalk**：相邻 net 通过耦合电容干扰
- 受害者 net 的延迟会变化，可能导致 Hold 违例
- 工具会在 STA 里跑 SI 分析，输出 `incremental delay` 给时序引擎

**修复手段**：
- 增加 spacing（牺牲面积）
- Shielding（接地屏蔽线）
- 改 routing 层

---

## 10. 实战常见问题

### Q1：Setup 违例，Hold 也违例，先修哪个？

**答**：先修 Hold。
- Hold 违例必须**全部修完**才能跑下一步（Hold 与频率无关，越晚修复越复杂）
- Setup 违例可以通过降频、Pipeline 等方式临时缓解

### Q2：Hold 修不掉怎么办？

**答**：检查时钟树 Skew。如果 Capture 时钟路径太短，导致时钟过早到达，可以人为**减慢 Capture 时钟**（skew 偏大帮助 Hold）。

### Q3：什么是 Timing Sign-off Clean？

**答**：
- 所有模式 × 所有 corner 下
- 所有 Setup Slack > 0
- 所有 Hold Slack > 0
- OCV derate 已应用
- SI 已分析
- AOCV/POCV 已应用（先进工艺）

---

## 11. 推荐工具

| 工具 | 厂商 | 用途 |
|---|---|---|
| **PrimeTime (PT)** | Synopsys | 业界标配，Sign-off STA 工具 |
| **Tempus** | Cadence | 后起之秀，与 Innovus 配合好 |
| **Tessent** | Siemens EDA | 时序 + DFT 一体化 |
| **OpenSTA** | 开源 | 学习/小项目使用 |

---

## 12. 推荐阅读

- 《Static Timing Analysis for Nanometer Designs》— J. Bhasker
- Synopsys PrimeTime User Guide
- 《CMOS VLSI Design》中时序章节
- 各公司公开的 STA methodology 文档

---

## 自测题（检验你是否真的懂了）

1. Setup Slack 和 Hold Slack 的公式分别是什么？各与哪些因素相关？
2. Setup 违例和 Hold 违例的常见修复策略各列 5 种。
3. OCV 是什么？为什么需要 CPPR？
4. False Path 和 Multi-Cycle Path 的区别是什么？
5. 同一 corner 下，Setup 和 Hold 哪个先修？为什么？
6. 解释 AOCV 和 POCV 的差异，以及为什么先进工艺需要 POCV。
7. Mode × Corner 的全跑组合，你能列出 3 mode × 3 corner 的 9 种组合吗？
8. SI 分析在哪个阶段做？它会怎样影响时序？

> 答案见 [02-八股题库/时序专题.md]（待补充）