local sessionKey = KEYS[1]
local playersKey = KEYS[2]
local playerName = ARGV[1]
local playerData = ARGV[2]
local playerToken = ARGV[3]

local playerPath = ".players." .. playerName

if redis.call("EXISTS", sessionKey) == 0 then
  return redis.error_reply("NOT_FOUND Session does not exist")
elseif redis.call("HGET", playersKey, playerName) ~= false then
  return redis.error_reply("CONFLICT Player already in game")
end

local gameType = cjson.decode(redis.call("JSON.GET", sessionKey, ".type"))
local nPlayers = redis.call("HLEN", playersKey)
if gameType == "singleplayer" and nPlayers >= 2 or nPlayers >= 8 then
  return redis.error_reply("FORBIDDEN Game is full")
end

local time = redis.call("TIME")
local seconds = tonumber(time[1])
local microseconds = tonumber(time[2])
local milliseconds = math.floor((seconds * 1000000 + microseconds) / 1000)

redis.call(
  "JSON.MSET",
  sessionKey,
  playerPath,
  playerData,
  sessionKey,
  ".timestamp",
  cjson.encode(milliseconds)
)

redis.call("HSET", playersKey, playerName, playerToken)

redis.call("EXPIRE", sessionKey, 60 * 60)
redis.call("EXPIRE", playersKey, 60 * 60)

return redis.call("JSON.GET", sessionKey, ".")
