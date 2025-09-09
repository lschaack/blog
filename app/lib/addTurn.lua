local sessionKey = KEYS[1]
local playersKey = KEYS[2]
local turnData = ARGV[1]
local playerName = ARGV[2]
local playerToken = ARGV[3]

if redis.call("EXISTS", sessionKey) == 0 then
  return redis.error_reply("NOT_FOUND Session does not exist")
elseif redis.call("HGET", playersKey, playerName) ~= playerToken then
  return redis.error_reply("FORBIDDEN Incorrect player token")
end

local time = redis.call("TIME")
local seconds = tonumber(time[1])
local microseconds = tonumber(time[2])
local milliseconds = math.floor((seconds * 1000000 + microseconds) / 1000)

redis.call("JSON.ARRAPPEND", sessionKey, ".turns", turnData)
redis.call("JSON.SET", sessionKey, ".timestamp", cjson.encode(milliseconds))

redis.call("EXPIRE", sessionKey, 60 * 60)
redis.call("EXPIRE", playersKey, 60 * 60)

return redis.call("JSON.GET", sessionKey, ".")
