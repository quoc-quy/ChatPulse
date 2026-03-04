// backend/src/services/group.services.ts
import { ObjectId } from 'mongodb'
import databaseService from './database.services'

class GroupService {
  async addMembers(conversation_id: string, member_ids: string[]) {
    const objectIds = member_ids.map((id) => new ObjectId(id))

    const newMembers = objectIds.map((id) => ({
      userId: id,
      role: 'member' as 'member'
    }))

    return await databaseService.conversations.updateOne(
      { _id: new ObjectId(conversation_id) },
      {
        $addToSet: {
          participants: { $each: objectIds }
        },
        $push: {
          members: { $each: newMembers }
        }
      }
    )
  }
}

export const groupService = new GroupService()
