local sessionKey = KEYS[1]
local connectionKey = KEYS[2]
local playerName = ARGV[1]
local playerToken = ARGV[2]

local playerPath = ".players." .. playerName

if redis.call("EXISTS", sessionKey) == 0 then
  return redis.error_reply("NOT_FOUND Session does not exist")
elseif redis.call("JSON.TYPE", sessionKey, playerPath) == false then
  return redis.error_reply("CONFLICT Player " .. playerName .. " not in game")
elseif redis.call("HGET", connectionKey, playerName) ~= playerToken then
  return redis.error_reply("FORBIDDEN Incorrect player token")
end

redis.call("JSON.DEL", sessionKey, playerPath)

-- Delete game after short grace period if last player leaves
if redis.call("JSON.OBJLEN", sessionKey, ".players") == 0 then
  redis.call("EXPIRE", sessionKey, 60 * 10)
  redis.call("EXPIRE", connectionKey, 60 * 10)

  return nil
else
  local time = redis.call("TIME")
  local seconds = tonumber(time[1])
  local microseconds = tonumber(time[2])
  local milliseconds = math.floor((seconds * 1000000 + microseconds) / 1000)
  redis.call("JSON.SET", sessionKey, ".timestamp", milliseconds)

  return redis.call("JSON.GET", sessionKey, ".")
end
