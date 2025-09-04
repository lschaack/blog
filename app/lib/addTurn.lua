local sessionKey = KEYS[1]
local turnData = ARGV[1]

if redis.call("EXISTS", sessionKey) == 0 then
  return redis.error_reply("NOT_FOUND Session does not exist")
end

local time = redis.call("TIME")
local seconds = tonumber(time[1])
local microseconds = tonumber(time[2])
local milliseconds = math.floor((seconds * 1000000 + microseconds) / 1000)

redis.call("JSON.ARRAPPEND", sessionKey, ".turns", turnData)
redis.call("JSON.SET", sessionKey, ".timestamp", cjson.encode(milliseconds))
redis.call("EXPIRE", sessionKey, 60 * 60)

return redis.call("JSON.GET", sessionKey, ".")
