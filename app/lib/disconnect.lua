local sessionKey = KEYS[1]
local name = ARGV[1]
local playerPath = ".players." .. name

if redis.call("EXISTS", sessionKey) == 0 then
  return redis.error_reply("NOT_FOUND Session does not exist")
elseif redis.call("JSON.TYPE", sessionKey, playerPath) == false then
  return redis.error_reply("CONFLICT Player " .. name .. " not in game")
end

redis.call("JSON.DEL", sessionKey, playerPath)

-- Delete game if last player leaves
if redis.call("JSON.OBJLEN", sessionKey, ".players") == 0 then
  redis.call("DEL", sessionKey)

  return nil
else
  local time = redis.call("TIME")
  local seconds = tonumber(time[1])
  local microseconds = tonumber(time[2])
  local milliseconds = math.floor((seconds * 1000000 + microseconds) / 1000)
  redis.call("JSON.SET", sessionKey, ".timestamp", milliseconds)

  return redis.call("JSON.GET", sessionKey, ".")
end
