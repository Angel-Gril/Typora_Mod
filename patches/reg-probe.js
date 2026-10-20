// 注册表 + 加密 API 观测探针
const ADV = 'advapi32.dll';
function readStr(hKey) { return hKey.toString(16); }

function getExport(mod, fn) {
  if (Module.getGlobalExportByName) return Module.getGlobalExportByName(fn);
  return Process.getModuleByName(mod).getExportByName(fn);
}
['RegOpenKeyExW','RegCreateKeyExW','RegQueryValueExW','RegSetValueExW','RegDeleteValueW'].forEach(fn => {
  const p = getExport(ADV, fn);
  Interceptor.attach(p, {
    onEnter(args) {
      this.fn = fn;
      if (fn === 'RegOpenKeyExW' || fn === 'RegCreateKeyExW') {
        this.subKey = args[1].readUtf16String();
        if (this.subKey && /Typora|Cryptography/i.test(this.subKey)) {
          this.hit = true;
          console.log(`[${fn}] access=${args[4]||args[5]} key=${this.subKey}`);
        }
      } else if (fn === 'RegQueryValueExW' || fn === 'RegSetValueExW' || fn === 'RegDeleteValueW') {
        this.valName = args[1].readUtf16String();
        this.hit = true;
        let extra = '';
        if ((fn === 'RegQueryValueExW' || fn === 'RegSetValueExW') && !args[3].isNull()) {
          const type = args[3].toInt32();
          if (type === 1 && !args[4].isNull()) { try { extra = ' data="' + args[4].readUtf16String() + '"'; } catch(e){} }
        }
        console.log(`[${fn}] value=${this.valName}${extra}`);
      }
    }
  });
});
console.log('[*] registry probe installed');
