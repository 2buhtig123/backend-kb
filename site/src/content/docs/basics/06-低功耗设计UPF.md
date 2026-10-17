---
title: "低功耗设计（UPF / Power Intent）：电源域与功耗控制"
description: "UPF 电源意图描述：电源域、隔离、电平转换、电源开关与 retention，以及动态/静态功耗构成。"
module: basics
order: 5
references:
  - "《数字集成电路物理设计》第 9 章 低功耗设计技术与物理实施"
---

# 低功耗设计（UPF / Power Intent）：电源域与功耗控制

> **为什么需要低功耗设计？**
> - 待机时间决定用户体验
> - 散热决定性能上限
> - **先进工艺（28nm 以下）静态功耗占比 30-50%**，必须 Power Gating
> - 面试中、低、高公司都爱问 UPF

---

## 1. 三大功耗基础

### 1.1 三大功耗回顾**（详见 CMOS 基础篇）**

```
P_total = P_dynamic + P_short + P_static
```

- **P_dynamic = α · C · VDD² · f**（动态，运行时）
- **P_short**：短路功耗（transition 期间）
- **P_static = VDD · I_leakage**（漏电）

### 1.2 低功耗策略总览

| 目标 | 方法 | 效果 |
|---|---|---|
| 降 P_dynamic | Clock Gating、Power Gating、降 VDD、降频率 | 立竿见影 |
| 降 P_short | 减小 input slew、限 slew | 较难 |
| 降 P_static | Vt Swap、Power Gating、长沟道器件 | 较大 |

---

## 2. UPF（Unified Power Format）

### 2.1 什么是 UPF？

UPF 是 **IEEE 1801** 标准，描述芯片的电源意图（Power Intent）。

```
RTL + SDC + UPF → DC / Genus / Innovus 产生低功耗网表
```

### 2.2 UPF 核心概念

| 概念 | 含义 |
|---|---|
| **Power Domain** | 共享同一电源的逻辑集合 |
| **Supply Port** | 电源端口 |
| **Supply Net** | 电源网络 |
| **Power Switch** | 电源开关（用于 Power Gating） |
| **Isolation** | 隔离单元（Power Gating 后保护输出） |
| **Retention** | 状态保持（Power Gating 时保留 FF 状态） |
| **Level Shifter** | 电平转换（不同电压域之间） |

### 2.3 UPF 示例（简化）

```tcl
# 定义电源域定义
create_power_domain TOP
create_power_domain CORE -elements {u_core}

# 定义电源网络
create_supply_port VDD_TOP
create_supply_net VDD_TOP -domain TOP
create_supply_port VDD_CORE
create_supply_net VDD_CORE -domain CORE

# Power Switch
create_power_switch SW_CORE \
  -domain CORE \
  -input_supply_port {in VDD_TOP} \
  -output_supply_port {out VDD_CORE} \
  -control_port {ctrl u_ctrl/sleep_n} \
  -on_state {on !ctrl}

# Isolation
set_isolation ISO_OUT_CORE \
  -domain CORE \
  -applies_to outputs \
  -clamp_value 0 \
  -isolation_signal u_ctrl/sleep_n

# Retention
set_retention RET_CORE \
  -domain CORE \
  -save_signal {u_ctrl/save} \
  -restore_signal {u_ctrl/restore}
```

---

## 3. Power Gating

### 3.1 什么是 Power Gating？

把暂时不工作的模块**直接关掉电源**，消除漏电。

```
ON 状态：VDD_CORE ──→ CORE（漏电 = full）
OFF 状态：VDD_CORE ──[SWITCH]─/─→ CORE（漏电 ≈ 0）
```

### 3.2 Power Switch

- 通常是 **Header PMOS**（靠近 VDD）
- 也可以是 **Footer NMOS**（靠近 GND）
- 控制信号来自 always-on 域（避免同时被关）

### 3.3 Power Switch 设计考虑

| 维度 | 考量 |
|---|---|
| **驱动能力** | 决定 wakeup 时间 |
| **电流容量** | 决定最大支持模块大小 |
| **Rush current** | 多个 switch 同时开会产生浪涌 |
| **Wakeup time** | 从关到开所需时间 |

### 3.4 唤醒序列（Wakeup Sequence）

```
1. Power Switch 开启
2. 等 VDD_CORE 稳定（去耦电容充电）
3. 释放 Isolation（让输出可被驱动）
4. 释放 Retention Restore（恢复 FF 状态）
5. 模块正常工作
```

---

## 4. Isolation（隔离）

### 4.1 什么是 Isolation？

当某个域被 Power Gating 后，它的**输出会变成浮空**：
- 接收端可能读到一个不确定值
- 引起接收域的短路电流

**Isolation 单元**保护接收域：当发送域被关时，把输出钳到固定值（0 或 1）。

```
POWER DOMAIN A (已关闭)        POWER DOMAIN B (在运行)
       │                              │
 [Logic]───X───[ISO Cell]───[Logic]   │
                ↑                      
          控制信号（always-on 域）
```

### 4.2 Isolation 类型

| 类型 | 特点 |
|---|---|
| **Clamp-to-0** | 输出钳到 0 |
| **Clamp-to-1** | 输出钳到 1 |
| **AND-OR 隔离** | 单门低功耗（适用于小模块） |
| **专用 ISO Cell** | 多门优化（适用于大模块） |

### 4.3 隔离信号时序

```
       Power Domain 关断
            │
            ▼
 ┌──────── 几十 ns ────────┐
 │                         │
t=0       ISO 有效       t=开关稳定
```

> ISO 必须在 Power Switch 关闭**之前**有效。

---

## 5. Retention（状态保持）

### 5.1 什么是 Retention？

Power Gating 后，模块内 FF 状态**全部丢失**。如果需要保留：
- 用 **Retention FF**（专用 cell）
- Power 关后，仍保持状态（用 always-on 电源）

### 5.2 Retention FF 原理

```
Retained FF = 主 FF + 影子 FF + 电源开关
            ↑        ↑         ↑
        主电源    always-on    控制保存/恢复
```

### 5.3 Retention 信号

- **Save Signal**：保存当前状态到影子 FF
- **Restore Signal**：恢复状态到主 FF

### 5.4 Retention vs Isolation 选择

| 场景 | 选择 |
|---|---|
| 模块很快又开 | Retention（避免状态重建） |
| 模块长时间关 | Isolation（足够） |
| 状态不重要 | Isolation（省功耗） |
| 状态重要 | Retention |

---

## 6. Multi-Voltage Design（多电压设计）

### 6.1 什么是多电压？

不同模块用**不同电压**，按性能需求供电
- CPU 满载：1.0 V
- CPU 待机：0.7 V
- Always-on：0.85 V

### 6.2 DVFS（Dynamic Voltage Frequency Scaling）

```
P_dynamic = C · V² · f
```

降 VDD + 降 f = **立方级省功耗**

### 6.3 跨电压域问题

- 不同电压域的信号**电平不同**
- 直接连接会破坏电平、引起短路

**Level Shifter（电平转换器）**解决问题：
- 低 → 高：高电平域识别低电平域信号
- 高 → 低：一般不需要（低电平域可读高电平）

---

## 7. Clock Gating（时钟门控）

### 7.1 与 Power Gating 的区别

| 维度 | Clock Gating | Power Gating |
|---|---|---|
| 关掉 | 时钟 | 整个电源 |
| 适用 | 短时停（每周期/每个 burst） | 长时间停（µs 级以上） |
| 漏电 | 仍有（寄存器静态） | 关断时漏电 ≈ 0 |
| 实现 | ICG cell | Power switch + isolation |
| 延迟 | 当周期恢复 | 数十 µs 唤醒 |

### 7.2 ICG Cell

```
PLL ──→ ICG ──→ Registers
       ↑
     enable
```

- 内部 latch + AND 门
- 避免毛刺

---

## 8. Vt Swap（阈值电压交换）

### 8.1 三种 Vt

| Vt | 速度 | 漏电 |
|---|---|---|
| **LVT** (Low Vt) | 快 | 高 |
| **SVT** (Standard Vt) | 中 | 中 |
| **HVT** (High Vt) | 慢 | 低 |

### 8.2 使用策略

- **关键路径**：用 LVT（速度优先）
- **非关键路径**：用 HVT（漏电优先）
- **平衡**：SVT

工具自动做 Vt swap（多数 PNR 工具支持）。

---

## 9. MTCMOS（Multi-Threshold CMOS）

### 9.1 什么是 MTCMOS？

把逻辑电路用 **LVT/SVT**（快）+ 电源开关用 **HVT**（慢但漏电小）。
- 正常时低 Vt cell 工作，性能好
- 休眠时通过 HVT switch 完全关断，漏电小

### 9.2 应用场景

- SoC 中的**深睡眠**模式
- 大块 IP 的 Power Gating

---

## 10. UPF Flow 实例

```
RTL + SDC + UPF
      ↓
 DC / Genus（综合）
      ↓
 PNR（ICC2 / Innovative）
      - power domain aware
      - IR drop aware
      - timing closure
      ↓
 PV（Calibre）
      - LVS (含 UPF 信息)
      - DRC
      ↓
 Sign-off
```

---

## 11. 工具支持

| 工具 | UPF 支持 | 特点 |
|---|---|---|
| **DC / Genus** | 支持 | 综合阶段插入 power switch / isolation / retention |
| **ICC2 / Innovative** | 支持 | PNR 阶段按 UPF 做特殊布局布线 |
| **PrimeTime** | 支持 | UPF-aware STA |
| **Calibre** | 支持 | UPF-aware LVS |

---

## 12. 实战问题

### Q1：Power Domain 切换顺序？

**答**：
1. Retention save（先把 FF 状态存进影子寄存器）
2. Isolation 有效（钳住输出，保护接收域）
3. Power Switch 关断（断电）
4. 等待电源泄放到 0
5. 模块关闭

注意顺序不能反：isolation 必须在断电**之前**生效，retention save 也必须在断电之前完成——否则关断瞬间输出浮空会往接收域灌电流，状态也随电源一起丢了。

反向：
1. Power Switch 开启
2. 等电源稳定
3. Retention restore
4. Isolation 释放
5. 模块正常工作

### Q2：Power Gating 后 IR Drop 严重？

**答**：
- 电源 wakeup 时电流冲击（rush current）
- 增加去耦电容（Decap Cell）
- 错峰开启 power switch
- 加宽 power routing 地网

### Q3：Isolation Cell 与 Level Shifter 的区别？

**答**：
| 维度 | Isolation | Level Shifter |
|---|---|---|
| 用途 | 保护关断域的输出 | 转换不同电压的电平 |
| 时机 | Power off 时 | 正常工作 |
| 数量 | 通常 1 个 | 跨电压域信号 |

### Q4：Retention 一定能省功耗吗？

**答**：Retention 比 Isolation **多一个影子 FF**，本身多 30-50% 漏电。
- 只在状态很重要时用 Retention
- 否则用 Isolation 即可

---

## 13. 推荐阅读

- IEEE 1801-2018（UPF 标准）
- Synopsys UPF User Guide
- 《Low Power Methodology Manual》— Synopsys（经典）
- 《Power Gating》— IEEE 期刊文章

---

## 自测题

1. 动态功耗公式是什么？降 VDD 为什么对动态功耗影响最大？
2. UPF 是什么？包含哪些核心概念？
3. Power Gating 与 Clock Gating 的区别？各适用什么场景？
4. Isolation Cell 的作用是什么？什么类型？什么时候有效？
5. Retention FF 与普通 FF 的区别？什么时候必须用 Retention？
6. Level Shifter 什么时候必须用？
7. Power Switch 是什么？有哪些设计考量？
9. 描述 Power Gating 的唤醒过程。
10. 多电压设计的 DVFS 为什么能立方级省功耗？