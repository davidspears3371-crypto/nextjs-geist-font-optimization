import { NextRequest, NextResponse } from 'next/server'
import { adbManager } from '@/lib/adb'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    switch (action) {
      case 'check':
        const isInstalled = await adbManager.checkADBInstallation()
        return NextResponse.json({ 
          success: true, 
          installed: isInstalled,
          message: isInstalled ? 'ADB is installed' : 'ADB not found'
        })

      case 'devices':
        const devices = await adbManager.getConnectedDevices()
        return NextResponse.json({ 
          success: true, 
          devices,
          count: devices.length
        })

      case 'info':
        const deviceId = searchParams.get('deviceId')
        const deviceInfo = await adbManager.getDeviceInfo(deviceId || undefined)
        return NextResponse.json({ 
          success: true, 
          deviceInfo
        })

      default:
        return NextResponse.json({ 
          success: false, 
          error: 'Invalid action' 
        }, { status: 400 })
    }
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, command, deviceId } = body

    switch (action) {
      case 'execute':
        if (!command) {
          return NextResponse.json({ 
            success: false, 
            error: 'Command is required' 
          }, { status: 400 })
        }

        const result = await adbManager.executeCommand(command, deviceId)
        return NextResponse.json({ 
          success: result.success,
          output: result.output,
          error: result.error
        })

      case 'reboot':
        const mode = body.mode || 'system'
        const rebootResult = await adbManager.rebootDevice(mode as any, deviceId)
        return NextResponse.json({ 
          success: rebootResult.success,
          output: rebootResult.output,
          error: rebootResult.error
        })

      case 'install':
        const apkPath = body.apkPath
        if (!apkPath) {
          return NextResponse.json({ 
            success: false, 
            error: 'APK path is required' 
          }, { status: 400 })
        }

        const installResult = await adbManager.installAPK(apkPath, deviceId)
        return NextResponse.json({ 
          success: installResult.success,
          output: installResult.output,
          error: installResult.error
        })

      case 'push':
        const { localPath, remotePath } = body
        if (!localPath || !remotePath) {
          return NextResponse.json({ 
            success: false, 
            error: 'Local and remote paths are required' 
          }, { status: 400 })
        }

        const pushResult = await adbManager.pushFile(localPath, remotePath, deviceId)
        return NextResponse.json({ 
          success: pushResult.success,
          output: pushResult.output,
          error: pushResult.error
        })

      case 'pull':
        const { remotePath: pullRemotePath, localPath: pullLocalPath } = body
        if (!pullRemotePath || !pullLocalPath) {
          return NextResponse.json({ 
            success: false, 
            error: 'Remote and local paths are required' 
          }, { status: 400 })
        }

        const pullResult = await adbManager.pullFile(pullRemotePath, pullLocalPath, deviceId)
        return NextResponse.json({ 
          success: pullResult.success,
          output: pullResult.output,
          error: pullResult.error
        })

      case 'wait':
        const timeout = body.timeout || 30000
        const waitResult = await adbManager.waitForDevice(timeout)
        return NextResponse.json({ 
          success: waitResult,
          message: waitResult ? 'Device found' : 'Device not found within timeout'
        })

      default:
        return NextResponse.json({ 
          success: false, 
          error: 'Invalid action' 
        }, { status: 400 })
    }
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Clear device cache
    adbManager.clearDeviceCache()
    
    return NextResponse.json({ 
      success: true,
      message: 'Device cache cleared'
    })
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}
