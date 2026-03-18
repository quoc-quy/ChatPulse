import http from '@/utils/http'

export const groupApi = {
  addMembers: (groupId: string, member_ids: string[]) => {
    return http.post<{ message: string; result: any }>(`/groups/${groupId}/members`, { member_ids })
  },
  kickMember: (groupId: string, memberId: string) => {
    return http.delete<{ message: string; result: any }>(`/groups/${groupId}/members/${memberId}`)
  },
  // Tự rời nhóm
  leaveGroup: (groupId: string) => {
    return http.delete<{ message: string; result: any }>(`/groups/${groupId}/members/me`)
  },
  // Chuyển quyền Admin
  promoteAdmin: (groupId: string, memberId: string) => {
    return http.patch<{ message: string; result: any }>(`/groups/${groupId}/members/${memberId}/admin`)
  },
  // Đổi tên nhóm
  renameGroup: (groupId: string, name: string) => {
    return http.patch<{ message: string; result: any }>(`/groups/${groupId}/name`, { name })
  }
}
