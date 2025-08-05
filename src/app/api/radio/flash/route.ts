import { NextRequest, NextResponse } from 'next/server'
import { radioFirmwareManager } from '@/lib/radio-firmware'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, firmwarePath, deviceId, firmwareId } = body

    switch (action) {
      case 'flash':
        if (!firmwarePath) {
          return NextResponse.json({ 
            success: false, 
            error: 'Firmware path is required' 
          }, { status: 400 })
        }

        // Stream the flashing progress
        const encoder = new TextEncoder()
        const stream = new ReadableStream({
          start(controller) {
            const flashFirmware = async () => {
              try {
                const success = await radioFirmwareManager.flashRadioFirmware(
                  firmwarePath,
                  deviceId,
                  (progress) => {
                    const data = encoder.encode(`data: ${JSON.stringify(progress)}\n\n`)
                    controller.enqueue(data)
                  }
                )

                const finalResult = {
                  success,
                  stage: success ? 'complete' : 'error',
                  progress: success ? 100 : 0,
                  message: success ? 'Radio firmware flashed successfully!' : 'Flash operation failed'
                }

                const data = encoder.encode(`data: ${JSON.stringify(finalResult)}\n\n`)
                controller.enqueue(data)
                controller.close()
              } catch (error: any) {
                const errorResult = {
                  success: false,
                  stage: 'error',
                  progress: 0,
                  message: 'Flash operation failed',
                  error: error.message
                }

                const data = encoder.encode(`data: ${JSON.stringify(errorResult)}\n\n`)
                controller.enqueue(data)
                controller.close()
              }
            }

            flashFirmware()
          }
        })

        return new Response(stream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        })

      case 'get-current-version':
        const currentVersion = await radioFirmwareManager.getCurrentRadioVersion(deviceId)
        return NextResponse.json({ 
          success: true, 
          currentVersion
        })

      case 'backup':
        const backupPath = await radioFirmwareManager.backupCurrentRadio(deviceId)
        return NextResponse.json({ 
          success: !!backupPath, 
          backupPath,
          message: backupPath ? 'Radio backup created' : 'Backup failed - requires root access'
        })

      case 'download':
        if (!firmwareId) {
          return NextResponse.json({ 
            success: false, 
            error: 'Firmware ID is required' 
          }, { status: 400 })
        }

        // This would need to be implemented with actual firmware data
        // For now, return a mock response
        return NextResponse.json({ 
          success: false, 
          error: 'Download functionality not yet implemented' 
        }, { status: 501 })

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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const deviceId = searchParams.get('deviceId')

    switch (action) {
      case 'current-version':
        const currentVersion = await radioFirmwareManager.getCurrentRadioVersion(deviceId || undefined)
        return NextResponse.json({ 
          success: true, 
          currentVersion
        })

      case 'initialize-cache':
        await radioFirmwareManager.initializeCache()
        return NextResponse.json({ 
          success: true, 
          message: 'Cache initialized'
        })

      case 'clear-cache':
        await radioFirmwareManager.clearCache()
        return NextResponse.json({ 
          success: true, 
          message: 'Cache cleared'
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
