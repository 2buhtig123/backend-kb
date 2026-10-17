---
title: "八股题库 · 04 功耗与 IR Drop"
description: "功耗与 IR Drop 专题：动态/静态功耗构成、功耗估算方法、IR Drop 分析与修复。"
module: interview
order: 3
references:
  - "《数字集成电路物理设计》第 7 章 功耗分析"
verified: true
---

# 八股题库 · 04 功耗与 IR Drop

> **数字 IC 后端的"双胞胎"话题**。功耗定芯片能跑多快，IR Drop 定芯片能跑多稳。
> 本专题 11 道题，覆盖动态/静态功耗、IR Drop 分析、EM 失效、Decap 策略、Power Rail 设计。

---

## 一、核心概念速查

### 1.1 功耗组成

| 类型 | 来源 | 占比（典型） | 优化手段 |
|---|---|---|---|
| **动态功耗（Switching）** | 充放电电容 + 短路电流 | 60%~80% | 门控时钟、降低电压频率 |
| **静态功耗（Leakage）** | 漏电流（sub-threshold / gate）| 20%~40% | Vt Swap、Power Gating |
| **短路功耗** | 转换瞬间 PMOS+NMOS 同时导通 | < 5% | 工艺自动优化 |

**动态功耗公式**：
```
P_dynamic = 1/2 × α × C × V² × f   （《数字集成电路物理设计》p.173 式 7-10：P = 1/2 · α · f_CLK · C_L · V_DD²）
α = switching activity（翻转率，0~1）
C = 负载电容
V = 电压
f = 频率
```

> **关键洞察**：电压是功耗最大变量，**降低 10% 电压 → 降低 19% 功耗**。

### 1.2 IR Drop

**定义**：包含两种形式——内部节点电源电压 V_DD 低于供电凸点的**电压降**，以及内部节点地电压 V_SS 高于供电凸点的**地弹**（ground bounce，《数字集成电路物理设计》p.175）。合称 IR Drop，导致 cell 实际电压低于标称值。

**两类**：
- **Static IR Drop**：平均电流导致的压降。芯片稳态工作即可见。
- **Dynamic IR Drop**：瞬态大电流（如 clock 边沿、burst write）导致的压降。**更致命**——通常 2~3x 静态值。

**影响**：
- IR Drop 5% → 互连线延迟增大约 10%~15%（书中算例约 9.5%，p.178），进而引发时序违例——不要低估成 5%
- IR Drop 10% → 功能错误（hold/setup 违例）
- IR Drop > 15% → latch-up 风险

**经验阈值**：

| 类型 | 阈值（VDD 比例） | 工艺相关 |
|---|---|---|
| Static IR Drop | < 3% | 全部 |
| Dynamic IR Drop | < 5%~7% | 7nm 严格 |
| Total（VDD 压降 + 地弹）| < 5% VDD | 书上要求：电源和地弹总电压降控制在供电电压的 5% 以内（《数字集成电路物理设计》p.177） |

### 1.3 EM（Electromigration）

**定义**：高电流密度下，金属走线中的金属原子被电子"撞"走，导致走线断裂或短路。

**公式**：`J = I / (W × t)`（电流密度，mA/μm²，t 为该层金属厚度）。foundry 规格常直接给「单位宽度电流」上限（mA/μm），此时不再除 t，注意单位对应

**经验阈值**：

| 金属层 | 最大 J（mA/μm²） |
|---|---|
| M1~M3（薄）| 1.5 ~ 3 |
| M4~M6（中）| 2 ~ 4 |
| M7~M9（厚）| 3 ~ 6 |
| AP（铝 pad）| 5 ~ 10 |

**EM 修复**：
- 加宽走线
- 多打 Via（double/triple via）
- 多条线并行（multi-cut）

---

## 二、11 道高频面试题

### 题 1：动态功耗公式是什么？影响最大的是哪个参数？

**参考答案**：

```
P_dynamic = 1/2 × α × C × V² × f   （《数字集成电路物理设计》p.173 式 7-10：P = 1/2 · α · f_CLK · C_L · V_DD²）
```

| 参数 | 物理意义 | 影响 |
|---|---|---|
| α | switching activity | 工艺/设计决定，难改 |
| C | 负载电容 | 通过 cell 选择可优化 |
| V | 电压 | **影响最大**——平方关系 |
| f | 频率 | 业务决定 |

**关键洞察**：
- V 降 10% → P 降 19%
- f 降 50% → P 降 50%
- α 降 50% → P 降 50%
- **降低电压最划算**——这就是 DVFS 存在的理由

**加分点**：
- 提到 "α 与 V 的 trade-off：低 V 通常带来高 α（cell delay 上升，需要更多 cell toggle）"
- 提到 "短路功耗 P_sc = V × I_sc × t_r，转换时间越短越大"
- 提到 "动态功耗是 V²f 关系，但 leakage 反而随 V 降低指数增长——存在最优 V"

---

### 题 2：什么是 IR Drop？Static 和 Dynamic 区别？

**参考答案**：

| 项 | Static IR Drop | Dynamic IR Drop |
|---|---|---|
| 时机 | 芯片稳态 | 时钟边沿 / burst 操作瞬间 |
| 起因 | 平均电流 | 峰值电流（短时尖峰） |
| 量级 | 3%~5% | 5%~15%（2-3x static） |
| 分析工具 | Voltus (静态) | Voltus / RedHawk (动态) |
| 修复重点 | PG mesh 宽度 | Decap、clock staggering |

**为什么 Dynamic 更严重？**
- Clock 边沿翻转 → 1~3 个 cycle 内**所有 clock cell 同时切换**
- Peak current 可以是 average 的 5~10 倍
- 即使 PG mesh 够宽，**瞬态响应跟不上**

**加分点**：
- 提到 "dynamic IR drop 与 clock skew 有关——clock 不对齐会拉低 peak"
- 提到 "decap cell 是修复 dynamic IR drop 的关键"

---

### 题 3：PG Mesh 怎么设计？为什么必须够宽？

**参考答案**：

**PG Mesh** = Power/Ground 的网格状走线，通常在高层（M5/M6/M7）水平+垂直方向铺通。

**设计原则**：
1. **垂直+水平十字交叉**（cross pattern），形成低电阻通路
2. **宽线 + 多 via**：M5 走 power，宽度 2~5μm
3. **均匀分布**：核心区每 50~100μm 有一条 stripe
4. **连接到 power pad**：通过 ring + pad ring

**为什么必须宽？**

```
R = ρ × L / (W × t)
```

- L（走线长度）固定
- W 增 → R 降 → IR drop 降
- 多 via → 接触电阻降

**实战经验**：
- 7nm 工艺 PG mesh 通常占 15%~20% 的 M5/M6 资源
- Memory 区域 PG 必须加密（电流密度高）
- High-current 模块（PLL、SerDes）单独加 PG rail

**加分点**：
- 提到 "M5 走 power，M6 走 ground（错层避免短路）"
- 提到 "PG mesh 占用 routing 资源——mesh 越密，可用 signal track 越少，要 trade-off"
- 提到 "Innovus 里 `addStripe` / `sroute` 命令"

---

### 题 4：什么是 Decap Cell？工作原理和数量怎么定？

**参考答案**：

**Decap（Decoupling Capacitor）Cell** = 充当局部"电荷池"的标准单元，连接 VDD/VSS。

**工作原理**：
- 单元需要电流时 → 从最近的 decap 拿（无需走远）
- 减少本地 IR Drop 和 supply noise
- 关键路径上 decap 必须离 cell 极近（< 30μm）

**类型**：
- **MOS Decap**：用 MOS 电容，密度高，但 leakage 较大
- **MIM/MOM Decap**：金属-绝缘体-金属电容，无 leakage，但密度低

**数量估算**：

```
Decap Area = (Peak_Current × Δt) / (ΔV × C_per_Unit)
```

**实战密度**：
- 5%~10% 的 std cell area 是 decap
- High-activity 区域（clock tree、SRAM）更高
- Latch-up 风险区也要补

**加分点**：
- 提到 "Decap placement 必须是 `legalize` 的——不能 floating"
- 提到 "Decap 在 netlist 里仍是 cell，但内部 input 接 GND，output 接 VDD"
- 提到 "Decap 不能太多——过多占面积，leakage 反而上升"

---

### 题 5：什么是 Clock Gating？它如何降低功耗？

**参考答案**：

**Clock Gating**（门控时钟）：在不需要时钟的寄存器前加一个 AND/OR gate，由 enable 信号控制。

**原理**：
- 模块 idle 时 → enable = 0 → gated clock 停摆 → 寄存器不翻转
- **降低 switching activity（α）**
- 关键：把动态功耗的"无效翻转"消除

**两种实现**：

| 类型 | 实现 | 适用 |
|---|---|---|
| **Latch-based** | enable 锁存 + AND gate | 综合工具自动插入（推荐） |
| **AND-based** | 直接 AND | 不推荐（glitch 风险） |

**收益估算**：
- 门控后 α 从 0.5 降到 0.1 → 动态功耗降 80%
- 整个 SoC 通常可降 30%~50% 动态功耗

**加分点**：
- 提到 "Power Compiler / Genus 自动识别寄存器组插入 gating"
- 提到 "Clock Gating 能省掉门控点**下游**时钟树与该组 FF 的时钟功耗——ICG 关断后下游整棵子树不再翻转；但 ICG **上游**那段时钟网络仍在 toggle，要彻底消除得靠 Power Gating"
- 提到 "Power Gating 才是真正关掉 clock 树"

---

### 题 6：什么是 Power Gating？和 Clock Gating 区别？

**参考答案**：

| 维度 | Clock Gating | Power Gating |
|---|---|---|
| 关掉什么 | 时钟信号 | 整个电源域（VDD） |
| 省功耗 | 动态（仅 switching）| 动态 + 静态（leakage 也降）|
| 工具支持 | 综合自动 | UPF 手动指定 |
| 代价 | 极低 | 面积 + 设计复杂度 |
| 唤醒时间 | 1 cycle | μs 级（retention 解锁） |
| 适用 | 所有设计 | 低功耗 SoC（手机、IoT） |

**Power Gating 实现**：
- **Header Switch**：在 VDD 和模块之间插 PMOS
- **Footer Switch**：在 VSS 和模块之间插 NMOS
- 关闭时模块完全断电
- 唤醒需要 retention cell（保留 register 状态）

**加分点**：
- 提到 "Power Gating 需要 UPF 描述，工具按 UPF 综合"
- 提到 "Power Gating 的唤醒时间由 retention 寄存器决定"
- 提到 "always-on 域不能被 gate——如 wake-up controller"

---

### 题 7：什么是 EM（电迁移）？怎么检查和修复？

**参考答案**：

**EM（Electromigration）**：金属走线中，电子流冲击金属原子，导致原子迁移、走线断裂或相邻走线短路。

**检查**：
1. 工具：Voltus / RedHawk / StarRC
2. 看 `report_em` 输出
3. 超过工艺厂规定的 J_max 即违例

**修复方法**：

| 方法 | 适用 | 代价 |
|---|---|---|
| 加宽走线 | 单条线 EM | 占 routing 资源 |
| Double/Triple Via | Via 位置 EM | 容易，工具自动做 |
| 增 PG stripe | PG rail 上电流过大 | 占 M5/M6 |
| 多打 tap | Power pad 附近 | 简单 |
| 改 routing 拓扑 | 大电流路径 | 改 floorplan |

**关键参数**：

| 金属层 | J_max (mA/μm²) |
|---|---|
| M1/M2（薄）| 1.5 |
| M3/M4 | 2~3 |
| M5/M6 | 4 |
| M7/M8（厚）| 5~6 |
| AP | 8~10 |

**加分点**：
- 提到 "EM 随温度上升变差（10℃ 升温，寿命减半）"
- 提到 "AC EM（双向电流）比 DC EM（单向）宽松"
- 提到 "Via 处的 EM 容易被忽视——多打 via 是最有效手段"

---

### 题 8：Power Plan 设计的主要步骤是什么？

**参考答案**：

**完整流程**：

1. **定义 Power Domain**（按 UPF）
2. **Power Pad 分配**：每个 domain 至少 1 对（VDD/VSS）pad
3. **Power Ring**（外圈）：连接 power pad
4. **Power Stripe**（核心区）：水平和垂直方向的 PG rail
5. **Power Rail**（行内）：M1 方向每 row 一条 VDD/VSS
6. **Follow Pin**（可选）：cell 内自带 VDD/VSS pin
7. **Decap 分布**：关键路径附近加密
8. **EM / IR Drop 验证**：用 Voltus 仿真

**关键参数**：

| 工艺 | Ring 宽度 | Stripe 间距 | Stripe 宽度 |
|---|---|---|---|
| 28nm | 5~10μm | 30~50μm | 2~3μm |
| 7nm | 8~12μm | 20~40μm | 1~2μm |
| 3nm | 10~15μm | 15~30μm | 1~1.5μm |

**加分点**：
- 提到 "Power Stripe 必须连接到所有 std cell row 的 M1 rail"
- 提到 "Multi-Vt 设计中，Power Plan 需要配合 Vt swap 重新评估"
- 提到 "Always-on domain 的 power 单独走，避免被 gated domain 干扰"

---

### 题 9：什么是 Multi-Vt（多阈值）设计？怎么用？

**参考答案**：

**Multi-Vt** = 在同一设计中混用 HVT（高阈值）、SVT（标准阈值）、LVT（低阈值）cell。

| Vt 类型 | 速度 | 静态功耗 | 适用 |
|---|---|---|---|
| **HVT** | 慢 | 极低 | 非关键路径（省 leakage） |
| **SVT** | 中 | 中 | 默认 |
| **LVT** | 快 | 高 | 关键路径（救 timing） |

**使用方法**：
1. 综合时用 `-target_library` 包含多 Vt lib
2. 综合工具自动在 slack 差的路径上 swap LVT
3. 时序收敛后,后端工具把非关键路径 swap 回 HVT
4. **目标**：在不违反 timing 前提下最大化 HVT 占比

**收益**：
- 整体 leakage 可降 30%~50%
- 关键路径性能不变

**加分点**：
- 提到 "Vt swap 在 post-CTS / post-Route 阶段各做一轮"
- 提到 "Vt swap 会改变 cell delay——要重新跑 timing"
- 提到 "LVT 太多会反向破坏 IR Drop（leakage 大 → 静态电流大）"

---

### 题 10：什么是 Voltage Drop Analysis？你怎么做？

**参考答案**：

**Voltage Drop Analysis**（压降分析）：通过 SPICE-like 仿真，计算芯片工作时所有 cell 实际电压。

**步骤**：
1. **提取 RC 网络**：从 LEF/DEF 提取 PG network 的电阻
2. **电流模型**：从 VCD/FSDB 仿真波形提取 switching current
3. **仿真求解**：用 Voltus / RedHawk 跑 power network 仿真
4. **分析结果**：画 IR Drop Map，找出 hot spot
5. **迭代修复**：调 PG mesh、加 decap、调 floorplan
6. **重新验证**

**检查清单**：
- 静态 IR Drop：< 3% VDD
- 动态 IR Drop：< 5%~7% VDD
- EM：每条走线 J < J_max
- Latch-up 风险：hot spot VDD < 0.7×Vdd_min

**加分点**：
- 提到 "需要 VCD/FSDB 波形，仿真时长通常 1~10ms 真实工作场景"
- 提到 "Voltus 与 PrimeTime 联合仿真，PT 给 timing context，Voltus 给 voltage"
- 提到 "Dynamic IR drop 仿真需要 clock gating aware 的 VCD"

---

### 题 11：低功耗设计的整体策略有哪些？

**参考答案**：

按功耗影响排序，从大到小：

| 优先级 | 策略 | 收益 | 代价 |
|---|---|---|---|
| 1 | **降低 V/f**（DVFS） | 30%~60% | 系统级 |
| 2 | **Power Gating** | 50%~90% | UPF、retention cell |
| 3 | **Clock Gating** | 30%~50% | 几乎无 |
| 4 | **Multi-Vt** | 20%~40% | 多 lib |
| 5 | **Logic 优化**（减少 toggle）| 10%~20% | RTL |
| 6 | **DVFS + Clock Gating + Vt 组合** | 综合最优 | 综合 |
| 7 | **Memory 低功耗**（Light Sleep、Deep Sleep）| 30%~50% | SRAM 编译器 |
| 8 | **Clock Tree 优化**（mesh、gating）| 10%~20% | CTS 阶段 |
| 9 | **隔离与 retention** | 配合 power gating | UPF |
| 10 | **Header/Footer Switch** | 配合 power gating | 标准单元 |

**完整设计流程**：
1. RTL 阶段规划 power intent（UPF）
2. 综合时插入 gating、生成 multi-Vt
3. 物理实现时实现 UPF 拓扑
4. CTS 阶段优化 clock tree power
5. Sign-off 时跑 IR Drop + Power

**加分点**：
- 提到 "DVFS 收益最明显但需要 PMIC 配合"
- 提到 "Power Gating 与 DVFS 经常组合用——idle 时 gate，active 时 DVFS"
- 提到 "Retention 寄存器的静态功耗比标准寄存器高——评估 retention cell 数量"

---

## 三、综合题（开放题）

### 题 12：项目里遇到严重 Dynamic IR Drop，你怎么定位和解决？

**参考答案框架**：

1. **确认问题**：
 - 用 Voltus 跑 dynamic IR drop
 - 看 hot spot 在哪个模块

2. **定位原因**：
 - 是不是 clock tree 太密 → clock flip 同时翻转
 - 是不是 memory burst 写入瞬态电流大
 - 是不是某个模块有"雪崩翻转"（所有 gate 同时 toggle）

3. **修复**（成本由低到高）：
 - 加密 PG stripe / 加 decap
 - clock staggering（让不同模块 clock 边沿错开）
 - 改 floorplan 把 hot module 移到离 power pad 近
 - RTL 加 pipeline / 拆分 burst

4. **验证**：
 - 重新跑 Voltus
 - 确认无回归
 - 看 timing 是否变化

**加分点**：
- 提到 "动态 IR Drop 仿真需要真实 VCD，不能用 random VCD"
- 提到 "clock skew 不均会加剧 dynamic IR drop"
- 提到 "7nm 工艺 dynamic IR drop 是 sign-off 必查项——必跑 Voltus"

---

## 四、面试常见追问

| 追问 | 应对 |
|---|---|
| "Dynamic IR drop 5% 严重吗？" | "看工艺：5% 在 28nm 容忍，7nm 必须 < 5%，3nm 几乎不允许" |
| "Power Gating 和 Clock Gating 能不能都用？" | "能。Clock Gating 处理动态，Power Gating 处理静态" |
| "Decap 越多越好吗？" | "不是。太多占面积、增加 leakage，要 trade-off" |
| "Vt Swap 在哪个阶段做？" | "post-CTS + post-Route 各做一轮，最大化 HVT" |
| "IR Drop 和 EM 哪个先检查？" | "一般 EM 先——PG 设计不对时 IR Drop 也一定有问题" |

---

## 五、面试避坑

1. 把 P = αCV²f 说成 P = αCVf——**平方不能漏**
2. 说"Decap 加在空地就行"——必须 legalize，**否则会变 floating cell**
3. 不区分 Static / Dynamic IR Drop——面试必问
4. 说"Power Gating 完全无代价"——实际有 retention cell、area、wake-up latency
5. 漏提 EM 阈值——先进工艺 EM 严重，必查

---

> **关联阅读**：[01-基础知识 06-低功耗设计 UPF](../01-基础知识/06-低功耗设计UPF.md) 中 Power Gating、Isolation、Retention 章节
