using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Reflection;
using System.Text;
using System.Windows.Forms;
using Microsoft.Win32;

[assembly: AssemblyTitle("Typora 离线注册器")]
[assembly: AssemblyProduct("Typora 离线注册器")]
[assembly: AssemblyDescription("Typora 离线注册与激活工具（授权审计用途）")]
[assembly: AssemblyCompany("Seep Lab")]
[assembly: AssemblyCopyright("Seep Lab")]
[assembly: AssemblyVersion("1.0.0.0")]
[assembly: AssemblyFileVersion("1.0.0.0")]

// Typora Offline Registration Setup (self-contained single exe)
static class Vt
{
    public const string Alphabet = "L23456789ABCDEFGHJKMNPQRSTUVWXYZ";
    public const string Salt = "typora-virt-v1";

    public static uint Fnv(string s, uint seed)
    {
        uint h = seed;
        foreach (char c in s)
        {
            h ^= (uint)c;
            h *= 16777619u;
        }
        return h;
    }

    public static string MachineCode(string guid)
    {
        string g = (guid ?? "").ToUpperInvariant();
        uint h1 = Fnv("m1|" + g, 2166136261u);
        uint h2 = Fnv("m2|" + g, 2166136261u);
        var sb = new StringBuilder();
        foreach (uint h in new[] { h1, h2 })
        {
            uint v = h;
            for (int i = 0; i < 8; i++) { sb.Append(Alphabet[(int)(v % 32)]); v /= 32; }
        }
        string b = sb.ToString();
        return "VT-" + b.Substring(0, 4) + "-" + b.Substring(4, 4) + "-" + b.Substring(8, 4) + "-" + b.Substring(12, 4);
    }

    public static string CodeFor(string machine)
    {
        string m = (machine ?? "").ToUpperInvariant();
        var sb = new StringBuilder();
        for (int b = 0; b < 4; b++)
        {
            for (int i = 0; i < 6; i++)
            {
                uint h = Fnv(Salt + "|" + m + "|" + b + "|" + i, 2166136261u);
                sb.Append(Alphabet[(int)(h % 32)]);
            }
            if (b < 3) sb.Append('-');
        }
        return sb.ToString();
    }

    public static string MachineGuid()
    {
        try
        {
            using (var k = RegistryKey.OpenBaseKey(RegistryHive.LocalMachine, RegistryView.Registry64)
                       .OpenSubKey(@"SOFTWARE\Microsoft\Cryptography"))
            {
                if (k != null) { var v = k.GetValue("MachineGuid"); if (v != null) return v.ToString(); }
            }
        }
        catch { }
        return Environment.MachineName;
    }

    public static string DataDir
    {
        get
        {
            string p = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "TyporaVirt");
            Directory.CreateDirectory(p);
            return p;
        }
    }

    public static string StateFile
    {
        get { return Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "Typora", "virt-reg.json"); }
    }

    public static string FindTypora()
    {
        string[] candidates = new string[]
        {
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"Programs\Typora"),
            @"C:\Program Files\Typora",
            @"C:\Program Files (x86)\Typora",
            @"D:\Program Files\Typora",
            @"D:\Typora",
            @"E:\Typora",
        };
        foreach (var c in candidates)
            if (File.Exists(Path.Combine(c, "Typora.exe"))) return c;
        try
        {
            using (var k = Registry.CurrentUser.OpenSubKey(@"Software\Typora"))
            {
                if (k != null)
                {
                    var v = k.GetValue("InstallDir") ?? k.GetValue("Path");
                    if (v != null && File.Exists(Path.Combine(v.ToString(), "Typora.exe"))) return v.ToString();
                }
            }
        }
        catch { }
        return "";
    }

    public static string RuntimeVersion
    {
        get
        {
            try
            {
                var b = Resource("VERSION");
                if (b != null) return Encoding.UTF8.GetString(b).Trim();
            }
            catch { }
            return "unknown";
        }
    }

    public static byte[] Resource(string name)
    {
        var asm = Assembly.GetExecutingAssembly();
        foreach (var n in asm.GetManifestResourceNames())
            if (n.EndsWith(name, StringComparison.OrdinalIgnoreCase))
            {
                using (var s = asm.GetManifestResourceStream(n))
                using (var ms = new MemoryStream())
                {
                    s.CopyTo(ms);
                    return ms.ToArray();
                }
            }
        return null;
    }

    public static bool IsInstalled(string appDir)
    {
        return File.Exists(Path.Combine(appDir, "winmm.dll")) && File.Exists(Path.Combine(appDir, "virt.cfg"));
    }

    /// <summary>读取 Typora.exe 的版本号</summary>
    public static string TyporaVersion(string appDir)
    {
        try
        {
            var exe = Path.Combine(appDir, "Typora.exe");
            if (!File.Exists(exe)) return "";
            var vi = FileVersionInfo.GetVersionInfo(exe);
            return vi.FileVersion ?? "";
        }
        catch { return ""; }
    }

    /// <summary>检测布局：1.10+ 的 app.asar 含 launch.dist.js（JSC 结构）；旧版是 main.node + atom.js</summary>
    public static bool LayoutSupported(string appDir)
    {
        try
        {
            var asar = Path.Combine(appDir, "resources", "app.asar");
            if (!File.Exists(asar)) return false;
            // 只扫头部 JSON 区（前 64KB）即可判定，避免读大文件
            using (var fs = File.OpenRead(asar))
            {
                int n = (int)Math.Min(65536, fs.Length);
                var buf = new byte[n];
                fs.Read(buf, 0, n);
                var head = Encoding.ASCII.GetString(buf);
                if (head.IndexOf("launch.dist.js", StringComparison.OrdinalIgnoreCase) >= 0) return true;
                return false;
            }
        }
        catch { return false; }
    }

    public static string LastPathFile
    {
        get { return Path.Combine(DataDir, "last-path.txt"); }
    }

    public static string ReadLastPath()
    {
        try { return File.Exists(LastPathFile) ? File.ReadAllText(LastPathFile).Trim() : ""; } catch { return ""; }
    }

    public static void WriteLastPath(string p)
    {
        try { File.WriteAllText(LastPathFile, p ?? ""); } catch { }
    }

    /// <summary>静默卸载：还原 Typora 目录与运行时状态（供安装包卸载调用）</summary>
    public static int UninstallAll()
    {
        var dirs = new System.Collections.Generic.List<string>();
        string p = FindTypora();
        if (!string.IsNullOrEmpty(p)) dirs.Add(p);
        string[] candidates = new string[]
        {
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"Programs\Typora"),
            @"C:\Program Files\Typora",
            @"C:\Program Files (x86)\Typora",
            @"D:\Program Files\Typora",
            @"D:\Typora",
            @"E:\Typora",
        };
        foreach (var c in candidates) if (File.Exists(Path.Combine(c, "Typora.exe")) && !dirs.Contains(c)) dirs.Add(c);

        foreach (var app in dirs)
        {
            foreach (var f in new[] { "winmm.dll", "winmm_real.dll", "virt.cfg" })
            {
                try { var q = Path.Combine(app, f); if (File.Exists(q)) File.Delete(q); } catch { }
            }
            foreach (var f in new[] { "app.virt.asar", "app.virt.meta" })
            {
                try { var q = Path.Combine(app, "resources", f); if (File.Exists(q)) File.Delete(q); } catch { }
            }
        }
        try { if (File.Exists(StateFile)) File.Delete(StateFile); } catch { }
        try { if (Directory.Exists(DataDir)) Directory.Delete(DataDir, true); } catch { }
        return 0;
    }
}

class SetupForm : Form
{
    TextBox txtPath, txtMachine, txtCode, txtLog;
    Button btnBrowse, btnInstall, btnUninstall, btnCopy, btnActivateOnly, btnLaunch;
    Label lblStatus;
    string machine, code;

    public SetupForm()
    {
        Text = "Typora 离线注册器  v1.0  (runtime " + Vt.RuntimeVersion + ")";
        try { Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath); } catch { }
        Width = 720; Height = 580;
        StartPosition = FormStartPosition.CenterScreen;
        Font = new Font("Segoe UI", 9f);
        BackColor = Color.FromArgb(250, 250, 252);

        var t1 = new Label { Text = "Typora 安装目录", Left = 20, Top = 20, Width = 110 };
        txtPath = new TextBox { Left = 135, Top = 17, Width = 440 };
        btnBrowse = new Button { Text = "浏览…", Left = 585, Top = 15, Width = 100, Height = 26 };
        btnBrowse.Click += (s, e) =>
        {
            using (var d = new FolderBrowserDialog())
            {
                if (d.ShowDialog() == DialogResult.OK) { txtPath.Text = d.SelectedPath; Refresh_(); }
            }
        };

        var t2 = new Label { Text = "机器码", Left = 20, Top = 84, Width = 110 };
        txtMachine = new TextBox { Left = 135, Top = 81, Width = 440, ReadOnly = true, Font = new Font("Consolas", 10f) };
        var t3 = new Label { Text = "注册码", Left = 20, Top = 120, Width = 110 };
        txtCode = new TextBox { Left = 135, Top = 117, Width = 440, ReadOnly = true, Font = new Font("Consolas", 10f, FontStyle.Bold), ForeColor = Color.FromArgb(0, 120, 80) };
        btnCopy = new Button { Text = "复制", Left = 585, Top = 115, Width = 100, Height = 26 };
        btnCopy.Click += (s, e) => { try { Clipboard.SetText(txtCode.Text); } catch { } };

        lblStatus = new Label { Left = 135, Top = 45, Width = 550, Height = 20, Text = "", ForeColor = Color.FromArgb(110, 110, 120) };

        btnInstall = new Button { Text = "一键安装并激活", Left = 135, Top = 162, Width = 150, Height = 34, BackColor = Color.FromArgb(0, 120, 215), ForeColor = Color.White, FlatStyle = FlatStyle.Flat };
        btnActivateOnly = new Button { Text = "仅写入特权状态", Left = 295, Top = 162, Width = 150, Height = 34 };
        btnUninstall = new Button { Text = "卸载 / 还原", Left = 455, Top = 162, Width = 130, Height = 34 };
        btnLaunch = new Button { Text = "启动 Typora", Left = 596, Top = 162, Width = 89, Height = 34 };

        txtLog = new TextBox { Left = 20, Top = 212, Width = 665, Height = 310, Multiline = true, ScrollBars = ScrollBars.Vertical, ReadOnly = true, Font = new Font("Consolas", 9f), BackColor = Color.White };

        Controls.AddRange(new Control[] { t1, txtPath, btnBrowse, lblStatus, t2, txtMachine, t3, txtCode, btnCopy, btnInstall, btnActivateOnly, btnUninstall, btnLaunch, txtLog });

        btnInstall.Click += (s, e) => Install();
        btnActivateOnly.Click += (s, e) => Activate();
        btnUninstall.Click += (s, e) => Uninstall();
        btnLaunch.Click += (s, e) =>
        {
            try
            {
                string app = txtPath.Text.Trim();
                var exe = Path.Combine(app, "Typora.exe");
                if (File.Exists(exe)) Process.Start(new ProcessStartInfo(exe) { WorkingDirectory = app });
                else MessageBox.Show(this, "目录下找不到 Typora.exe", "提示", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
            catch (Exception ex) { Log("启动失败: " + ex.Message); }
        };

        string p = Vt.FindTypora();
        if (string.IsNullOrEmpty(p)) p = Vt.ReadLastPath();
        if (string.IsNullOrEmpty(p) && File.Exists(Path.Combine(Application.StartupPath, "Typora.exe"))) p = Application.StartupPath;
        if (!string.IsNullOrEmpty(p) && !File.Exists(Path.Combine(p, "Typora.exe"))) p = "";
        txtPath.Text = p;
        Refresh_();
        Log("Typora 离线注册器就绪（运行时 " + Vt.RuntimeVersion + "）。机器码派生自 MachineGuid，注册码与版本无关。");
    }

    void Log(string s)
    {
        txtLog.AppendText("[" + DateTime.Now.ToString("HH:mm:ss") + "] " + s + Environment.NewLine);
    }

    void Refresh_()
    {
        machine = Vt.MachineCode(Vt.MachineGuid());
        code = Vt.CodeFor(machine);
        txtMachine.Text = machine;
        txtCode.Text = code;
        string app = txtPath.Text.Trim();
        if (app.Length > 0)
        {
            if (File.Exists(Path.Combine(app, "Typora.exe")))
            {
                bool inst = Vt.IsInstalled(app);
                bool reg = File.Exists(Vt.StateFile);
                bool ok = Vt.LayoutSupported(app);
                string ver = Vt.TyporaVersion(app);
                string verTxt = string.IsNullOrEmpty(ver) ? "" : (" v" + ver);
                lblStatus.Text = inst
                    ? ("状态：已安装" + (reg ? " · 已激活" : " · 未激活") + "   |   Typora" + verTxt + (ok ? " · 布局支持" : " · 布局不支持"))
                    : ("状态：未安装   |   检测到 Typora" + verTxt + (ok ? " · 布局支持" : " · 布局不支持（需 1.10+）"));
                lblStatus.ForeColor = !ok ? Color.FromArgb(180, 60, 60)
                    : (inst && reg ? Color.FromArgb(0, 130, 90) : Color.FromArgb(150, 110, 30));
                Log("检测到 Typora: " + app + (inst ? "（已安装本工具）" : "（未安装）") + "  版本=" + (ver == "" ? "未知" : ver) + "  布局=" + (ok ? "JSC(支持)" : "旧版(不支持)"));
            }
            else
            {
                lblStatus.Text = "状态：此目录下未找到 Typora.exe";
                lblStatus.ForeColor = Color.FromArgb(180, 60, 60);
                Log("目录下未找到 Typora.exe: " + app);
            }
        }
        else
        {
            lblStatus.Text = "状态：请选择 Typora 安装目录（含 Typora.exe）";
            lblStatus.ForeColor = Color.FromArgb(150, 110, 30);
        }
    }

    bool CheckApp()
    {
        string app = txtPath.Text.Trim();
        if (app.Length == 0 || !File.Exists(Path.Combine(app, "Typora.exe")))
        {
            MessageBox.Show(this, "请先选择包含 Typora.exe 的安装目录。", "路径无效", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            return false;
        }
        return true;
    }

    void Install()
    {
        if (!CheckApp()) return;
        string app = txtPath.Text.Trim();
        if (!Vt.LayoutSupported(app))
        {
            var r = MessageBox.Show(this,
                "当前 Typora 为旧版结构（1.9 及更早）。\n\n" +
                "旧版主进程是原生模块（main.node）+ 加密的 atom.js，没有可注入的 JS 入口，\n" +
                "本工具对这类版本无效（实测 1.7.6 / 1.8.10 / 1.9.5 均为此结构）。\n\n" +
                "已验证支持：1.10.8 ～ 1.14.10。\n\n" +
                "仍然要继续部署吗？（多半无效）",
                "版本不支持", MessageBoxButtons.YesNo, MessageBoxIcon.Warning);
            if (r != DialogResult.Yes) { Log("已取消：旧版结构不支持"); return; }
        }
        Vt.WriteLastPath(app);
        try
        {
            // 1) 运行时模块
            string dir = Vt.DataDir;
            foreach (var f in new[] { "virt-loader.js", "registration.js", "license-virtualize.js", "jsc-patch.js", "license-forge.js", "state-hunt.js", "VERSION" })
            {
                var bytes = Vt.Resource(f);
                if (bytes != null) { File.WriteAllBytes(Path.Combine(dir, f), bytes); Log("部署模块: " + f); }
            }

            // 2) 原生代理
            var dll = Vt.Resource("winmm.dll");
            if (dll == null) { Log("错误: 内嵌 winmm.dll 缺失"); return; }
            string dllPath = Path.Combine(app, "winmm.dll");
            if (File.Exists(dllPath) && !File.Exists(Path.Combine(dir, "winmm.dll.bak")))
                File.Copy(dllPath, Path.Combine(dir, "winmm.dll.bak"), true);
            File.WriteAllBytes(dllPath, dll);
            File.Copy(Path.Combine(Environment.SystemDirectory, "winmm.dll"), Path.Combine(app, "winmm_real.dll"), true);
            Log("部署原生代理: winmm.dll + winmm_real.dll");

            // 3) 加载器配置
            string loader = Path.Combine(dir, "virt-loader.js").Replace('\\', '/');
            File.WriteAllText(Path.Combine(app, "virt.cfg"), "{\"loader\":\"" + loader + "\"}", new UTF8Encoding(false));
            Log("写入 virt.cfg -> " + loader);

            // 4) 特权状态
            WriteState();
            Log("完成：重启 Typora 即生效（首次启动会自动重建旁路资源包）。");
            Refresh_();
        }
        catch (Exception ex) { Log("安装失败: " + ex.Message); }
    }

    void Activate()
    {
        try { WriteState(); Log("特权状态已写入: " + Vt.StateFile); }
        catch (Exception ex) { Log("写入失败: " + ex.Message); }
        try { Vt.WriteLastPath(txtPath.Text.Trim()); } catch { }
        Refresh_();
    }

    void WriteState()
    {
        string dir = Path.GetDirectoryName(Vt.StateFile);
        Directory.CreateDirectory(dir);
        string json = "{\n  \"machine\": \"" + machine + "\",\n  \"email\": \"user@local\",\n  \"code\": \"" + code + "\",\n  \"issued\": \"" + DateTime.Now.ToString("o") + "\",\n  \"source\": \"setup-gui\"\n}";
        File.WriteAllText(Vt.StateFile, json, new UTF8Encoding(false));
    }

    void Uninstall()
    {
        if (!CheckApp()) return;
        string app = txtPath.Text.Trim();
        Vt.WriteLastPath(app);
        try
        {
            foreach (var f in new[] { "winmm.dll", "winmm_real.dll", "virt.cfg" })
            {
                string p = Path.Combine(app, f);
                if (File.Exists(p)) { File.Delete(p); Log("移除 " + f); }
            }
            foreach (var f in new[] { "app.virt.asar", "app.virt.meta" })
            {
                string p = Path.Combine(app, "resources", f);
                if (File.Exists(p)) { File.Delete(p); Log("移除 resources\\" + f); }
            }
            if (File.Exists(Vt.StateFile)) { File.Delete(Vt.StateFile); Log("移除特权状态"); }
            string bak = Path.Combine(Vt.DataDir, "winmm.dll.bak");
            if (File.Exists(bak)) { File.Copy(bak, Path.Combine(app, "winmm.dll"), true); Log("恢复原 winmm.dll"); }
            Log("卸载完成。厂商 app.asar 从未被修改。");
            Refresh_();
        }
        catch (Exception ex) { Log("卸载失败: " + ex.Message); }
    }
}

static class Program
{
    [STAThread]
    static void Main(string[] args)
    {
        if (args != null && args.Length > 0)
        {
            if (string.Equals(args[0], "--uninstall-all", StringComparison.OrdinalIgnoreCase))
            {
                Environment.Exit(Vt.UninstallAll());
                return;
            }
        }
        Application.EnableVisualStyles();
        Application.Run(new SetupForm());
    }
}
