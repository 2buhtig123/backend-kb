---
title: "时钟树综合（CTS）— 让百万级寄存器同步呼吸"
description: "把时钟想象成\"水管\"，PLL 是水泵，每个寄存器是一个水龙头。"
module: basics
order: 1
---

# 时钟树综合（CTS）— 让百万级寄存器同步呼吸

> **什么是时钟树？** 一颗芯片可能有几百万个寄存器，它们都需要"在同一时刻"收到时钟上升沿。
> 但物理上，时钟从 PLL 出发到每个寄存器的距离不同，走线延迟不同，**时钟不可能同时到达所有寄存器**。
> CTS 的任务，就是**设计一棵让所有寄存器时钟到达时间偏差（Skew）最小的树**。

---

## 1. 为什么需要 CTS？

### 1.1 一个直觉

把时钟想象成"水管"，PLL 是水泵，每个寄存器是一个水龙头。
- 如果水泵压力一样，水管长度不一样，水到达每个龙头的时间不一样
- 这就是**时钟 Skew（偏差）**
- 如果 Skew 太大，**离 PLL 近的寄存器先采数据、远的晚一拍**——Setup 可能违例

### 1.2 CTS 的目标

构建一棵**平衡的时钟分布网络**，使得：
1. **Skew 最小**：所有寄存器的时钟到达时间尽量接近
2. **Latency 合理**：时钟从 PLL 到寄存器的总延迟可控（不能太长，否则 Hold 修不掉）
3. **功耗低**：时钟网络是芯片最大功耗来源之一（典型 30-40%）
4. **DRC Clean**：不违反 dant-dcc、dant-drc、dant-tap 等物理规则

---

## 2. Skew 和 Latency 的精确含义

### 2.1 Clock Latency

```
Clock Latency = Clock Source Latency (PLL → SoC Clock Pin) 
              + Clock Network Latency (Clock Pin → FF CLK Pin)
```

- **Source Latency**：片外延迟，工具一般假设 0 或用 spec
- **Network Latency**：片内延迟，CTS 决定

### 2.2 Clock Skew

```
Skew = max(Latency to any sink) - min(Latency to any sink)
```

- **Local Skew**：相邻寄存器间的 Skew
- **Global Skew**：整个芯片所有寄存器间的最大 Skew

### 2.3 Useful Skew（重要考点）

**传统思路**：把 Skew 减到最小，所有寄存器时钟同时到达。

**Useful Skew 思路**：人为**让某些寄存器早一拍、另一些晚一拍**，把 Skew 当作工具来用：
- **Setup Slack 不够**？让 Launch 寄存器晚一拍、或者 Capture 寄存器早一拍
- **Hold Slack 不够**？反过来

> 📌 **面试考点**："Useful Skew 怎么用？" → 答 "在两个寄存器之间，故意让 Capture 早一拍，把 Setup Slack 借给关键路径"。

---

## 3. 时钟树的物理结构

### 3.1 几种经典结构

#### (a) H-Tree
```
PLL ──┬── H ──┬── H ──┬── ...
      │        │        │
      ▼        ▼        ▼
   sinks   sinks   sinks
```
- 对称结构，Skew 天然小
- **缺点**：面积浪费大，sinks 不一定均匀分布

#### (b) Fishbone
```
PLL ──── 主干 ──── 分支 ──── 分支 ...
            │       │        │
            ▼       ▼        ▼
          sinks   sinks    sinks
```
- 类似鱼骨，分支灵活
- **缺点**：分支长度不一致，Skew 较大，需要 balance buffer

#### (c) Mesh（网格）
```
PLL ──┬───┬───┬─── 
      │ ╳ │ ╳ │ 
      ├───┼───┤
      │ ╳ │ ╳ │
      └───┴───┘
```
- **最 robust**——任意节点断开都能恢复时钟
- **应用场景**：高可靠性芯片（服务器 CPU、汽车）
- **缺点**：功耗大、面积大

### 3.2 现代芯片的实际选择

| 应用 | 推荐结构 | 原因 |
|---|---|---|
| 高端 CPU/GPU | Mesh 或 Multi-dice mesh | 极致 robust |
| 移动 SoC | H-tree + 局部 Fishbone | 平衡 Skew 和面积 |
| 低功耗 IoT | Fishbone + Clock Gating | 省功耗 |
| 汽车功能安全 | Mesh + 冗余 | 可靠性 |

---

## 4. CTS 流程（按工具顺序）

### 4.1 预 CTS（Pre-CTS）

布局已经完成（placement done），时钟树还没建：
- Setup 检查不严（因为还没时钟 Skew）
- **重点**：Hold 检查要 clean
- 所有数据路径延迟使用 placeholder clock latency

### 4.2 CTS 主体

工具按 spec 建树：
1. **识别 sinks**：所有 FF 的 CLK pin、门控时钟、macro 的时钟输入
3. **构建 leaf level（顶叶子级）**：每个 sink 前插入 buffer，平衡每个 sink 到树根的延迟
4. **构建主干**：按 spec 选择结构（H-tree / fishbone / mesh）
5. **优化**：插入驱动、调整 buffer 位置

### 4.3 后 CTS（Post-CTS）

时钟树建完：
- Setup 检查变严（Skew 已确定）
- Hold 检查可能更细（Skew 影响 Hold）
- 优化数据路径（修复 setup/hold violation）
- 时钟树 DRC 检查（dant-drc、dant-dcc）

---

## 5. CTS Spec（Spec 怎么写）

CTS 工具需要 spec 来控制树形：

```tcl
# 定义时钟
create_clock
clock_root -period 10 -name CLK [get_ports CLK]

# 时钟根 pin
set_clock_root CLK_BUF/Z

# 时钟 buffer 列表
set_clock_tree_options -clock CLK \
    -buffer {CK_INV8 CK_INV16 CK_BUFX8} \
    -max_transition 0.1 \
    -max_capacitance 0.2 \
    -max_fanout 25 \
    -target_skew 0.05 \
    -target_max_drant-dcc 0.3

# 时钟门控例外
set_clock_gating_check -setup 0.1 -hold 0.05
```

### 关键 spec 解读

| 参数 | 含义 | 典型值 |
|---|---|---|
| `max_transition` | 时钟 net 最大 transition | 工艺决定 |
| `max_capacitance` | 单个 net 最大负载 | 工艺决定 |
| `max_fanout` | 单个 buffer 最大扇出 | 25-50 |
| `target_skew` | 工具目标 Skew | 50-150 ps |
| `max_drant-dcc` | dant-dcc 最大值 | 0.2-0.3 ns |
| `layer` | 路由层偏好 | M3/M4 以上（高层） |

---

## 6. 高级阻塞：Common Clock Path

### 6.1 概念

**Common Clock Path**：两个寄存器共享的时钟路径部分。

```
PLL → BufA → BufB → Reg1 (Launch)
                └─→ Reg2 (Capture)
              ↑
            共同路径
```

### 6.2 CPPR / CRPR

如果 Launch 和 Capture 共享 BufB 这一段时钟路径：
- BufB 的延迟在 Setup 检查中被算了两次
- 实际对 Skew 没贡献
- 工具自动识别并**算信用点**（CPPR）扣除

> 📌 **面试考点**："CTS 怎么影响 OCV？" → 答 "CPPR 把共同时钟路径的悲观性扣除，让 OCV 分析更准确"。

---

## 7. 时钟门控（Clock Gating）— 功耗关键

### 7.1 概念

寄存器没有数据更新时，时钟关掉，省功耗。

```verilog
always @(posedge clk_gated or negedge rst_n) begin
    if (!rst_n) counter <= 0;
    else if (enable) counter <= counter + 1;
end
```

### 7.2 集成门控（Integrated Clock Gating, ICG）

```
PLL ──→ ICG Cell ──→ Registers
         ↑     
       enable
```

ICG 单元是专用 cell，**Latch + AND 门**，避免毛刺。

### 7.3 面试常问：门控时钟对 CTS 的影响

1. ICG 也算时钟树的一部分，要被 CTS 平衡
2. Setup/Hold 检查要算 ICG 的延迟
3. 门控时钟的 setup/hold 检查（`set_clock_gating_check`）
4. 门控时钟可能产生新 skew

---

## 8. 多时钟域 CTS

一颗芯片有多个时钟域：
- CPU 域（高频）
- DDR 域（高频）
- 外设域（低频）
- Always-on 域（不掉电）

每个域**独立做 CTS**，域间有异步路径（CDC），不走 CTS。

> 📌 **面试考点**：你做的项目有几个 clock domain？答 "12 个，其中 4 个 always-on" 显得真实。

---

## 9. OCV 对 CTS 的影响

OCV 让同一颗芯片不同位置的 Cell 延迟不一样 → Skew 也带 OCV 偏差。

**CTS 工具会做的事**：
- 主动加 5-10% 的 Skew margin
- 用 AOCV/POCV 重新分析
- 在关键路径加 buffer "抵抗" OCV

---

## 10. 实战问题与排查

### Q1：CTS 跑完后 Setup 反而变差了？

**答**：因为 Skew 暴露出来了，pre-CTS 时假设 ideal clock 没 Skew。修复方法：
- 调整 CTS 关键路径上的 buffer
- 加 useful skew
- 改 RTL（pipeline 切割）

### Q2：Clock Skew 怎么报告？

```tcl
report_clock_timing -type skew
report_clock_timing -type latency
report_clock_timing -type dant-dcc
```

### Q3：Skew 太大怎么办？

- 检查 sink 分布（局部 sink 太多）
- 调整 spec（target_skew 收紧）
- 改 buffer 大小
- 局部手动建分支

### Q4：Clock DRC 违例怎么修？

- `max_transition` 违例：加 buffer
- `max_capacitance` 违例：加 buffer
- `max_dant-dcc` 违例：调整分支长度

---

## 11. 工具链

| 工具 | 厂商 | 特点 |
|---|---|---|
| **CCOpt** | Synopsys | ICC2 内置，与综合无缝衔接 |
| **Innovus CTS** | GTS / Cadence | 业界广泛，UI 友好 |
| **Tempus** | Cadence | 与 Innovus 同一生态 |
| **Tessent** | Siemens EDA | 含 DFT-aware CTS |

---

## 12. 推荐阅读

- 《VLSI Digital Signal Processing Systems》— K. Parhi
- 《Clock Distribution Networks in VLSI》— E. Friedman
- Synopsys CTS Methodology Guide
- Innovus Clock Tree Synthesis User Guide

---

## 📝 自测题

1. 什么是 Useful Skew？举例说明它怎么帮助 Setup 收敛。
2. Skew 和 Latency 的精确定义是什么？它们的区别？
3. H-Tree、Fishbone、Mesh 三种结构各有什么优缺点？
4. 解释 CPPR/Common Clock Path，为什么 CTS 后 OCV 分析更准？
5. Pre-CTS 和 Post-CTS 的检查重点有什么不同？
6. Clock Gating 的 ICG Cell 是什么？为什么需要它？
7. 多时钟域芯片怎么跑 CTS？
8. Skew 太大的常见原因和修复方法？