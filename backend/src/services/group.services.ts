import { ObjectId } from 'mongodb'
import databaseService from './database.services'

class GroupService {
    // Logic thêm thành viên vào mảng members
    async addMembers(conversation_id: string, member_ids: string[]) {
        const objectIds = member_ids.map((id) => new ObjectId(id))

        return await databaseService.conversations.updateOne(
            { _id: new ObjectId(conversation_id) },
            {
                $addToSet: {
                    participants: { $each: objectIds }
                }
            }
        )
    }

}

export const groupService = new GroupService()