local sessionKey = KEYS[1]

if redis.call("EXISTS", sessionKey) == 0 then
  return redis.error_reply("NOT_FOUND Session does not exist")
elseif cjson.decode(redis.call("JSON.GET", sessionKey, ".currentPlayer")) ~= "AI" then
  return redis.error_reply("CONFLICT AI isn't current player")
end

local eventLogRes = redis.pcall("JSON.GET", sessionKey, ".eventLog")

if eventLogRes.err then
  return redis.error_reply("ERR Failed to process event logs for validation")
else
  local eventLog = cjson.decode(eventLogRes)

  -- look for last turn ended event to avoid concurrent AI turns
  for i = #eventLog, 1, -1 do
    local log = eventLog[i]

    if log.event == "turn_ended" then
      break
    elseif log.event == "ai_turn_started" then
      return redis.error_reply("CONFLICT AI turn already in progress")
    end
  end
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
    event = "ai_turn_started",
    timestamp = milliseconds,
  })
)

redis.call("EXPIRE", sessionKey, 60 * 60 * 24)

return redis.call("JSON.GET", sessionKey, ".")
