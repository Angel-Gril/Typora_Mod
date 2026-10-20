'use strict';
// 计算本机真实机器码字段（用于伪造 publicDecrypt 明文）
const crypto = require('crypto');
const os = require('os');
const { execSync } = require('child_process');

let guid = '';
try {
  const out = execSync('reg query "HKLM\\SOFTWARE\\Microsoft\\Cryptography" /v MachineGuid', { encoding: 'utf8', windowsHide: true });
  const m = out.match(/MachineGuid\s+REG_SZ\s+(\S+)/i);
  if (m) guid = m[1];
} catch (e) {}
if (!guid) guid = os.hostname();

const digest = crypto.createHash('sha256').update(guid + 'typora').digest('base64');
const i = digest.slice(0, 10);
const l = [os.userInfo().username, os.hostname(), 'Windows'].join(' | ');
const machineCode = Buffer.from(JSON.stringify({ v: 'win|1.14.10', i, l })).toString('base64');

console.log(JSON.stringify({ guid, digest, i, l, machineCode }, null, 1));
