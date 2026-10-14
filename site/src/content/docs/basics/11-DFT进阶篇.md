---
title: "DFT 进阶篇：从 ATPG 算法到量产测试工程"
description: "Scan、ATPG、MBIST 的工程实践：覆盖率目标、pattern 生成流程与量产测试常见问题。"
module: basics
order: 10
---

# DFT 进阶篇：从 ATPG 算法到量产测试工程

> 本章是基础篇 `02-八股题库/06-可测试性设计DFT.md` 的"做工程必备"的加深。  
> 大约 6K 字。  
> **目标**：读完能**在 Cadence Tessent 或 Synopsys DFT Compiler 上独立做完整 DFT flow**。
>
> **前置知识**：基础篇 DFT 内容（Scan/MBIST/JTAG）。
> **适合**：面试 AI 芯片 DFT 岗位的、做 DFT 工作的、想转 DFT 工程师的 PNR 人。

---

## 目录

- [一、DFT 不止是插 scan chain](#一dft-不止是插-scan-chain)
- [二、ATPG 算法：4 个核心步骤](#二atpg-算法4-个核心步骤)
- [三、Tessent 与 DFT Compiler：工具对比](#三tessent-与-dft-编译器工具对比)
- [四、故障仿真：覆盖率从 95% 到 99.9% 的秘密](#四故障仿真覆盖率从-95-到-999-的秘密)
- [五、Compression Scan：5nm 主流架构](#五compression-scan5nm-主流架构)
- [六、IDDQ 与 Aging-Aware Test](#六iddq-与-aging-aware-test)
- [七、DFT 工程时序](#七dft-工程时序)
- [八、八股常考 DFT 进阶题](#八八股常考-dft-进阶题)

---

## 一、DFT 不止是插 scan chain

### 1.1 一个真实 DFT 工程师的工作

```
DFT 工程师实际日常工作：
- 30% 时间：插 scan chain + MBIST
- 25% 时间：读覆盖率、不达标诊断
- 20% 时间：和 PNR 沟通 scan chain placement
- 15% 时间：ATE 测试程序开发
- 10% 时间：量产测试 fail binning 分析
```

**结论**：DFT 远不止"插 scan chain"——它贯穿 **设计 → 流片 → 量产测试** 全流程。

### 1.2 DFT 的 5 大子领域

| 子领域 | 关注点 | 工程师人数 |
|---|---|---|
| **Scan ATPG** | Stuck-At / Transition 故障 | 最多 |
| **MBIST** | SRAM / DRAM 自测试 | 不少 |
| **Boundary Scan** | JTAG I/O 测试 | 必备 |
| **IDDQ** | 静态电流测试 | 逐渐衰减 |
| **Aging Test** | 老化测试（含 BTS）| 新趋势 |

---

## 二、ATPG 算法：4 个核心步骤

### 2.1 ATPG 的"感知 → 决策 → 传播 → 判定"循环

```
ATPG 核心算法 (D-Algorithm / PODEM / FAN)：

1. 激活 (Activation)：
 - 选择一个未测故障 (line, value)
 - 通过内部 node 传播相反值

2. 决策 (Decision)：
 - 计算每个内部 gate input 上的逻辑
 - 用 D-Frontier 追踪尚未传播的目标

3. 回溯 (Backtrack)：
 - 决策不可满足 → 回溯上一层决策

4. 传播 (Propagation)：
 - 把故障状态传到一个可观察点（FF / 输出）
 - 通过 sensitized path
```

### 2.2 PODEM 算法详解（主流）

```
PODEM (Path-Oriented Decision Making)：
- D-Algorithm 的优化版，由 P. Goel 提出
- 把故障 gate 的输入看作"未知"
- 反复试探哪些输入组合能激活故障
- 失败就回溯，成功则记录为 test pattern
```

PODEM 的复杂度：
- 每个 gate：O(2^n) ，n = input 数
- 平均 test pattern 数：1.5x 到 5x 故障数
- 工程实务：tool 通常跑 10^6 pattern 在 1 小时

### 2.3 故障模型：6 大类

| 故障模型 | 类型 | 检测难度 |
|---|---|---|
| **Stuck-At** | 网线恒 0 / 恒 1 | 简单 |
| **Transition** | 慢 0→1 / 慢 1→0 故障 | 中等 |
| **IDDQ** | 静态电流过大 | 复杂 |
| **Bridge** | 双线短路 | 复杂 |
| **Open** | 网线开路 | 难 |
| **Dynamic** | 复杂时序下的故障 | 极难 |

**5nm 主流**：Stuck-At + Transition + Bridge + IDDQ 四者都是**生产必备**。

### 2.4 故障覆盖率计算

```
覆盖率 = (检测到的故障数) / (总非冗余故障数)

商用工具输出：
- 总故障：12,500,000
- 检测：12,300,000
- 未检测：200,000 (主要是 redundant fault 或 untestable)
- 覆盖率 = 12,300,000 / (12,500,000) = 98.4%
```

**目标值**：
- 8nm 以上：99%
- 5nm：99.5%
- 3nm：99.9%

---

## 三、Tessent 与 DFT Compiler：工具对比

### 3.1 Tessent（Cadence / Mentor）

| 优势 | 特点 |
|---|---|
| Compression Scan | 业界标准 |
| Cell-Aware Test | 知道每个 cell 的 ATPG 模型 |
| Hierarchical DFT | 大芯片分层做 DFT |
| Tessent IJTAG | IJTAG 标准，IEEE 1687 |
| Mode-aware test | 多 mode test 支持 |

### 3.2 DFT Compiler（Synopsys）

| 优势 | 特点 |
|---|---|
| 与 Synthesis 集成 | 综合 + DFT 一套流程 |
| Hierarchical / flat | 都支持 |
| Streaming Scan | 高速 scan out |
| Mixed-Mode Scan | 同 chain 不同 mode |

### 3.3 Tessent 完整 Flow 例子（实战）

```tcl
# ====================================
# Tessent Shell：DFT 完整流程
# ====================================
set system_mode setup
# 1. 加载设计
read_cell_library my_tech.tcelllib
read_design_verilog synth.v
read_design_sdc synth.sdc
# 2. 设计规则检查
check_design_rules -all
# 3. 插 scan chain（Stuck + Transition）
set_dft_specification -capture_mode at-speed
add_scan_groups grp1
add_scan_compress_configuration grp1 -codec_mode compr -ratio 30
insert_test_logic
# 4. ATPG
run_test_generation stuck_at
run_test_generation transition -capture_num 500
report_test_coverage stuck_at > cov_sa.rpt
report_test_coverage transition > cov_tr.rpt
# 5. 故障仿真
run_fault_simulation stuck_at
# 6. 输出 pattern
write_test_patterns pat/patterns.stil -stil
write_test_patterns pat/vectors.v -verilog
write_test_patterns pat/vectors.wgl -waveform
```

### 3.4 覆盖率不达标时的调试过程

```
Coverage 98% → 99% 的最后 1%：
1. report_test_coverage -fault_details
2. 看未检测故障分类：
 ├── untestable (冗余) → 接受
 ├── undetectable (ATPG 没找到) → 看 test mode 是否全开
 └── 无法识别 (主要是 unknown / don't care)
3. 工具优化：
 ├── 改 test mode 配置
 ├── 加 transition 测试时钟
 └── 用 cell-aware test (Tessent 特有)
```

---

## 四、故障仿真：覆盖率从 95% 到 99.9% 的秘密

### 4.1 工具为何不能直接达到 99.9%

**8 个常见障碍**：

| # | 障碍 | 修复 |
|---|---|---|
| 1 | 异步逻辑过多 | 添加 ATPG control sequence |
| 2 | 多时钟域同步失败 | 配 synchronicity 逻辑 |
| 3 | Redundant logic | 用工具 locate redundant |
| 4 | Unclocked FF | 改成 clock-gated |
| 5 | State retention 的 RRAM/FF | MBIST 不能测 |
| 6 | DMA / 多 master | 加 memory 测试 |
| 7 | 跨 scan chain 干扰 | 加 isolation cell |
| 8 | Test point 不足 | 工具自动 testpoint |

### 4.2 Test Point Insertion（TPI）

```
Test Point = DFT 引擎加的人为观测 / 控制点：
- Control point: force 一个 AND/OR gate 的另一 input
- Observe point: 把内部 node 拉到 scan FF

工具自动：
- find_test_points -max_count 1000
- insert_test_points {list}
- 可提升覆盖率 1-3%
```

### 4.3 Cell-Aware Test (Tessent)

```
传统 fault model：stuck-at / transition（按 gate）
Cell-Aware：考虑 cell 内部每个 transistor 的 fault
- 检测 deep-cell interior 短路 / 开路
- 覆盖率可达 99.99%
- 缺点：cell-aware ATPG model 需要 PDK 支持
- 5nm 主流 Tessent cell-aware
```

### 4.4 实际工程：覆盖率 95% → 99.5%

```
项目进度：
Day 1: 95% (Stuck-At)
Day 2: 97% (加 Transition capture)
Day 3: 98.5% (加 cell-aware)
Day 4: 99% (加 700 test points)
Day 5: 99.5% (修小的 unreachable)
Day 6: pattern count optimization
→ sign-off 99.5% coverage
```

---

## 五、Compression Scan：5nm 主流架构

### 5.1 压缩 vs 不用压缩

```
无压缩：
- Scan chain 长度 = FF 数 (millions)
- 测试时间 = N × scan cycle
- 5nm 芯片 30M FF → 100ms test time

有压缩 (compression ratio 30x)：
- 把 30 个 internal chain → 1 个 encoded chain
- Test pattern 数减少 ~3x
- 5nm 30M FF + 30x compression → 10ms test time
- 测试时间减少 10x 是功耗降低 + tester 成本降低
```

### 5.2 compression 类型对比

| 架构 | 特点 | 工具 |
|---|---|---|
| **Codec** (XOR-mask) | 30% compression 比 | Tessent / DFT Compiler |
| **Mux-Based** | 简单结构性压缩 | 老版本 |
| **Streaming Scan** | 持续压缩 | DFT Compiler |
| **EDT** (Embedded Deterministic Test) | Synopsys | DFT Compiler |
| **Illinois Scan** | statistical compression | Tessent |

### 5.3 compression 完整示例（Tessent）

```tcl
# ====================================
# Compression Scan 完整
# ====================================

# 配置
set_dft_specification -capture_mode at-speed
set_dft_specification -test_clock_per_port 1

# 加 compress 配置
add_scan_groups grp_main
add_scan_compress_configuration grp_main \
  -codec_mode external_compressor \
  -compression_ratio 30 \
  -xstate_mask_value 1

# 工具自动插 chain
insert_test_logic

# 配置 chain 的 compression 
report_scan_compress_configuration

# 跑 ATPG
run_test_generation stuck_at

# 看 compression 后 数字
# → total patterns = 12k (压缩前 360k)
# → test time = 12k x 4 clock = 48ms
# → power 比不压缩低 30 倍
```

### 5.4 compression 工程难题

| 难题 | 表现 |
|---|---|
| 内部 clock gating 不参与 | 覆盖率降 |
| 跨 chain 干扰 | 故障跨 chain 互相干扰 |
| Power 问题 | 大量跳变导致 IR drop |
| ATPG time 增长 | 工具更难 find pattern |

---

## 六、IDDQ 与 Aging-Aware Test

### 6.1 IDDQ 测试

```
IDDQ = quiescent Vdd current (漏电流)

正常芯片：1 μA
有 defect 的芯片：> 100 μA
通过测静态电流，detect 制造缺陷

老化对策（10 年） | Aging Test：
- 用 IDDQ 预测寿命
- 用 shift current (BTS) 预测
```

```tcl
# Tessent IDDQ 测试
setup_iddq_testing -threshold 1uA
add_iddq_patterns -patterns iddq.stil
run_iddq_fault_grading
```

### 6.2 Aging Test：BTS / ETM

```
BTS (Bias Temperature Stress)：
- 5 年老化后跑 test
- 找老化 drift 的 die（在生产后筛掉）

ETM (Embedded Test Monitor)：
- chip 内置 aging sensor
- 在生产后跑 calibrate test
- 监控 aging 在 field
```

### 6.3 Aging Test 在 5nm 的角色

| 工艺 | Aging requirement | Test 方法 |
|---|---|---|
| 28nm | 几乎不需要 | Normal at-speed |
| 7nm | 部分需要 | BTS 抽样 |
| 5nm | 标配 | BTS + ETM |
| 3nm | 标配 + 高级 | BTS + ETM + adaptive |

---

## 七、DFT 工程时序

### 7.1 完整 DFT Sign-off 时间线

```
T-3 月：DFT 设计 + 综合 + PNR
T-2 月：scan 加载 + pattern 生成
T-1 月：Fault grading + coverage sign-off
T-1 周：Test pattern 验证（含 transition）
T-1 天：ATE 程序导出 + 量产测试
```

### 7.2 DFT Engineer 与 PNR Engineer 的协同

```
PNR 影响 DFT 性能：
- Scan chain order: 影响 scan shift time
- Chain placement: 影响 chain balance
- Memory placement: 影响 MBIST 平行度
- 时钟 tree skew: 影响 ATPG timing margin

DFT 影响 PNR：
- Compression architecture 决定 layout 区域
- Test mode SDC 强制 PNR 用 pattern mode timing
- Boundary scan cell placement 在 IO 周围
```

### 7.3 一个真实 DFT sign-off 报告

```
Test Coverage Report (Stuck-At)
============================
Total faults: 12,500,000
Detected:  12,425,000 (99.4%)
Possible:  50,000 (0.4%)
Untestable: 25,000 (0.2%)

Total patterns: 8,500
Test time: 8.5ms per chip
Power (peak): 350mW
Power (avg): 80mW
```

---

## 八、八股常考 DFT 进阶题

### Q1：什么是 PODEM 算法？为什么要用它？

**答**：PODEM 是 D-Algorithm 改进版。**用 backtracking (回溯) 更快定位故障激活条件**。比 D 算法快 10x。

### Q2：Compression 怎么减少 test time？

**答**：把 N 个 scan chain 压缩到 M 个，N/M = compression ratio。Test pattern 数减 3-10x，shift 周期减 30x。

### Q3：5nm 为什么要 cell-aware test？

**答**：5nm cell 内部 transistor 多，stuck-at 和 transition 测不到**cell 内部**的故障。Cell-aware 看 transistor-level 故障，覆盖率从 99% 提到 99.99%。

### Q4：Test Point Insert 有什么副作用？

**答**：+
- 覆盖率 +
- area + (1% extra for 1k points)
- timing：测点影响 timing  

### Q5：什么是 At-Speed Test？何时用？

**答**：At-speed = 让 chip 在 functional 时钟频率下跑 transition fault。
**用**：capture 测试，验时序路径在 functional 频率下是否 fail。
**前提**：DFT mode 下 shift 用慢时钟，capture 用 functional 时钟。

### Q6：Coverage 99.5% 为什么仍可疑？

**答**：通常 0.5% untestable = 红线。如果 tool 报告 "untestable" 比预期少，多半是 tool 没找全 pattern。

### Q7：Compression ratio 上限多少？

**答**：30x-100x，更高带来：
- 解码电路复杂度 ↑
- Coverage ↓
- ATPG time ↑

主流用 30x-50x。

### Q8：什么是 IJTAG？

**答**：IEEE 1687 = 仪器间 JTAG 网络标准。允许芯片在内部用 JTAG 控制任意 IP，包含 RBIST / MBIST / SOC。

### Q9：MBIST 与 Logic BIST 区别？

**答**：
- MBIST：测试 SRAM，用专门 BIST controller
- Logic BIST (LBIST)：测试逻辑，用 PRPG/MISR

### Q10：DFT 覆盖率 sign-off 失败 fix 谁背锅？

**答**：DFT 工程师为覆盖率负责（structural）；PD / PNR 工程师为 layout / chain placement 负责（physical）。协同负责。

---

## 你读完应该会什么

| 能力 | 验证 |
|---|---|
| 自己跑一遍 Tessent Shell DFT flow | 完成 1 个 simple design |
| 覆盖率诊断 - 不达 99% | 调错 / 调 timing |
| Compression / Test Point 用法 | 5 工程 trade-off |
| 解释 DFT 八股 10 道 | 全部能答 |

---

## 实战要避的 5 个坑

1. **不要把 ATPG coverage = sign-off** —— 还要 timing / power / power-aware test 一起
2. **不要忽略 test mode timing** —— capture 期间可能 timing 违例
3. **不要让 compression 把 pattern 数跑到 0** —— 越多 pattern 越安全
4. **不要忽略 memory DFT 与 logic DFT 的协同** —— Memory 故障可能 bleeds 到 logic
5. **不要把 IR drop 在 shift 时忽略** —— Shift 期电流尖峰非常严重，必须 power-aware ATPG

---

> **本篇定位**：DFT 是"芯片上车前的保险"。DFT Flow 完整掌握后，你在 Sign-off Lead 的方向上多了 50% 的筹码。
