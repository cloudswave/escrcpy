import { createHmac } from 'crypto';
import { networkInterfaces } from 'os';
import path from 'node:path';
import fs from 'node:fs';
import { app, ipcMain } from 'electron';

const SALT_KEY = 'escrcpy-salt-key-2024';

class AuthorizationConfig {
  machine_code = '';
  license_key = '';
  signature = '';
  timestamp = 0;
}

function getMacAddress() {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.mac && net.mac !== '00:00:00:00:00:00' && !net.internal) {
        return net.mac;
      }
    }
  }
  return null;
}

function generateSignature(machineCode, licenseKey) {
  const hmac = createHmac('sha256', SALT_KEY);
  hmac.update(machineCode);
  hmac.update(licenseKey);
  return hmac.digest('base64');
}

function verifySignature(machineCode, licenseKey, signature) {
  const expected = generateSignature(machineCode, licenseKey);
  return expected === signature;
}

function configPath() {
  const p = path.join(app.getPath('userData'), 'auth.json');
  return p;
}

function loadAuthorization() {
  const p = configPath();
  if (!fs.existsSync(p)) {
    return null;
  }
  try {
    const text = fs.readFileSync(p, 'utf8');
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function saveAuthorization(auth) {
  const p = configPath();
  const dir = path.dirname(p);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(p, JSON.stringify(auth, null, 2));
  return true;
}

export async function verifyAuthorization(licenseKey) {
  const mac = getMacAddress();
  if (!mac) {
    throw new Error('获取 MAC 地址失败');
  }

  const machineCode = `escrcpy_${mac}`;

  try {
    const response = await fetch('http://zjw.ethan.cloud-ip.biz/license/api.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        machine_code: machineCode,
        license_key: licenseKey.trim(),
      }),
    });

    const authResponse = await response.json();

    if (authResponse.status === 'success') {
      const signature = generateSignature(machineCode, licenseKey.trim());
      const authConfig = {
        machine_code: machineCode,
        license_key: licenseKey.trim(),
        signature,
        timestamp: Math.floor(Date.now() / 1000),
      };
      saveAuthorization(authConfig);
      return authResponse;
    } else {
      throw new Error(authResponse.message || '授权失败');
    }
  } catch (error) {
    if (error.message === 'Failed to fetch') {
      // 网络请求失败，可能是离线状态，检查本地签名是否存在
      const auth = loadAuthorization();
      if (auth && auth.machine_code === machineCode) {
        if (verifySignature(machineCode, licenseKey.trim(), auth.signature)) {
          return { status: 'success', message: '离线授权成功' };
        }
      }
    }
    throw error;
  }
}

export async function checkAuthorizationStatus() {
  const auth = loadAuthorization();
  if (!auth) {
    return false;
  }

  const currentMac = getMacAddress();
  if (!currentMac) {
    return false;
  }

  const currentMachineCode = `escrcpy_${currentMac}`;

  if (auth.machine_code !== currentMachineCode) {
    return false;
  }

  return verifySignature(auth.machine_code, auth.license_key, auth.signature);
}

export function setupAuthCommands(ipcMain) {
  ipcMain.handle('verify-authorization', async (event, licenseKey) => {
    return await verifyAuthorization(licenseKey);
  });

  ipcMain.handle('check-authorization-status', async () => {
    return await checkAuthorizationStatus();
  });
}