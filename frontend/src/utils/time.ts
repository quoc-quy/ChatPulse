// frontend-demo/src/utils/time.ts

export const formatZaloMessageTime = (dateString: string | Date): string => {
  const date = new Date(dateString)
  const now = new Date()

  // Đặt thời gian về đầu ngày (00:00:00) để dễ so sánh
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfYesterday = new Date(startOfToday)
  startOfYesterday.setDate(startOfToday.getDate() - 1)
  const startOfThisWeek = new Date(startOfToday)
  // Lùi về thứ 2 của tuần hiện tại (Quy ước: Thứ 2 = 1, CN = 0)
  const dayOfWeek = startOfToday.getDay() === 0 ? 7 : startOfToday.getDay()
  startOfThisWeek.setDate(startOfToday.getDate() - dayOfWeek + 1)

  const timeString = date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })

  // 1. Hôm nay
  if (date >= startOfToday) {
    return timeString
  }

  // 2. Hôm qua
  if (date >= startOfYesterday && date < startOfToday) {
    return `Hôm qua ${timeString}`
  }

  // 3. Trong tuần này (nhưng không phải hôm qua)
  if (date >= startOfThisWeek && date < startOfYesterday) {
    const days = ['CN', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7']
    return `${days[date.getDay()]} ${timeString}`
  }

  const dayAndMonth = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`

  // 4. Trong năm nay (nhưng khác tuần)
  if (date.getFullYear() === now.getFullYear()) {
    return `${dayAndMonth} ${timeString}`
  }

  // 5. Khác năm hiện tại
  return `${dayAndMonth}/${date.getFullYear()} ${timeString}`
}

/**
 * Hàm kiểm tra xem có cần hiển thị mốc thời gian giữa 2 tin nhắn hay không.
 * Điều kiện: Cách nhau hơn 5 phút (300,000 milliseconds) hoặc khác ngày.
 */
export const shouldShowTimeDivider = (
  currentMsgDateStr: string | Date,
  previousMsgDateStr?: string | Date
): boolean => {
  if (!previousMsgDateStr) return true // Luôn hiển thị cho tin nhắn đầu tiên trong danh sách

  const current = new Date(currentMsgDateStr)
  const previous = new Date(previousMsgDateStr)

  // Khác ngày
  if (
    current.getDate() !== previous.getDate() ||
    current.getMonth() !== previous.getMonth() ||
    current.getFullYear() !== previous.getFullYear()
  ) {
    return true
  }

  // Cách nhau hơn 5 phút
  const diffInMinutes = (current.getTime() - previous.getTime()) / (1000 * 60)
  return diffInMinutes > 5
}
