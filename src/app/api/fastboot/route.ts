import { NextRequest, NextResponse } from 'next/server'
import { fastbootManager } from '@/lib/fastboot'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    switch (action) {
      case 'check':
        const isInstalled = await fastbootManager.checkFastbootInstallation()
        return NextResponse.json({ 
          success: true, 
          installed: isInstalled,
          message: isInstalled ? 'Fastboot is installed' : 'Fastboot not found'
        })

      case 'devices':
        const devices = await fastbootManager.getConnectedDevices()
        return NextResponse.json({ 
          success: true, 
          devices,
          count: devices.length
        })

      case 'bootloader-info':
        const deviceId = searchParams.get('deviceId')
        const bootloaderInfo = await fastbootManager.getBootloaderInfo(deviceId || undefined)
        return NextResponse.json({ 
          success: true, 
          bootloaderInfo
        })

      case 'wait':
        const timeout = parseInt(searchParams.get('timeout') || '30000')
        const waitResult = await fastbootManager.waitForDevice(timeout)
        return NextResponse.json({ 
          success: waitResult,
          message: waitResult ? 'Device found in fastboot mode' : 'Device not found within timeout'
        })

      case 'codename':
        const codenameDeviceId = searchParams.get('deviceId')
        const codename = await fastbootManager.getDeviceCodename(codenameDeviceId || undefined)
        return NextResponse.json({ 
          success: true, 
          codename
        })

      case 'is-oneplus':
        const oneplusDeviceId = searchParams.get('deviceId')
        const isOnePlus = await fastbootManager.isOnePlusDevice(oneplusDeviceId || undefined)
        return NextResponse.json({ 
          success: true, 
          isOnePlus
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
    const { action, deviceId } = body

    switch (action) {
      case 'execute':
        const { command } = body
        if (!command) {
          return NextResponse.json({ 
            success: false, 
            error: 'Command is required' 
          }, { status: 400 })
        }

        const result = await fastbootManager.executeCommand(command, deviceId)
        return NextResponse.json({ 
          success: result.success,
          output: result.output,
          error: result.error
        })

      case 'unlock-bootloader':
        const unlockResult = await fastbootManager.unlockBootloader(deviceId)
        return NextResponse.json({ 
          success: unlockResult.success,
          output: unlockResult.output,
          error: unlockResult.error,
          message: 'Please confirm bootloader unlock on your device'
        })

      case 'lock-bootloader':
        const lockResult = await fastbootManager.lockBootloader(deviceId)
        return NextResponse.json({ 
          success: lockResult.success,
          output: lockResult.output,
          error: lockResult.error
        })

      case 'flash-partition':
        const { partition, imagePath } = body
        if (!partition || !imagePath) {
          return NextResponse.json({ 
            success: false, 
            error: 'Partition and image path are required' 
          }, { status: 400 })
        }

        // Validate image file exists
        const isValid = await fastbootManager.validateImage(imagePath)
        if (!isValid) {
          return NextResponse.json({ 
            success: false, 
            error: 'Invalid or missing image file' 
          }, { status: 400 })
        }

        const flashResult = await fastbootManager.flashPartition(partition, imagePath, deviceId)
        return NextResponse.json({ 
          success: flashResult.success,
          output: flashResult.output,
          error: flashResult.error
        })

      case 'flash-recovery':
        const { recoveryPath } = body
        if (!recoveryPath) {
          return NextResponse.json({ 
            success: false, 
            error: 'Recovery image path is required' 
          }, { status: 400 })
        }

        const recoveryResult = await fastbootManager.flashRecovery(recoveryPath, deviceId)
        return NextResponse.json({ 
          success: recoveryResult.success,
          output: recoveryResult.output,
          error: recoveryResult.error
        })

      case 'flash-boot':
        const { bootPath } = body
        if (!bootPath) {
          return NextResponse.json({ 
            success: false, 
            error: 'Boot image path is required' 
          }, { status: 400 })
        }

        const bootResult = await fastbootManager.flashBoot(bootPath, deviceId)
        return NextResponse.json({ 
          success: bootResult.success,
          output: bootResult.output,
          error: bootResult.error
        })

      case 'flash-system':
        const { systemPath } = body
        if (!systemPath) {
          return NextResponse.json({ 
            success: false, 
            error: 'System image path is required' 
          }, { status: 400 })
        }

        const systemResult = await fastbootManager.flashSystem(systemPath, deviceId)
        return NextResponse.json({ 
          success: systemResult.success,
          output: systemResult.output,
          error: systemResult.error
        })

      case 'flash-radio':
        const { radioPath } = body
        if (!radioPath) {
          return NextResponse.json({ 
            success: false, 
            error: 'Radio image path is required' 
          }, { status: 400 })
        }

        const radioResult = await fastbootManager.flashRadio(radioPath, deviceId)
        return NextResponse.json({ 
          success: radioResult.success,
          output: radioResult.output,
          error: radioResult.error
        })

      case 'flash-modem':
        const { modemPath } = body
        if (!modemPath) {
          return NextResponse.json({ 
            success: false, 
            error: 'Modem image path is required' 
          }, { status: 400 })
        }

        const modemResult = await fastbootManager.flashModem(modemPath, deviceId)
        return NextResponse.json({ 
          success: modemResult.success,
          output: modemResult.output,
          error: modemResult.error
        })

      case 'erase-partition':
        const { erasePartition } = body
        if (!erasePartition) {
          return NextResponse.json({ 
            success: false, 
            error: 'Partition name is required' 
          }, { status: 400 })
        }

        const eraseResult = await fastbootManager.erasePartition(erasePartition, deviceId)
        return NextResponse.json({ 
          success: eraseResult.success,
          output: eraseResult.output,
          error: eraseResult.error
        })

      case 'format-partition':
        const { formatPartition, filesystem } = body
        if (!formatPartition) {
          return NextResponse.json({ 
            success: false, 
            error: 'Partition name is required' 
          }, { status: 400 })
        }

        const formatResult = await fastbootManager.formatPartition(
          formatPartition, 
          filesystem || 'ext4', 
          deviceId
        )
        return NextResponse.json({ 
          success: formatResult.success,
          output: formatResult.output,
          error: formatResult.error
        })

      case 'reboot':
        const mode = body.mode || 'system'
        const rebootResult = await fastbootManager.rebootDevice(mode as any, deviceId)
        return NextResponse.json({ 
          success: rebootResult.success,
          output: rebootResult.output,
          error: rebootResult.error
        })

      case 'continue':
        const continueResult = await fastbootManager.continueBootloader(deviceId)
        return NextResponse.json({ 
          success: continueResult.success,
          output: continueResult.output,
          error: continueResult.error
        })

      case 'get-partition-info':
        const { infoPartition } = body
        if (!infoPartition) {
          return NextResponse.json({ 
            success: false, 
            error: 'Partition name is required' 
          }, { status: 400 })
        }

        const partitionInfo = await fastbootManager.getPartitionInfo(infoPartition, deviceId)
        return NextResponse.json({ 
          success: true,
          partitionInfo
        })

      case 'validate-image':
        const { validateImagePath } = body
        if (!validateImagePath) {
          return NextResponse.json({ 
            success: false, 
            error: 'Image path is required' 
          }, { status: 400 })
        }

        const isValidImage = await fastbootManager.validateImage(validateImagePath)
        return NextResponse.json({ 
          success: true,
          valid: isValidImage,
          message: isValidImage ? 'Image file is valid' : 'Image file is invalid or missing'
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
