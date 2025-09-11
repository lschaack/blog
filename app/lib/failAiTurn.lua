local sessionKey = KEYS[1]

if redis.call("EXISTS", sessionKey) == 0 then
  return redis.error_reply("NOT_FOUND Session does not exist")
elseif redis.call("JSON.GET", sessionKey, ".currentPlayer") ~= "AI" then
  return redis.error_reply("CONFLICT AI isn't current player")
end

local lastEvent = redis.pcall("JSON.GET", sessionKey, ".eventLog[-1].event").ok

if lastEvent == "ai_turn_started" then
  return redis.error_reply("CONFLICT AI turn not in progress")
end

local time = redis.call("TIME")
local seconds = tonumber(time[1])
local microseconds = tonumber(time[2])
local milliseconds = math.floor((seconds * 1000000 + microseconds) / 1000)

redis.call(
  "JSON.ARRAPPEND",
  sessionKey,
  ".eventLog",
  cjson.encode({
    event = "ai_turn_failed",
    timestamp = milliseconds,
  })
)

redis.call("EXPIRE", sessionKey, 60 * 60)

return redis.call("JSON.GET", sessionKey, ".")
