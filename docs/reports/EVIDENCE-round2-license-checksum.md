Typora 1.14.10 license 校验链 — 动态证据 (第二轮)

[1] 校验和函数定位 (字节码偏移, 来自 indexOf 调用栈)
    mapChar:  e   @ atom.compiled.dist.jsc:1:65890
    loop:     ha  @ atom.compiled.dist.jsc:1:66304
    entry:    ka  @ atom.compiled.dist.jsc:1:67652
    (RSA)     D   @ 1:51504  -> publicDecrypt
    quit      -   @ 1:77779  (Timeout._onTimeout)

[2] 字符映射表 (实锤)
    字母表: L23456789ABCDEFGHJKMNPQRSTUVWXYZ  (32 字符)
    映射: CHARS.indexOf(ch)  -> L=0, 2=1, 3=2, 4=3, 5=4, 6=5, A=9, B=10 ...

[3] 迭代顺序 (24 字符输入 "L23456-ABCDEF-GHJKMQ-RSTUVW", 去横线后 24 字符)
    观测序列: L,3,5,A,C,E,G,J  (即偶数位 0,2,4,...,14)
              2,4,6,B,D,F,H,K  (即奇数位 1,3,5,...,15)
    结论: 先偶位后奇位, 仅 16 次索引查找后提前退出 (所有输入均为 16 次)

[4] 已证伪的假设 (全部 32/32 或 1024/1024 无命中)
    - 线性加权和 mod 32 (单点扫描 pos0 / pos5)
    - 相邻双位组合 (0,1)(1,2)(2,3): 3072 组
    - 末两位全枚举: 1024 组
    - 前 16 字符索引和 = 0..31 全靶向: 32 组
    - 全 L (sum=0) / 全同字符
    => 校验和不是作用于 24 字符的简单线性/求和函数

[5] 格式约束
    - 4 组 x 6 字符 (24 字符 + 3 横线) 才进入字符映射阶段
    - 16 字符格式 (4x4) 直接拒绝, 无任何映射 (格式门在更前)
    - 非法字符 -> 统一返回 "Please input a valid license code" (不可区分)

[6] 离线激活入口行为
    offlineActivation(arg) 与 addLicense(ev,{email,license}) 共用同一 license 校验
    RSA 层可被劫持 (publicDecrypt 伪造明文), 但明文中的 license 仍需通过校验和
