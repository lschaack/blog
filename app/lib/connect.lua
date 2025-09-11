local sessionKey = KEYS[1]
local playersKey = KEYS[2]
local playerOrderKey = KEYS[3]
local connectionsKey = KEYS[4]
local connectionToken = ARGV[1]
local playerName = ARGV[2]
local playerToken = ARGV[3]

local playerPath = ".players." .. playerName
local foundPlayerToken = redis.call("HGET", playersKey, playerName)

if redis.call("EXISTS", sessionKey) == 0 then
  return redis.error_reply("NOT_FOUND Session does not exist")
elseif foundPlayerToken == false then
  return redis.error_reply("NOT_FOUND Player not in game")
elseif foundPlayerToken ~= playerToken then
  return redis.error_reply("FORBIDDEN Incorrect or missing token")
elseif redis.call("HGET", connectionsKey, playerPath) ~= false then
  return redis.error_reply("CONFLICT Player already connected")
end

local time = redis.call("TIME")
local seconds = tonumber(time[1])
local microseconds = tonumber(time[2])
local milliseconds = math.floor((seconds * 1000000 + microseconds) / 1000)

redis.call("HSET", connectionsKey, playerName, connectionToken)
redis.call("JSON.SET", sessionKey, playerPath .. ".connected", cjson.encode(true))

redis.call(
  "JSON.ARRAPPEND",
  sessionKey,
  ".eventLog",
  cjson.encode({
    event = "player_connected",
    timestamp = milliseconds,
    data = {
      playerName = playerName,
    },
  })
)

redis.call("EXPIRE", sessionKey, 60 * 60)
redis.call("EXPIRE", playersKey, 60 * 60)
redis.call("EXPIRE", playerOrderKey, 60 * 60)
redis.call("EXPIRE", connectionsKey, 60 * 60)

return redis.call("JSON.GET", sessionKey, ".")
