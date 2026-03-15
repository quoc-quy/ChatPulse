import http from '@/utils/http'

export const groupApi = {
  // Gửi một mảng member_ids để thêm vào nhóm
  addMembers: (groupId: string, member_ids: string[]) => {
    return http.post<{ message: string; result: any }>(`/groups/${groupId}/members`, { member_ids })
  }
}
