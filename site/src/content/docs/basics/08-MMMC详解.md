---
title: "MMMC（Multi-Mode Multi-Corner）：先进工艺调度核心"
description: "某 5nm SoC：12 个电源域 + 4 个时钟 + 5 种 PVT 环境 + 2 种功耗模式。"
module: basics
order: 7
---

# MMMC（Multi-Mode Multi-Corner）：先进工艺调度核心

> "为什么我的设计跑 30 多个 corner"——每一个先进芯片工程师的第一反应。
>
> 本文目标：彻底搞清楚 MMMC 的**为什么、怎么做、如何少跑 50% corner**。
>
> **前置知识**：STA 基础（建立保持时间、OCV/CPPR）。
> **适合**：做 28nm 以下芯片的后端工程师。

---

## 目录

- [一、为什么必须有 MMMC](#一为什么必须有-mmmc)
- [二、Corner 与 Mode：3 个轴 × 3 个状态](#二corner-与-mode3-个轴-×-3-个状态)
- [三、Corner 数量为何爆炸](#三corner-数量为何爆炸)
- [四、Corner 缩减：7 个实战方法](#四corner-缩减7-个实战方法)
- [五、Constraint：每个 Corner 配什么 SDC](#五constraint每个-corner-配什么-sdc)
- [六、Innovus / PT 的 MMMC 配置](#六innovus--pt-的-mmmc-配置)
- [七、MMMC 八股问题清单](#七mmmc-八股问题清单)
- [八、MMMC Sign-off 三道关](#八mmmc-sign-off-三道关)

---

## 一、为什么必须有 MMMC

### 1.1 一个真实案例

某 5nm SoC：12 个电源域 + 4 个时钟 + 5 种 PVT 环境 + 2 种功耗模式。
理论 corner 数：12 × 4 × 5 × 2 = **480 个 corner**。
实际跑全：单 corner STA 需要 6 小时。跑全 480 个 = **120 天**。
现实：工程师把 corner 缩到 **18 个**，跑全 STA 3 天。
**结论**：MMMC 不是"贪多"，是"在精度和成本之间找平衡"。

### 1.2 MMMC 的本质

```
Mode  = 静态配置改变 → SDC 改变 → 时序路径改变
       例：func 模式（全路径）+ scan 模式（DFT 专用路径）
Corner = 物理环境改变 → cell delay 改变 → slack 改变
       例：ss_125c_corner（高温慢速）+ ff_-40c（年轻快速）
```

关键认知：**Mode 和 Corner 是正交的维度，可以叉乘跑**。

---

## 二、Corner 与 Mode：3 个轴 × 3 个状态

### 2.1 三大状态轴

```
Process (工艺偏差)
├── ss (slow-slow)    : NMOS 慢 + PMOS 慢       →  延迟最大
├── ff (fast-fast)    : NMOS 快 + PMOS 快       →  延迟最小  
├── sf (slow-fast)    : NMOS 慢 + PMOS 快       →  race condition
├── fs (fast-slow)    : NMOS 快 + PMOS 慢       →  race condition
├── tt (typical)      : 典型工艺
└── mc (monte-carlo)  : 蒙特卡洛随机工艺

Voltage (电压波动)
├── 最差工艺电压 (0.88 V by spec)        →  worst setup
├── 最佳工艺电压 (0.95 V by spec)        →  worst hold
├── Nominal (0.9 V)                       →  reference
├── IR drop 后 (0.83 V)                   →  另外的 worst 情境
└── Voltage ramp 中 (0.4 ~ 0.85 V)        →  power-up 检查

Temperature (温度漂移)
├── -40 °C (低温)           →  cell delay 最小 →  worst hold
├── 25 °C (室温)            →  reference
├── 85 °C (商用高温)        →  cell delay 较大
├── 125 °C (军工高温)       →  worst setup
└── ...及动态温度翻转 →  hot-spot 检查
```

### 2.2 三大 Mode

| Mode | 含义 | SDC 差异 |
|---|---|---|
| **function** | 正常功能 | 全约束，全路径 |
| **scan** | DFT 测试 | 把 scan enable=1，专用 SDC |
| **shift** | capture-only（不用 ATPG）| 只算 capture 路径 |
| **low_power** | UPF 模式 | 隔离 cell 关闭，部分路径断电 |
| **power_down** | UPF 模式 | 部分 domain down |
| **bypass_mode** | Bypass 模式 | 时钟绕过 PLL |
| **sleep_mode** | Chip sleep | 时钟 gating |

### 2.3 真实工程"必备" corner 数目

| 工艺节点 | Mode 数 | Corner 数 | 总组合 |
|---|---|---|---|
| 65nm | 2 | 2 | 4 |
| 28nm | 3 | 4 | 12 |
| 12nm | 4 | 6 | 24 |
| 7nm | 5 | 8 | 40 |
| 5nm | 6 | 10 | **60** |
| 3nm | 6 | 12 | **72** |

---

## 三、Corner 数量为何爆炸

### 3.1 三个"指数级"的来源

| 来源 | 例子 | 数量爆炸 |
|---|---|---|
| 工艺极限 | ss / sf / fs | 4 个基本 PVT |
| 老化 | NBTI (PMOS 慢化) + PBTI (NMOS 慢化) + HCI | 每个转角再加一个 aged 版本 |
| 寄生偏差 | Cmax/Cmin + Rmax/Rmin 两两组合 | 1×5 组合 |
| IR Drop | 4 种 IR 实例（chip 边缘 vs 中心）| 4 × corner |
| Voltage Bump | 不同测试点电压（Vmin + 老化保留）| 多 2-3 corner |

**5nm 完整 SPEC 几乎一定 ≥ 30 corner×Mode**，除非做了 corner reduction。

### 3.2 Corner 数量的真实"工程预算"

| 项目阶段 | 可用 corner 数 | 总耗时 |
|---|---|---|
| 早 PNR（floorplan 阶段）| 1-2 | 几小时 |
| 全 PNR | 3-5 | 1 天 |
| Pre Sign-off | 8-12 | 1-2 天 |
| **Final Sign-off** | **20-40** | **2-4 天** |

超过 50 个 corner，要么是工艺真的极限，要么是漏了 corner 缩减。

---

## 四、Corner 缩减：7 个实战方法

### 4.1 "3 个 vs 4 个" corner 的差异

工程经验：通常 **3-4 个 corner × 1-2 个 mode** 就够覆盖。

```
Function Sign-off 必备 4 corner：
1. func_wc_setup       =  ss_0p88_125c       →  worst setup
2. func_wc_hold        =  ff_0p95_-40c       →  worst hold
3. func_wc_setup_lowV  =  ss_0p83_125c       →  aging + IR
4. func_bc_hold        =  ss_0p95_-40c       →  cross corner

Scan Sign-off 必备 4 corner：
1. scan_wc_setup       =  ss_0p88_125c       (shift 期间)
2. scan_wc_hold        =  ff_0p95_-40c
3. scan_wc_setup_lowV  =  ss_0p83_125c
4. scan_bc_hold_lowV   =  ff_0p83_-40c
```

### 4.2 7 个 Corner 缩减技巧

| # | 技巧 | 节省 corner | 风险 |
|---|---|---|---|
| 1 | **PVT 折叠** | sf / fs 通常被 ss 覆盖，可省 1-2 | race condition 路径漏 |
| 2 | **温度分级** | 85°C 测过即可，不跑中间温度 | 中温度偏差轻微漏 |
| 3 | **Voltage collapse** | 0.88 / 0.83 二选一 | IR drop 仿真需验证 |
| 4 | **Mode split** | func / scan 不并行 → P&R 阶段分开跑 | shift 期间没有 setup path 误判 |
| 5 | **POCV 替代 AOCV** | 一个 corner 顶多个 | 设置不当放大偏差 |
| 6 | **PG Corner Sharing** | 用 mtcmos power-off 算其他 domain | 静态功耗叠加错 |
| 7 | **Slew Derate** | mc + bc 可以共用 cell delay | corner 极端时漏 |

### 4.3 一个明确的 corner reduction 思路

```tcl
# ECCN (Effective Corner Number) 启发式：
# 1. 跑全 corner → 取每个 path 的 slack
# 2. 构造 "覆盖度" 表：哪个 corner 包含最大的负 slack 分布？
# 3. 反复去掉 "冗余" corner（覆盖度不增大的）
# 工具：Cadence Tempus 有这个能；PT 用 PrimeTime ECO 自己做

# Manual 方法（最常用）：
# - 先跑 1) ss125 wc, 2) ff-40 bc 极值点
# - 加 3) ss-40 sf, 4) ff125 fs 跨 corner
# - 加 5) ss125 lowV, 6) ff-40 lowV 低电压
# - 加 7) ss125 IR, 8) ff-40 IR 电压降
# 共 8 corner。够。
```

---

## 五、Constraint：每个 Corner 配什么 SDC

### 5.1 一个完整 MMMC 配置文件

```tcl
# ====================================
# MMMC 配置文件：Innovus / PT 通用
# ====================================

# ---------- 1. 加载 libs ----------
set all_libs_wc "
    my_tech/stdcell/my_tech_ss_125c.lib
    my_tech/sram/sram_ss_125c.lib
    my_tech/io/io_ss_125c.lib
    my_tech/io/io_ff_-40c.lib
"
set all_libs_bc "
    my_tech/stdcell/my_tech_ff_-40c.lib
    my_tech/sram/sram_ff_-40c.lib
    my_tech/io/io_ff_-40c.lib
"
set all_libs_typ "
    my_tech/stdcell/my_tech_tt_25c.lib
"

# ---------- 2. 创建分析视图 ----------
set_analysis_view -name func_wc_setup -constraint {func.sdc} -delay_corner {ss_wc_corner}
set_analysis_view -name func_wc_hold  -constraint {func.sdc} -delay_corner {ff_bc_corner}
set_analysis_view -name func_wc_setup_lowV -constraint {func.sdc_lowV.sdc} -delay_corner {ss_wc_lowV}
set_analysis_view -name scan_wc_setup -constraint {scan.sdc} -delay_corner {ss_wc_corner}
set_analysis_view -name scan_wc_hold  -constraint {scan.sdc} -delay_corner {ff_bc_corner}
# ... 共 N 个 view

# ---------- 3. 把这些 view 加入 SetActiveList ----------
set_analysis_mode -aocv true
set_analysis_mode -cppr both
set_analysis_mode -si_enable true
```

### 5.2 Constraint 与 Corner 分离原则

✅ **正确做法**：
- SDC 文件只描述**时序关系**（clock、约束、例外）
- 每个 corner 把 SDC 配相应 lib + delay_corner（spec file）
- 每次 STA 跑都对应一个 **Constraint × Delay Corner** 对

❌ **错误做法**：
- 把所有 lib 锁在一个 SDC 里
- 把 SDC 文件按工艺复制多份
- 让 SDC 跑 N 个 process 而不只是 mode

---

## 六、Innovus / PT 的 MMMC 配置

### 6.1 Innovus 完整 MMMC 实现

```tcl
# ====================================
# Innovus MMMC 完整配置模板
# ====================================

# 1. 指定所有 lib
set_db lib_search_path ./libs

# 加载库
create_library_set -name wc_lib \
    -timing { [list wc_lib/stdcell_ss.lib wc_lib/sram_ss.lib wc_lib/io_ss.lib] } \
    -si    { [list wc_lib/stdcell_ss.siLib] } \
    -power { [list wc_lib/stdcell_ss.lib] }

create_library_set -name bc_lib \
    -timing { [list bc_lib/stdcell_ff.lib bc_lib/sram_ff.lib] } \
    -si    { [list bc_lib/stdcell_ff.siLib] }

# 2. 创建 Opcond (Operating Conditions)
create_opcond -name wc_opc -process ss -voltage 0.88 -temperature 125
create_opcond -name bc_opc -process ff -voltage 0.95 -temperature -40

# 3. 创建 RC Corners
create_rc_corner -name spef_max -cap_table my_captable_max -res_table my_restable_max
create_rc_corner -name spef_min -cap_table my_captable_min -res_table my_restable_min

# 4. 创建 Delay Corner = Library × RC × Opcond
create_delay_corner -name wc_setup_dc -library_set wc_lib -opcond wc_opc -rc_corner spef_max
create_delay_corner -name bc_hold_dc  -library_set bc_lib -opcond bc_opc -rc_corner spef_min

# 5. 创建 Constraint Mode (SDC)
create_constraint_mode -name func_constraint -sdc_files ./sdc/func.sdc -max_cap 0.080 -min_cap 0.001
create_constraint_mode -name scan_constraint -sdc_files ./sdc/scan.sdc -max_cap 0.080

# 6. 创建 Analysis View = Constraint × Delay Corner
create_analysis_view -name func_wc_setup  -constraint_mode func_constraint -delay_corner wc_setup_dc
create_analysis_view -name func_bc_hold   -constraint_mode func_constraint -delay_corner bc_hold_dc
create_analysis_view -name scan_wc_setup  -constraint_mode scan_constraint -delay_corner wc_setup_dc
create_analysis_view -name scan_bc_hold   -constraint_mode scan_constraint -delay_corner bc_hold_dc

# 7. 设为活跃 view 集
set_analysis_view -setup {func_wc_setup scan_wc_setup} -hold {func_bc_hold scan_bc_hold}
```

### 6.2 PrimeTime 端检查一致性

```tcl
# 在 PT 里用同样 config.sdc 跑
set_app_options -name time.enable_aocv -value true
set_app_options -name time.pocvm_enable -value true
set_app_options -name time.cppr_enable -value both

# 用 PrimeTime 看所有的 view
report_analysis_views
# 必须是和 Innovus 一致的 4 个 view，否则 STA 会出现漏报
```

---

## 七、MMMC 八股问题清单

### Q1：MMMC 的 M 和 C 各代表什么？为什么不能合并？

**答**：**M = 工作模式**（func/scan/bypass），改变逻辑路径；**C = 工艺环境**（PVT），改变器件速度。
两者不能合并，因为 SDC **直接绑定到 M**，lib/SPEF 绑定到 C。合并会令一台符号有不同含义。

### Q2：为什么"功能"和"scan" 必须分开 SDC？

**答**：
- func 模式：scan_enable=0，clock gating 内部全路径可达
- scan 模式：scan_enable=1，时钟被 strict 拉入 scan chain
混用会让 SDC 中某些约束错误（clock uncertainty、false path）。

### Q3：MCMM 与 MMMC 差异？

**答**：
- **MMMC** (Multi-Mode Multi-Corner)：模式 × 工艺组的交叉组合
- **MCMM** (Multi-Corner Multi-Mode)：是等价的；现在都习惯叫 MMMC

### Q4：如何在 MMMC 中处理跨时钟域？

**答**：
1. SDC 中必须对每对时钟做 `set_clock_uncertainty` + `set_max_delay` 来约束 inter-domain path；
2. ASIC 中 SDC 用 `set_max_delay 5 -from [get_clocks A] -to [get_clocks B]`；
3. 还要做 false path 检查，避免 setup/hold 检查跨域。

### Q5：MMMC 如何跑 18 个 corner？

**答**：写循环、并行化（PT 中的 set_host_options -max_cores）、用 `run_analysis_views -start N -end M` 切片。

### Q6：MMMC 是否能跑到 cppr 之外？

**答**：可以，在 PT 中 `set_app_options -name time.pocvm_with_lvf -value true` 即可启用 LVF。

---

## 八、MMMC Sign-off 三道关

### 8.1 三道关的标准

| 关 | 名称 | 标准 |
|---|---|---|
| 第一道 | **STA Setup/Hold** | 每个 view 下都无违例 |
| 第二道 | **Glitch/MinPulse** | 每个 view 下都无违例 |
| 第三道 | **Power/IR** | IR drop ≤ 5% VDD；EM ≤ 70% allowed |

### 8.2 自动化脚本检查清单

```
MMMC 自动检查清单：
□ 8 个 corner 全部 sign-off 报告输出
□ 每个 corner 每条 DFF 都有 min pulse width 通过
□ 4 个 AOCV 表加载成功
□ SI-Aware table 加载成功
□ 每个 clock pair 有 set_clock_uncertainty
□ set_false_path 是 minimal 的，剩下都查
□ aging corner 都跑过
□ Volt/Temp 翻转点都覆盖
```

### 8.3 真正 sign-off 是哪一天？

- **保守派**：PV/STA/IR 全部跑空 + 老化 + 1 个月动量分析 → 1 周跑完
- **激进派**：仅 corner 收敛 + 关键 corner → 2 天
实际工程几乎都**不跑全 corner**——Corner 缩减已经做完，留下少量"代表性 corner"。

---

## 🎯 你读完应该会什么

| 能力 | 验证方式 |
|---|---|
| 看懂 MMMC config 文件 | 把上面 Innovus 的 MMMC 讲解给同行 |
| 自己新增 corner | 在现有 config 里新加一个 `func_lp_setup` view |
| 跑全套 MMMC STA | 写 `foreach` 循环跑所有 view，收集报告 |
| 拒绝错误 corner | 看 corner 报告 → 找到累积没意义的 corner → 删除 |
| 解释 MMMC 八股 | 5 道以上问题能完整回答 |

---

> **本篇定位**：MMMC 是"做工程的口袋子"——能让你用最少的 corner 覆盖所有关键路径。**读完不应只是"了解"，而要"动手做一次"**。
