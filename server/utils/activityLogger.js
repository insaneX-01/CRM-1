import Activity from "../models/activityModel.js";

export const logActivity = async ({ type, entityType, entityId, message, user, metadata = {} }) => {
  await Activity.create({
    type,
    entityType,
    entityId,
    message,
    userId: user,
    metadata,
  });
};
