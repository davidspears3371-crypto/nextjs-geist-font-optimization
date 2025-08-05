import { NextRequest, NextResponse } from 'next/server'
import { deviceDetectionManager } from '@/lib/device-detection'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'detect'

    switch (action) {
      case 'detect':
        const deviceInfo = await deviceDetectionManager.detectDevice()
        return NextResponse.json({ 
          success: true, 
          deviceInfo,
          connected: !!deviceInfo
        })

      case 'is-oneplus':
        const isOnePlus = await deviceDetectionManager.isOnePlusDevice()
        return NextResponse.json({ 
          success: true, 
          isOnePlus
        })

      case 'supported-devices':
        // Return list of supported OnePlus devices
        const supportedDevices = [
          'enchilada', 'fajita', 'guacamole', 'guacamoleb', 'hotdog', 'hotdogb',
          'instantnoodle', 'instantnoodlep', 'kebab', 'lemonade', 'lemonadep',
          'martini', 'ne2213', 'op515bl1', 'salami', 'aston', 'avicii', 'billie'
        ]
        return NextResponse.json({ 
          success: true, 
          supportedDevices
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
    const { action, codename, operation } = body

    switch (action) {
      case 'get-support':
        if (!codename) {
          return NextResponse.json({ 
            success: false, 
            error: 'Device codename is required' 
          }, { status: 400 })
        }

        const deviceSupport = deviceDetectionManager.getDeviceSupport(codename)
        const isSupported = deviceDetectionManager.isDeviceSupported(codename)
        
        return NextResponse.json({ 
          success: true, 
          deviceSupport,
          isSupported
        })

      case 'validate-operation':
        if (!operation) {
          return NextResponse.json({ 
            success: false, 
            error: 'Operation type is required' 
          }, { status: 400 })
        }

        const validation = await deviceDetectionManager.validateDeviceForOperation(
          operation as 'rom_flash' | 'radio_flash' | 'root'
        )
        
        return NextResponse.json({ 
          success: true, 
          validation
        })

      case 'get-warnings':
        if (!codename) {
          return NextResponse.json({ 
            success: false, 
            error: 'Device codename is required' 
          }, { status: 400 })
        }

        const warnings = deviceDetectionManager.getWarningMessages(codename)
        
        return NextResponse.json({ 
          success: true, 
          warnings
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
