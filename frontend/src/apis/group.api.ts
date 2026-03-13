import http from '@/utils/http'

export const groupApi = {
  // Gửi một mảng userIds để thêm vào nhóm
  addMembers: (groupId: string, userIds: string[]) => {
    return http.post<{ message: string; result: any }>(`/groups/${groupId}/members`, { userIds })
  }
}
