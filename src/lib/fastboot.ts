import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export interface FastbootCommandResult {
  success: boolean
  output: string
  error?: string
}

export interface BootloaderInfo {
  version: string
  variant: string
  locked: boolean
  secureboot: boolean
  serialNumber: string
}

export class FastbootManager {
  private static instance: FastbootManager

  static getInstance(): FastbootManager {
    if (!FastbootManager.instance) {
      FastbootManager.instance = new FastbootManager()
    }
    return FastbootManager.instance
  }

  async checkFastbootInstallation(): Promise<boolean> {
    try {
      const { stdout } = await execAsync('fastboot --version')
      return stdout.includes('fastboot version') || stdout.includes('Android Debug Bridge')
    } catch (error) {
      return false
    }
  }

  async getConnectedDevices(): Promise<string[]> {
    try {
      const { stdout } = await execAsync('fastboot devices')
      const lines = stdout.split('\n')
      const devices = lines
        .filter(line => line.trim() && line.includes('fastboot'))
        .map(line => line.split('\t')[0])
        .filter(id => id && id !== '')
      
      return devices
    } catch (error) {
      console.error('Error getting fastboot devices:', error)
      return []
    }
  }

  async getBootloaderInfo(deviceId?: string): Promise<BootloaderInfo | null> {
    try {
      const devices = await this.getConnectedDevices()
      if (devices.length === 0) {
        return null
      }

      const targetDevice = deviceId || devices[0]
      const devicePrefix = deviceId ? `-s ${deviceId}` : ''

      // Get bootloader variables
      const [version, variant, locked, secureboot, serialNumber] = await Promise.all([
        this.getVariable('version-bootloader', devicePrefix),
        this.getVariable('variant', devicePrefix),
        this.getVariable('unlocked', devicePrefix),
        this.getVariable('secure', devicePrefix),
        this.getVariable('serialno', devicePrefix)
      ])

      return {
        version: version || 'Unknown',
        variant: variant || 'Unknown',
        locked: locked !== 'yes',
        secureboot: secureboot === 'yes',
        serialNumber: serialNumber || 'Unknown'
      }
    } catch (error) {
      console.error('Error getting bootloader info:', error)
      return null
    }
  }

  private async getVariable(variable: string, devicePrefix: string): Promise<string | null> {
    try {
      const command = devicePrefix 
        ? `fastboot ${devicePrefix} getvar ${variable}`
        : `fastboot getvar ${variable}`
      
      const { stdout, stderr } = await execAsync(command)
      
      // Fastboot often outputs to stderr
      const output = stdout + stderr
      const match = output.match(new RegExp(`${variable}:\\s*(.+)`))
      return match ? match[1].trim() : null
    } catch (error) {
      return null
    }
  }

  async executeCommand(command: string, deviceId?: string): Promise<FastbootCommandResult> {
    try {
      const devicePrefix = deviceId ? `-s ${deviceId}` : ''
      const fullCommand = devicePrefix 
        ? `fastboot ${devicePrefix} ${command}`
        : `fastboot ${command}`
      
      const { stdout, stderr } = await execAsync(fullCommand)
      
      return {
        success: true,
        output: stdout + stderr, // Fastboot uses both stdout and stderr
        error: undefined
      }
    } catch (error: any) {
      return {
        success: false,
        output: '',
        error: error.message
      }
    }
  }

  async unlockBootloader(deviceId?: string): Promise<FastbootCommandResult> {
    const result = await this.executeCommand('flashing unlock', deviceId)
    
    if (result.success) {
      // Wait for user confirmation on device
      console.log('Please confirm bootloader unlock on your device')
    }
    
    return result
  }

  async lockBootloader(deviceId?: string): Promise<FastbootCommandResult> {
    return this.executeCommand('flashing lock', deviceId)
  }

  async flashPartition(partition: string, imagePath: string, deviceId?: string): Promise<FastbootCommandResult> {
    return this.executeCommand(`flash ${partition} "${imagePath}"`, deviceId)
  }

  async flashRecovery(recoveryPath: string, deviceId?: string): Promise<FastbootCommandResult> {
    return this.flashPartition('recovery', recoveryPath, deviceId)
  }

  async flashBoot(bootPath: string, deviceId?: string): Promise<FastbootCommandResult> {
    return this.flashPartition('boot', bootPath, deviceId)
  }

  async flashSystem(systemPath: string, deviceId?: string): Promise<FastbootCommandResult> {
    return this.flashPartition('system', systemPath, deviceId)
  }

  async flashRadio(radioPath: string, deviceId?: string): Promise<FastbootCommandResult> {
    return this.flashPartition('radio', radioPath, deviceId)
  }

  async flashModem(modemPath: string, deviceId?: string): Promise<FastbootCommandResult> {
    return this.flashPartition('modem', modemPath, deviceId)
  }

  async erasePartition(partition: string, deviceId?: string): Promise<FastbootCommandResult> {
    return this.executeCommand(`erase ${partition}`, deviceId)
  }

  async formatPartition(partition: string, filesystem: string = 'ext4', deviceId?: string): Promise<FastbootCommandResult> {
    return this.executeCommand(`format:${filesystem} ${partition}`, deviceId)
  }

  async rebootDevice(mode: 'system' | 'bootloader' | 'recovery' = 'system', deviceId?: string): Promise<FastbootCommandResult> {
    const rebootCommand = mode === 'system' ? 'reboot' : `reboot-${mode}`
    return this.executeCommand(rebootCommand, deviceId)
  }

  async continueBootloader(deviceId?: string): Promise<FastbootCommandResult> {
    return this.executeCommand('continue', deviceId)
  }

  async getPartitionInfo(partition: string, deviceId?: string): Promise<string | null> {
    try {
      const result = await this.executeCommand(`getvar partition-type:${partition}`, deviceId)
      if (result.success) {
        const match = result.output.match(/partition-type:\w+:\s*(.+)/)
        return match ? match[1].trim() : null
      }
      return null
    } catch (error) {
      return null
    }
  }

  async waitForDevice(timeout: number = 30000): Promise<boolean> {
    const startTime = Date.now()
    
    while (Date.now() - startTime < timeout) {
      const devices = await this.getConnectedDevices()
      if (devices.length > 0) {
        return true
      }
      
      // Wait 1 second before checking again
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    return false
  }

  async validateImage(imagePath: string): Promise<boolean> {
    try {
      // Basic file existence check
      const fs = require('fs').promises
      await fs.access(imagePath)
      
      // Check file size (should be > 0)
      const stats = await fs.stat(imagePath)
      return stats.size > 0
    } catch (error) {
      return false
    }
  }

  async getDeviceCodename(deviceId?: string): Promise<string | null> {
    return this.getVariable('product', deviceId ? `-s ${deviceId}` : '')
  }

  async isOnePlusDevice(deviceId?: string): Promise<boolean> {
    try {
      const product = await this.getVariable('product', deviceId ? `-s ${deviceId}` : '')
      const brand = await this.getVariable('brand', deviceId ? `-s ${deviceId}` : '')
      
      return (product?.toLowerCase().includes('oneplus') || 
              brand?.toLowerCase().includes('oneplus') ||
              product?.toLowerCase().includes('op') ||
              product?.toLowerCase().includes('nord')) ?? false
    } catch (error) {
      return false
    }
  }
}

export const fastbootManager = FastbootManager.getInstance()
