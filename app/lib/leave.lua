local sessionKey = KEYS[1]
local playersKey = KEYS[2]
local playerName = ARGV[1]
local playerToken = ARGV[2]

local playerPath = ".players." .. playerName
local foundPlayerToken = redis.call("HGET", playersKey, playerName)

if redis.call("EXISTS", sessionKey) == 0 then
  return redis.error_reply("NOT_FOUND Session does not exist")
elseif foundPlayerToken == false then
  return redis.error_reply("NOT_FOUND Player not in game")
elseif foundPlayerToken ~= playerToken then
  return redis.error_reply("FORBIDDEN Incorrect or missing token")
end

local time = redis.call("TIME")
local seconds = tonumber(time[1])
local microseconds = tonumber(time[2])
local milliseconds = math.floor((seconds * 1000000 + microseconds) / 1000)

redis.call("HDEL", playersKey, playerName)
redis.call("JSON.DEL", sessionKey, playerPath)
redis.call("JSON.SET", sessionKey, ".timestamp", cjson.encode(milliseconds))

return redis.call("JSON.GET", sessionKey, ".")
