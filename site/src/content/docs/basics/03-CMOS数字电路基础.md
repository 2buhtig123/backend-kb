---
title: "CMOS 与数字电路基础 — 后端工程师的\"数字电路\"卷土重来"
description: "NMOS (n-type)            PMOS (p-type)"
module: basics
order: 2
---

# CMOS 与数字电路基础 — 后端工程师的"数字电路"卷土重来

> **为什么后端工程师还要学 CMOS？**
> - 物理实现后，你看到的不是 RTL，而是晶体管、cell、net
> - STA 里的 delay / transition 来自晶体管级仿真
> - 低功耗设计本质是 CMOS 电路改造
> - 面试官问"反相器延迟怎么算"——答不出来就尴尬了

---

## 1. MOS 管基础

### 1.1 NMOS / PMOS 的符号

```
NMOS (n-type)            PMOS (p-type)
   D ──[G]── G               D ──[G]── G
   │                          │
   S                          S
   ┴                          ┴
 GND                       VDD
```

- **NMOS**：导电沟道是电子，源极接低电位，导通条件 `Vgs > Vth`
- **PMOS**：导电沟道是空穴，源极接高电位，导通条件 `Vgs < -Vth`

### 1.2 四工作区

| 区域 | Vgs 条件 | Vds 条件 | 电流公式 | 用途 |
|---|---|---|---|---|
| **截止区** | Vgs < Vth | 任意 | Ids ≈ 0 | 关断状态 |
| **线性区（triode）** | Vgs > Vth | Vds < Vgs - Vth | Ids = k·[(Vgs-Vth)·Vds - Vds²/2] | 开关导通态 |
| **饱和区（saturation）** | Vgs > Vth | Vds ≥ Vgs - Vth | Ids = (k/2)·(Vgs-Vth)² | 模拟放大 |
| **亚阈值** | Vgs < Vth（接近） | 任意 | Ids = I₀·exp(Vgs/(nVT)) | 漏电流 |

> 📌 **面试考点**：反相器在稳态时，PMOS/NMOS 工作在哪个区？→ 答"一个在截止区，一个在线性区"。

---

## 2. CMOS 反相器 — 最基础的门

### 2.1 结构

```
     VDD
      │
    ┌─┴─┐
    │ P │
    │   ├──── Output
    │ N │
    │   │
    └─┬─┘
      │
     GND
     ↑
     Input
```

- Input = 0：PMOS 导通，NMOS 截止，Output 拉到 VDD
- Input = 1：PMOS 截止，NMOS 导通，Output 拉到 GND
- **静态功耗 ≈ 0**（一个 MOS 永远关着）

### 2.2 反相器延迟

**传播延迟（Propagation Delay）**：
- `tPHL`：高到低延迟（Output 从 1 到 0.5·VDD）
- `tPLH`：低到高延迟
- `tp = (tPHL + tPLH) / 2`

**延迟决定因素**：
- 晶体管尺寸（W/L 越大，驱动越强，延迟越小）
- 输出负载电容（Cload = Cwire + Cinput_of_next_stage）
- 输入转换时间（transition / slew）

经典公式（简化）：

```
tp ≈ C_load × VDD / I_avg
```

### 2.3 反相器链（Inverter Chain）— 驱动大负载

```
In1 → In2 → In3 → In4 →  Load_Cap
```

**最优级数（N）**：
```
N = ln(F) / ln(e)      F = Cload/Cin
```
**每级最优放大比（β）**：
```
β = e ≈ 2.718
```

> 📌 **面试考点**：反相器链的最优级数和放大比？→ 答"N = ln(F)/ln(e)，β = e"。

---

## 3. 组合逻辑门的延迟

### 3.1 NAND / NOR

- **NAND**：两个 NMOS 串联、PMOS 并联
  - 输入全 1 → NMOS 全导通 → 拉 GND（快）
  - 输入任一 0 → 至少一个 PMOS 导通 → 拉 VDD（慢，因为 PMOS 弱）
- **NOR**：两个 PMOS 串联、NMOS 并联
  - 输入全 0 → PMOS 全导通 → 拉 VDD（慢）
  - 输入任一 1 → 至少一个 NMOS 导通 → 拉 GND（快）

**对称性**：
- NAND 比 NOR 快（电子迁移率高于空穴）
- 因此标准单元库里 NAND 的等效电阻比 NOR 小

### 3.2 复杂门（AOI / OAI）

```
AOI21 = AND-OR-Invert
       = !(A&B | C)

OAI21 = OR-AND-Invert
       = !(A&B | C&D)
```

后端工具（如 Synopsys / Cadence）会自动用 AOI/OAI 替换 AND-OR-NOT 组合，**节省面积、降低延迟**。

---

## 4. 功耗基础（基础但重要）

### 4.1 三大功耗

```
P_total = P_dynamic + P_short + P_static
```

#### (a) Dynamic Power（动态功耗）
```
P_dynamic = α · C · VDD² · f
```
- α：翻转率（activity factor）
- C：开关电容
- VDD：供电电压
- f：时钟频率

**降低方法**：
- 降 VDD（最有效，二次方）
- 降频率
- 降电容（缩小面积、改 cell）
- 降低 α（Clock Gating）

#### (b) Short Circuit Power（短路功耗）
- 输入 transition 时，PMOS 和 NMOS 同时导通的瞬间
- 一般占动态功耗 10-20%
- 难以降低，主要靠减小输入 transition

#### (c) Static Power（静态功耗）
```
P_static = VDD · I_leakage
```
- 漏电流 = 亚阈值漏电 + 栅氧漏电 + 反偏 PN 结漏电
- **先进工艺下静态功耗占比越来越大**（3nm 时可达 30-50%）
- 降低方法**：Power Gating、MTCMOS、阈值调整**

---

## 5. Wire Delay（互连延迟）— 后端工程师的痛

### 5.1 为什么 Wire 越来越重要？

| 工艺 | 晶体管延迟 | 线延迟 | 占比 |
|---|---|---|---|
| 0.5µm | 100 ps | 50 ps | 30% |
| 65nm | 20 ps | 80 ps | 80% |
| 7nm | 5 ps | 100+ ps | >90% |

**结论**：先进工艺下，**线延迟占主导**，不再是晶体管本身。

### 5.2 互连模型

```
R    R    R    R    ← 每段电阻
─/\/─\/─\/──
   C    C    C       ← 每段电容
```

分布式 RC 模型（π 型）。延迟近似为 0.4·R·C（Lumped 模型）或 0.5·R·C（Elmore 模型）。

### 5.3 优化 Wire Delay

- **Buffer 插入**：把长线切成几段，每段 RC 单独优化
- **Wire sizing**：加宽线（降低 R，但加 C）
- **Routing layer**：高层 metal 厚、低 R、低 C
- **Shielding**：相邻线接地屏蔽（也减串扰）

---

## 6. 寄生参数（Parasitics）

### 6.1 R, C, RC

- **R**：线的电阻
- **C**：线的电容（对地 + 耦合）
- **RC**：RC 延迟

### 6.2 SPEF / DSPF

寄生参数文件格式：
- **SPEF**（Standard Parasitic Exchange Format）：RC 等效
- **DSPF**（Detailed Standard Parasitic Exchange Format）：分布式 RC

工具用这些文件做 STA，**寄生参数不准 = 时序不准**。

---

## 7. Latch / Flip-Flop 基础

### 7.1 Latch（电平敏感）

```
Input ──┬──[TG]──┬── Output
        │        │
       [Inv]   [Inv+Inv]
        ↑              ↑
       Enable      Enable_b
```

- 电平敏感，使能有效时输入直通
- 难以做 STA（很多 EDA 工具支持有限）

### 7.2 DFF（边沿敏感）

```
Master Latch (active when CLK=0) ──→ Slave Latch (active when CLK=1) ──→ Q
```

- 上升沿采样
- STA 标准 cell

### 7.3 时序参数

| 参数 | 含义 | 典型值 |
|---|---|---|
| **Tcq** | Clock-to-Q 延迟 | 30-100 ps |
| **Tsetup** | 建立时间 | 20-50 ps |
| **Thold** | 保持时间 | 10-30 ps |
| **Tckq_min** | 最小 C2Q 延迟 | 影响 Hold |

---

## 8. 亚稳态（Metastability）

### 8.1 什么是亚稳态？

DFF 在 setup/hold 违例的边缘，输出会在 0 和 1 之间震荡，最终随机稳定到某个值。

### 8.2 MTBF

**Mean Time Between Failures**：

```
MTBF = e^(Tr/Tc) / (T0 · f_clk · f_data)
```

- Tr：亚稳态恢复时间（工艺决定）
- Tc：MTBF 参数
- T0：采样窗口
- f_clk、f_data：时钟/数据频率

### 8.3 CDC（Clock Domain Crossing）

跨时钟域必须用同步器：
- 单 bit：用 2 级 DFF 同步器
- 多 bit：用格雷码 + 同步器，或异步 FIFO

> 📌 **面试考点**："MTBF 怎么算？" → 用上面的公式。

---

## 9. 串扰（Crosstalk）

### 9.1 原理

```
Aggressor (攻击者)         Victim (受害者)
   ─────────────             ─────────────
                ↑
              耦合电容
```

当 Aggressor 翻转时，通过耦合电容 Cc，在 Victim 上感应电压毛刺。

### 9.2 影响

- **Glitch**：毛刺，可能被采样
- **Delay change**：加速或减速受害者的 transition

### 9.3 修复

- 增大 spacing
- Shielding（接地线）
- Buffer insertion
- Routing layer 优化

---

## 10. 工艺角与库

### 10.1 Library Cell

标准单元库由 foundry 提供：
- 每个 cell 有多个 corner 的 lib 文件
- `ss`, `ff`, `tt` 等
- 不同温度、电压

### 10.2 工艺角（Process Corner）

| Corner | NMOS | PMOS | 用途 |
|---|---|---|---|
| **TT** | Typical | Typical | 典型仿真 |
| **FF** | Fast | Fast | Hold 最差 |
| **SS** | Slow | Slow | Setup 最差 |
| **SF** | Slow | Fast | Hold 检查 |
| **FS** | Fast | Slow | Setup 检查 |

---

## 11. 实战问题

### Q1：为什么 CMOS 反相器在稳态时几乎不耗电？

**答**：稳态时 PMOS 和 NMOS 总有一个截止，电流路径是断开的。只有 transition 时才有短路电流。

### Q2：先进工艺为什么反而更耗电？

**答**：
1. 晶体管密度大，漏电流累加
2. Vth 降低，漏电流指数增加
3. Wire delay 占比大，buffer 数量多

### Q3：亚稳态能消除吗？

**答**：不能消除，只能降低概率（MTBF 增大）。用同步器、格雷码、异步 FIFO 等。

### Q4：为什么 NAND 比 NOR 快？

**答**：
1. 电子迁移率高于空穴（μn ≈ 2-3·μp）
2. NAND 串联 NMOS / 并联 PMOS，NMOS 主导导电快
3. NOR 反过来，PMOS 串联是瓶颈

---

## 12. 推荐阅读

- 《CMOS VLSI Design》— N. Weste, D. Harris（后端工程师案头书）
- 《数字集成电路：电路、系统与设计》— Rabaey（中译版）
- 《VLSI Design Methodology》— 各厂商手册

---

## 📝 自测题

1. 画 CMOS 反相器电路图，解释工作原理。
2. NMOS 工作在线性区和饱和区的条件是什么？
3. 反相器链的最优级数和放大比公式是什么？
4. 动态功耗的公式是什么？降低动态功耗有哪几种方法？
5. 先进工艺下 Wire Delay 为什么越来越重要？
6. 什么是亚稳态？MTBF 公式是什么？
7. 串扰产生的原理和影响是什么？
8. 反相器稳态时为什么几乎不耗电？