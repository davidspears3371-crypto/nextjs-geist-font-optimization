import { NextRequest, NextResponse } from 'next/server'
import { radioFirmwareManager } from '@/lib/radio-firmware'
import { firmwareDatabaseManager } from '@/lib/firmware-database'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const codename = searchParams.get('codename')
    const region = searchParams.get('region')
    const version = searchParams.get('version')
    const officialOnly = searchParams.get('officialOnly') === 'true'
    const action = searchParams.get('action') || 'search'

    switch (action) {
      case 'search':
        if (!codename) {
          return NextResponse.json({ 
            success: false, 
            error: 'Device codename is required' 
          }, { status: 400 })
        }

        const searchResults = await firmwareDatabaseManager.searchFirmware(
          codename,
          region || undefined,
          version || undefined,
          officialOnly
        )

        return NextResponse.json({ 
          success: true, 
          ...searchResults
        })

      case 'popular':
        if (!codename) {
          return NextResponse.json({ 
            success: false, 
            error: 'Device codename is required' 
          }, { status: 400 })
        }

        const limit = parseInt(searchParams.get('limit') || '5')
        const popularFirmware = await firmwareDatabaseManager.getPopularFirmware(codename, limit)

        return NextResponse.json({ 
          success: true, 
          firmware: popularFirmware,
          totalCount: popularFirmware.length
        })

      case 'latest':
        if (!codename) {
          return NextResponse.json({ 
            success: false, 
            error: 'Device codename is required' 
          }, { status: 400 })
        }

        const latestFirmware = await firmwareDatabaseManager.getLatestFirmware(codename, officialOnly)

        return NextResponse.json({ 
          success: true, 
          firmware: latestFirmware
        })

      case 'compatible':
        if (!codename) {
          return NextResponse.json({ 
            success: false, 
            error: 'Device codename is required' 
          }, { status: 400 })
        }

        const currentVersion = searchParams.get('currentVersion')
        const compatibleFirmware = await radioFirmwareManager.getCompatibleFirmware(
          codename,
          currentVersion || undefined
        )

        return NextResponse.json({ 
          success: true, 
          firmware: compatibleFirmware,
          totalCount: compatibleFirmware.length
        })

      case 'check-updates':
        if (!codename) {
          return NextResponse.json({ 
            success: false, 
            error: 'Device codename is required' 
          }, { status: 400 })
        }

        const currentVersionForUpdate = searchParams.get('currentVersion')
        if (!currentVersionForUpdate) {
          return NextResponse.json({ 
            success: false, 
            error: 'Current version is required for update check' 
          }, { status: 400 })
        }

        const updateInfo = await firmwareDatabaseManager.checkForUpdates(
          currentVersionForUpdate,
          codename
        )

        return NextResponse.json({ 
          success: true, 
          ...updateInfo
        })

      case 'validate-url':
        const url = searchParams.get('url')
        if (!url) {
          return NextResponse.json({ 
            success: false, 
            error: 'URL is required' 
          }, { status: 400 })
        }

        const isValidUrl = await firmwareDatabaseManager.validateFirmwareUrl(url)

        return NextResponse.json({ 
          success: true, 
          valid: isValidUrl,
          message: isValidUrl ? 'URL is accessible' : 'URL is not accessible'
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
    const { action, firmwareId, codename, downloadUrl } = body

    switch (action) {
      case 'get-details':
        if (!firmwareId) {
          return NextResponse.json({ 
            success: false, 
            error: 'Firmware ID is required' 
          }, { status: 400 })
        }

        const firmwareDetails = await firmwareDatabaseManager.getFirmwareDetails(firmwareId)

        return NextResponse.json({ 
          success: true, 
          firmware: firmwareDetails
        })

      case 'download':
        if (!downloadUrl) {
          return NextResponse.json({ 
            success: false, 
            error: 'Download URL is required' 
          }, { status: 400 })
        }

        // Stream the download progress
        const encoder = new TextEncoder()
        const stream = new ReadableStream({
          start(controller) {
            const downloadFirmware = async () => {
              try {
                // Mock firmware object for download
                const mockFirmware = {
                  id: firmwareId || 'unknown',
                  version: 'unknown',
                  codename: codename || 'unknown',
                  marketName: 'Unknown Device',
                  region: 'Global',
                  buildDate: new Date().toISOString().split('T')[0],
                  size: 50000000, // 50MB
                  md5: 'mock_md5',
                  sha256: 'mock_sha256',
                  downloadUrl,
                  isOfficial: true,
                  compatibility: [],
                  changelog: 'Downloaded firmware'
                }

                const filePath = await radioFirmwareManager.downloadRadioFirmware(
                  mockFirmware,
                  (progress) => {
                    const data = encoder.encode(`data: ${JSON.stringify({
                      progress,
                      message: `Downloading... ${Math.round(progress)}%`
                    })}\n\n`)
                    controller.enqueue(data)
                  }
                )

                const finalResult = {
                  success: true,
                  progress: 100,
                  message: 'Download completed successfully!',
                  filePath
                }

                const data = encoder.encode(`data: ${JSON.stringify(finalResult)}\n\n`)
                controller.enqueue(data)
                controller.close()
              } catch (error: any) {
                const errorResult = {
                  success: false,
                  progress: 0,
                  message: 'Download failed',
                  error: error.message
                }

                const data = encoder.encode(`data: ${JSON.stringify(errorResult)}\n\n`)
                controller.enqueue(data)
                controller.close()
              }
            }

            downloadFirmware()
          }
        })

        return new Response(stream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        })

      case 'search-advanced':
        const { 
          query, 
          region, 
          version, 
          officialOnly, 
          sortBy, 
          limit 
        } = body

        if (!codename) {
          return NextResponse.json({ 
            success: false, 
            error: 'Device codename is required' 
          }, { status: 400 })
        }

        // Perform advanced search with filters
        const advancedResults = await firmwareDatabaseManager.searchFirmware(
          codename,
          region,
          version,
          officialOnly || false
        )

        // Apply additional filtering and sorting if needed
        let filteredResults = advancedResults.firmware

        if (query) {
          const searchQuery = query.toLowerCase()
          filteredResults = filteredResults.filter(fw => 
            fw.version.toLowerCase().includes(searchQuery) ||
            fw.changelog?.toLowerCase().includes(searchQuery) ||
            fw.region.toLowerCase().includes(searchQuery)
          )
        }

        if (sortBy) {
          filteredResults.sort((a, b) => {
            switch (sortBy) {
              case 'version':
                return b.version.localeCompare(a.version)
              case 'date':
                return new Date(b.buildDate).getTime() - new Date(a.buildDate).getTime()
              case 'size':
                return b.size - a.size
              default:
                return 0
            }
          })
        }

        if (limit && limit > 0) {
          filteredResults = filteredResults.slice(0, limit)
        }

        return NextResponse.json({ 
          success: true, 
          firmware: filteredResults,
          totalCount: filteredResults.length,
          hasMore: false
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
