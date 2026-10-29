// Pure guard for replaying a locally queued record write.
// A queued edit may be replayed only when the server still has the exact
// version that was present when the edit was made. null/null represents
// a queued insert where the record is still absent on the server.
export function canReplayQueuedWrite(currentServerTs, queuedBaseTs) {
  return (currentServerTs || null) === (queuedBaseTs || null);
}
