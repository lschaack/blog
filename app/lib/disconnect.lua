local sessionKey = KEYS[1]
local connectionsKey = KEYS[2]
local playerName = ARGV[2]
local connectionToken = ARGV[1]

local playerPath = ".players." .. playerName
local foundConnectionToken = redis.call("HGET", connectionsKey, playerName)

if redis.call("EXISTS", sessionKey) == 0 then
  return redis.error_reply("NOT_FOUND Session does not exist")
elseif foundConnectionToken == false then
  return redis.error_reply("NOT_FOUND Player not connected")
elseif foundConnectionToken ~= connectionToken then
  return redis.error_reply("FORBIDDEN Incorrect or missing token")
end

redis.call("HDEL", connectionsKey, playerName)

-- Delete game after short grace period if last player leaves
if redis.call("HLEN", connectionsKey) == 0 then
  redis.call("EXPIRE", sessionKey, 60 * 10)
  redis.call("EXPIRE", connectionsKey, 60 * 10)
end

local time = redis.call("TIME")
local seconds = tonumber(time[1])
local microseconds = tonumber(time[2])
local milliseconds = math.floor((seconds * 1000000 + microseconds) / 1000)

redis.call(
  "JSON.MSET",
  sessionKey,
  playerPath .. ".connected",
  cjson.encode(false),
  sessionKey,
  ".timestamp",
  milliseconds
)

return redis.call("JSON.GET", sessionKey, ".")
