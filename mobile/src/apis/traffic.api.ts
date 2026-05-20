export interface TrafficAskPayload {
  question: string
}

export interface TrafficCard {
  type: 'violation' | 'general' | 'not_found'
  title: string
  userFriendlyExplanation?: string
  summary?: string
  details?: string[]
  penalties?: any[]
}

export interface TrafficAskResult {
  card: TrafficCard
  rawText: string
}

export interface TrafficApiResponse {
  message: string
  data: TrafficAskResult
}

export async function askTrafficAI(
  question: string,
  accessToken?: string
): Promise<TrafficAskResult> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  }

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
  }

  const response = await fetch(`${process.env.EXPO_PUBLIC_API_BASE_URL}/traffic-ai/ask`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ question } satisfies TrafficAskPayload)
  })

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '')
    throw new Error(`API error ${response.status}: ${errorBody}`)
  }

  const json: TrafficApiResponse = await response.json()

  // Trả về dữ liệu đã nhận từ backend
  return {
    card: json.data?.card || {
      type: 'not_found',
      title: 'Thông báo',
      message: 'Không tìm thấy thông tin phản hồi từ hệ thống.'
    },
    rawText: json.data?.rawText || ''
  }
}
